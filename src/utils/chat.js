import _ from "lodash";
import { AccountService, TransactionService } from "src/services";
import { TransactionType } from "symbol-sdk";
import { transactionFromDTO } from "./dto";
import { decryptMessage, isIncomingTransaction, isOutgoingTransaction } from "./transaction";

const jsonCache = {};

const fetchPersonalMessages = async (networkProperties, {
    currentAccount, 
    recipientAddress,
    pageSize, 
    pageNumber, 
    group, 
}) => {
    const filterTheirs = { from: recipientAddress, type: [TransactionType.TRANSFER, TransactionType.AGGREGATE_COMPLETE] };
    const filterOurs = { to: recipientAddress, type: [TransactionType.TRANSFER, TransactionType.AGGREGATE_COMPLETE] };

    const [theirsDTO, oursDTO] = await Promise.all([
        TransactionService.fetchAccountTransactions(currentAccount, networkProperties, {
            group, 
            filter: filterTheirs,
            pageNumber,
            pageSize
        }),
        TransactionService.fetchAccountTransactions(currentAccount, networkProperties, {
            group,
            filter: filterOurs,
            pageNumber,
            pageSize
        }),
    ]);

    return [...theirsDTO, ...oursDTO];
};

const fetchGroupMessages = async (networkProperties, {
    recipientAddress, 
    pageSize, 
    pageNumber, 
    group, 
}) => {
    const filter = { type: [TransactionType.TRANSFER, TransactionType.AGGREGATE_COMPLETE] };

    return TransactionService.fetchAccountTransactions({address: recipientAddress}, networkProperties, {
        group, 
        filter,
        pageNumber,
        pageSize
    });
};


export const fetchChatMessages = async (networkProperties, {
    currentAccount, 
    recipientAddress,
    recipientPrivateKey,
    publicKeyMap, 
    pageSize, 
    pageNumber, 
    group, 
    cache
}) => {
    let dto;

    if (recipientPrivateKey) {
        dto = await fetchGroupMessages(networkProperties, {
            currentAccount, 
            recipientAddress,
            pageSize, 
            pageNumber, 
            group
        });
    }
    else {
        dto = await fetchPersonalMessages(networkProperties, {
            currentAccount, 
            recipientAddress,
            pageSize, 
            pageNumber, 
            group
        });
    }

    const transactionOptions = {
        networkProperties,
        currentAccount,
        mosaicInfos: {},
        namespaceNames: {},
        resolvedAddresses: {},
    }
    const page = dto
        .map((transactionDTO) => transactionFromDTO(transactionDTO, transactionOptions))
        .reverse()
        .filter((transaction) => !!transaction.message || (
            transaction.innerTransactions
            && transaction.innerTransactions.every(tx => !!tx.message)
        ));
    const decryptedPage = await Promise.all(page.map(async (transaction) => {
        if (transaction.type === TransactionType.AGGREGATE_COMPLETE) {
            transaction.message = {
                text: transaction.innerTransactions.reduce((a, b) => a + b.message.text, '')
            };
        };
        if (!transaction.message) {
            return transaction;
        }
        let text = '';
        const messageKey = transaction.message.text || transaction.message.encryptedText;
        
        if (!cache[messageKey] && !transaction.message.isEncrypted) {
            cache[messageKey] = transaction.message.text;
        }
        else if (!cache[messageKey] && isOutgoingTransaction(transaction, currentAccount)) {
            console.log('decryptMessage.out')
            cache[messageKey] = decryptMessage(
                transaction.message.encryptedText, 
                currentAccount.privateKey, 
                publicKeyMap[recipientAddress]
            );
        }
        else if (!cache[messageKey] && isIncomingTransaction(transaction, currentAccount)) {
            console.log('decryptMessage.in')
            cache[messageKey] = decryptMessage(
                transaction.message.encryptedText, 
                currentAccount.privateKey, 
                transaction.signerPublicKey
            );
        }
        else if (!cache[messageKey] && !publicKeyMap[transaction.signerAddress]) {
            console.log('decryptMessage.some', transaction.signerAddress)
            try {
                publicKeyMap[transaction.signerAddress] = (await AccountService.fetchAccountInfo(
                    networkProperties, 
                    transaction.signerAddress
                )).publicKey;
                console.log('decryptMessage.some => ', transaction.message.encryptedText, recipientPrivateKey, publicKeyMap[transaction.signerAddress])
                cache[messageKey] = decryptMessage(
                    transaction.message.encryptedText, 
                    recipientPrivateKey, 
                    publicKeyMap[transaction.signerAddress]
                );
            }
            catch(e) { console.error(e)}
        }
        else if (!cache[messageKey]) {
            cache[messageKey] = decryptMessage(
                transaction.message.encryptedText, 
                recipientPrivateKey, 
                publicKeyMap[transaction.signerAddress]
            );
        }

        text = cache[messageKey] || 'Unknown message';
        let timestamp = 0;
        const otherMetadata = {};

        try {
            const parsedMessage = jsonCache[text] || JSON.parse(text);
            jsonCache[text] = parsedMessage;
            if (parsedMessage.v === 1) {
                timestamp = parsedMessage.t;
                text = parsedMessage.m;
                otherMetadata.imageBase64 = parsedMessage.id;
            }
        }
        catch {}

        return {...transaction, message: { ...transaction.message, text, timestamp, ...otherMetadata }};
    }));

    return decryptedPage;
}

