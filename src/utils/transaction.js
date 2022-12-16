import { TransactionType } from 'symbol-sdk';

export const isAggregateTransaction = transaction => {
    return transaction.type === TransactionType.AGGREGATE_BONDED
        || transaction.type === TransactionType.AGGREGATE_COMPLETE;
}

export const getGroupFromtransactionDTO = transaction => {
    if (transaction.isConfirmed())
        return 'confirmed';
    if (transaction.isUnconfirmed())
        return 'unconfirmed';
    return 'partial';
};

export const formatDeadline = (date) => `${date.dayOfMonth()}/${date.monthValue()}/${date.year()}`;

export const getUnresolvedIdsFromTransactionDTOs = transactions => {
    const mosaicIds = [];
    const namespaceIds = [];
    const addresses = [];

    const transactionsUnresolvedFieldsMap = {
        [TransactionType.TRANSFER]: {
            address: ['recipientAddress'],
            mosaicArray: ['mosaics'],
        },
        [TransactionType.ADDRESS_ALIAS]: {
            namespace: ['namespaceId'],
        },
        [TransactionType.MOSAIC_ALIAS]: {
            namespace: ['namespaceId'],
        },
        [TransactionType.MOSAIC_SUPPLY_REVOCATION]: {
            address: ['sourceAddress'],
            mosaic: ['mosaic'],
        },
        [TransactionType.MULTISIG_ACCOUNT_MODIFICATION]: {
            addressArray: ['addressAdditions', 'addressDeletions'],
        },
        [TransactionType.HASH_LOCK]: {
            mosaic: ['mosaic'],
        },
        [TransactionType.SECRET_LOCK]: {
            address: ['recipientAddress'],
            mosaic: ['mosaic'],
        },
        [TransactionType.SECRET_PROOF]: {
            address: ['recipientAddress'],
        },
        [TransactionType.ACCOUNT_ADDRESS_RESTRICTION]: {
            addressArray: ['restrictionAdditions', 'restrictionDeletions'],
        },
        [TransactionType.MOSAIC_ADDRESS_RESTRICTION]: {
            address: ['targetAddress'],
            mosaic: ['mosaicId'],
        },
        [TransactionType.MOSAIC_GLOBAL_RESTRICTION]: {
            mosaic: ['referenceMosaicId'],
        },
        [TransactionType.ACCOUNT_METADATA]: {
            address: ['targetAddress'],
        },
        [TransactionType.MOSAIC_METADATA]: {
            address: ['targetAddress'],
            mosaic: ['targetMosaicId'],
        },
        [TransactionType.NAMESPACE_METADATA]: {
            address: ['targetAddress'],
            namespace: ['targetNamespaceId']
        },
    };

    transactions.forEach(transaction => {
        const transactionFieldsToResolve = transactionsUnresolvedFieldsMap[transaction.type];

        if (isAggregateTransaction(transaction)) {
            const unresolved = getUnresolvedIdsFromTransactionDTOs(transaction.innerTransactions);
            mosaicIds.push(...unresolved.mosaicIds);
            namespaceIds.push(...unresolved.namespaceIds);
            addresses.push(...unresolved.addresses);
        }

        if (!transactionFieldsToResolve) {
            return;
        }

        Object.keys(transactionFieldsToResolve).forEach(mode => {
            const fields = transactionFieldsToResolve[mode];

            fields.forEach(field => {
                const value = transaction[field];
                
                if (mode === 'address' && value.isNamespaceId()) {
                    addresses.push(value.toHex());
                    console.log(value)
                }
                else if (mode === 'addressArray' && Array.isArray(value)) {
                    value
                        .filter(address => address.isNamespaceId())
                        .forEach(address => addresses.push(address.toHex()));
                }
                else if (mode === 'mosaic') {
                    mosaicIds.push(value.id.toHex());
                }
                else if (mode === 'mosaicArray' && Array.isArray(value)) {
                    value.forEach(mosaic => mosaicIds.push(mosaic.id.toHex()));
                }
                else if (mode === 'namespace') {
                    namespaceIds.push(value.toHex());
                }
                else if (mode === 'namespace') {
                    namespaceIds.push(value.toHex());
                }
            });
        });
    });

    console.log({
        mosaicIds: [...new Set(mosaicIds.flat())],
        namespaceIds: [...new Set(namespaceIds.flat())],
        addresses: [...new Set(addresses.flat())],
    })
    
    return {
        mosaicIds: [...new Set(mosaicIds.flat())],
        namespaceIds: [...new Set(namespaceIds.flat())],
        addresses: [...new Set(addresses.flat())],
    };
};

export const isOutgoingTransaction = (transaction, currentAccount) => 
    transaction.signerAddress === currentAccount.address;

export const isIncomingTransaction = (transaction, currentAccount) => 
    transaction.recipientAddress === currentAccount.address;
