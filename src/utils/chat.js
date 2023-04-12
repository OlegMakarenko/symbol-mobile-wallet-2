import _ from "lodash";
import { AccountService, TransactionService } from "src/services";
import { TransactionType } from "symbol-sdk";
import { transactionFromDTO } from "./dto";
import { decryptMessage, isIncomingTransaction, isOutgoingTransaction } from "./transaction";

const fetchPersonalMessages = async (networkProperties, {
    currentAccount, 
    recipientAddress,
    pageSize, 
    pageNumber, 
    group, 
}) => {
    const filterTheirs = { from: recipientAddress, type: [TransactionType.TRANSFER] };
    const filterOurs = { to: recipientAddress, type: [TransactionType.TRANSFER] };

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
    const filter = { type: [TransactionType.TRANSFER] };

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
        .filter((transaction) => !!transaction.message);
    const decryptedPage = await Promise.all(page.map(async (transaction) => {
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

        if (text.startsWith('@@1@')) {
            timestamp = text.substring(
                text.indexOf('@t') + 2, 
                text.lastIndexOf('@m')
            );
            text = text.substring(
                text.indexOf('@m') + 2, 
                text.length
            );
        }

        return {...transaction, message: { ...transaction.message, text, timestamp }};
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