export const mergeMessageHistory = (messages, page) => {
    return _
        .uniqBy([...messages, ...page], 'hash')
        .sort((a, b) => {
            if (a.message.timestamp && b.message.timestamp) {
                return b.message.timestamp - a.message.timestamp;
            }
            return b.height - a.height;
        });
}

export const chunkString = (str, length) => {
    return str.match(new RegExp('.{1,' + length + '}', 'g'));
}

export function chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size)
    const chunks = new Array(numChunks)
  
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size)
    }
  
    return chunks
  }
export const chunkStringBytes = (s, maxBytes) => {
    let buf = Buffer.from(s);

    if (buf.length < maxBytes) {
        return [s];
    }

    const result = [];
    while (buf.length) {
        let i = buf.lastIndexOf(32, maxBytes+1);
        // If no space found, try forward search
        if (i < 0) i = buf.indexOf(32, maxBytes);
        // If there's no space at all, take the whole string
        if (i < 0) i = buf.length;
        // This is a safe cut-off point; never half-way a multi-byte
        result.push(buf.slice(0, i).toString());
        buf = buf.slice(i+1); // Skip space (if any)
    }
    return result;
}

export const createImageMessageTransaction = ({image, currentAccount, recipientAddress, fee, timestamp}) => {
    const message = JSON.stringify({
        v: 1,
        t: timestamp,
        id: image.base64,
    });
    const chunks = chunkString(message, 1023);

    const innerTransactions = chunks.map(message => ({
        type: TransactionType.TRANSFER,
        signerAddress: currentAccount.address,
        recipientAddress,
        mosaics: [],
        messageText: message,
        messageEncrypted: false,
        fee: 0
    }));
    
    return {
        innerTransactions,
        fee
    }
}

export const createLongMessageTransaction = ({text, currentAccount, recipientAddress, fee, timestamp}) => {
    const message = JSON.stringify({
        v: 1,
        t: timestamp,
        m: text,
    })
    const chunks = chunkString(message, 500);

    const innerTransactions = chunks.map(message => ({
        type: TransactionType.TRANSFER,
        signerAddress: currentAccount.address,
        recipientAddress,
        mosaics: [],
        messageText: message,
        messageEncrypted: false,
        fee: 0
    }));
    
    return {
        innerTransactions,
        fee
    }
}

export const isSameDay = (timestamp1, timestamp2) => {
    const d1 = new Date(timestamp1);
    const d2 = new Date(timestamp2);

    return d1.getFullYear() === d2.getFullYear() 
        && d1.getMonth() === d2.getMonth() 
        && d1.getDate() === d2.getDate();
}
    
