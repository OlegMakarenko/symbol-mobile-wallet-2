import { MnemonicPassPhrase } from 'symbol-hd-wallets';
import { isSymbolAddress } from './account';

export const validateRequired = () => str => {
    if (str.length === 0) {
        return 'validation_error_field_required';
    }
}

export const validateAccountName = () => str => {
    if (str.length > 15) {
        return 'validation_error_contact_name_long';
    }
}

export const validateKey = () => str => {
    if (str.length !== 64) {
        return 'validation_error_key_length';
    }
}

export const validateMnemonic = () => str => {
    const mnemonicPassPhrase = new MnemonicPassPhrase(str.trim());
    const isValidMnemonic = mnemonicPassPhrase.isValid();

    if (!isValidMnemonic) {
        return 'validation_error_mnemonic_invalid';
    }
}

export const validateUnresolvedAddress = () => str => {
    if (str.length < 3) {
        return 'validation_error_address_short';
    }
}

export const validateAddress = () => str => {
    if (!isSymbolAddress(str)) {
        return 'validation_error_address_invalid';
    }
}

export const validateAmount = (availableBalance) => str => {
    if (parseFloat(str) > parseFloat(availableBalance)) {
        return 'validation_error_balance_not_enough';
    }
}

export const validateExisted = (existedValues) => str => {
    if (existedValues.some(value => value === str)) {
        return 'validation_error_already_exists';
    }
}
