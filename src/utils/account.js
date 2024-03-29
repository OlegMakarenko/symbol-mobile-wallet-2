import { networkIdentifierToNetworkType } from './network';
import { Account, Address, Convert, RawAddress } from 'symbol-sdk';

export const createKeyPair = (networkIdentifier) => {
    const networkType = networkIdentifierToNetworkType(networkIdentifier);
    const account = Account.generateNewAccount(networkType);

    return {
        privateKey: account.privateKey,
        publicKey: account.publicKey,
    };
};
export const addressFromPrivateKey = (privateKey, networkIdentifier) => {
    const networkType = networkIdentifierToNetworkType(networkIdentifier);

    return Account.createFromPrivateKey(privateKey, networkType).address.plain();
};

export const addressFromPublicKey = (publicKey, networkIdentifier) => {
    const networkType = networkIdentifierToNetworkType(networkIdentifier);

    return Address.createFromPublicKey(publicKey, networkType).plain();
};

export const publicAccountFromPrivateKey = (privateKey, networkIdentifier) => {
    const networkType = networkIdentifierToNetworkType(networkIdentifier);
    const publicAccount = Account.createFromPrivateKey(privateKey, networkType);

    return {
        address: publicAccount.address.plain(),
        publicKey: publicAccount.publicKey,
    };
};

export const createWalletAccount = (privateKey, networkIdentifier, name, accountType, index) => {
    return {
        address: addressFromPrivateKey(privateKey, networkIdentifier),
        name,
        privateKey,
        networkIdentifier,
        accountType,
        index: index === null || index === undefined ? null : index,
    };
};

export const isPublicOrPrivateKey = (stringToTest) => {
    return typeof stringToTest === 'string' && stringToTest.length === 64;
};

export const isSymbolAddress = (address) => {
    if (typeof address !== 'string') {
        return false;
    }

    const addressTrimAndUpperCase = address.trim().toUpperCase().replace(/-/g, '');

    if (addressTrimAndUpperCase.length !== 39) {
        return false;
    }

    if (addressTrimAndUpperCase.charAt(0) !== 'T' && addressTrimAndUpperCase.charAt(0) !== 'N') {
        return false;
    }

    return true;
};

export const addressFromRaw = (rawAddress) => {
    return RawAddress.addressToString(Convert.hexToUint8(rawAddress));
};

export const namespaceIdFromRaw = (rawNamespaceId) => {
    const relevantPart = rawNamespaceId.substr(2, 16);
    const encodedNamespaceId = Convert.uint8ToHex(Convert.hexToUint8Reverse(relevantPart));

    return encodedNamespaceId;
};
