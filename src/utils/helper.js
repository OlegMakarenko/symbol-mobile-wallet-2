import moment from 'moment';
// import Clipboard from '@react-native-community/clipboard';
// Remove after fix https://github.com/react-native-clipboard/clipboard/issues/71
import { Duration, Instant, LocalDateTime, ZoneId } from '@js-joda/core';
import { Clipboard, Platform, Vibration } from 'react-native';
import { showMessage as rnFlashMessage } from 'react-native-flash-message';
import { $t } from 'src/localization';
import { config } from 'src/config';
import { NetworkIdentifier } from 'src/constants';

export const showMessage = ({ message, type }) => rnFlashMessage({ message, type });

export const handleError = (error) => {
    const message = $t(error.message, { defaultValue: error.message });
    showMessage({ message, type: 'danger' });
    console.error(error);
};

export const copyToClipboard = (str) => {
    Clipboard.setString(str);
};

export const createNetworkMap = (callback) => {
    const networkIdentifiers = [...config.networkIdentifiers];
    const maps = networkIdentifiers.map((networkIdentifier) => [networkIdentifier, callback(networkIdentifier)]);

    return Object.fromEntries(maps);
};

export const trunc = (str, type, length = 5) => {
    const trunc = (text, cut, lengthFirst, lengthSecond) => {
        if (cut === 'start' && lengthFirst < text.length) {
            return '...' + text.substring(text.length - lengthFirst, text.length);
        }
        if (cut === 'middle' && lengthFirst + lengthSecond < text.length) {
            return text.substring(0, lengthFirst) + '...' + text.substring(text.length - lengthSecond, text.length);
        }
        if (cut === 'end' && lengthFirst < text.length) {
            return text.substring(0, lengthFirst) + '...';
        }

        return text;
    };

    if (typeof str !== 'string') {
        return '';
    }

    switch (type) {
        case 'address':
            return trunc(str, 'middle', 6, 3);
        case 'address-short':
            return trunc(str, 'start', 3);
        case 'address-long':
            return trunc(str, 'middle', 12, 12);
        case 'contact':
            return trunc(str, 'end', 18);
        case 'contact-short':
            return trunc(str, 'end', 12);
        case 'hash':
            return trunc(str, 'middle', 12, 12);
        case 'mosaicId':
            return trunc(str, 'middle', 6, 6);
        case 'namespaceName':
            return trunc(str, 'middle', 10, 10);
        default:
            return trunc(str, 'end', length);
    }
};

export const getCharPercentage = (char) => {
    const charset = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
    ];
    const index = charset.indexOf(char.toLowerCase());

    return index / (charset.length - 1);
};

export const vibrate = () => {
    return {
        short() {
            if (Platform.OS === 'android') {
                Vibration.vibrate(2);
            }
        },
    };
};

export const toFixedNumber = (num, digits) => {
    const power = Math.pow(10, digits);

    return Math.round(num * power) / power;
};

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @returns {object} {R: Number, G: Number, B: Number}
 */
export const hslToRgb = (h, s, l) => {
    let r, g, b;

    const hue2rgb = (_p, _q, _t) => {
        if (0 > _t) _t += 1;
        if (1 < _t) _t -= 1;
        if (_t < 1 / 6) return _p + (_q - _p) * (6 * _t);
        if (_t < 1 / 2) return _q;
        if (_t < 2 / 3) return _p + (_q - _p) * ((2 / 3 - _t) * 6);
        return _p;
    };

    if (0 === s) {
        r = g = b = l; // achromatic
    } else {
        const q = 0.5 > l ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        R: Math.round(r * 255),
        G: Math.round(g * 255),
        B: Math.round(b * 255),
    };
};

/**
 * Get RGB color from hash.
 * @param {string} hash - hash to be converted.
 * @param {boolean} isHex - default true
 * @returns {object} { R: Number, G: Number, B: Number }
 */
export const getColorFromHash = (hash) => {
    if (!hash) {
        return '#fff';
    }

    const spread = 100;
    const saturation = 0.9;
    const lightness = 0.8;
    const charset = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
    ];

    let totalValue = 0;

    for (const char of hash) totalValue += charset.indexOf(char.toLowerCase());

    const k = Math.trunc(totalValue / spread);
    const offsetValue = totalValue - spread * k;
    const hue = offsetValue / 100;

    const color = hslToRgb(hue, saturation, lightness);

    return `rgb(${color.R}, ${color.G}, ${color.B})`;
};

export const isAddressKnown = (address, accounts, addressBook) => {
    if (!address) {
        return false;
    }

    const walletAccount = accounts.find((account) => address === account.address);
    if (walletAccount) {
        return true;
    }

    const contact = addressBook.getContactByAddress(address);
    if (contact) {
        return true;
    }

    return false;
};

export const getAddressName = (address, currentAccount, accounts, addressBook) => {
    if (!address) {
        return '?';
    }

    if (address === currentAccount.address) {
        return currentAccount.name;
    }
    const walletAccount = accounts.find((account) => address === account.address);

    if (walletAccount) {
        return walletAccount.name;
    }

    const contact = addressBook.getContactByAddress(address);
    if (contact) {
        return contact.name;
    }

    return address;
};

export const timestampToLocalDate = (timestamp, epochAdjustment) =>
    LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp).plusMillis(Duration.ofSeconds(epochAdjustment).toMillis()), ZoneId.SYSTEM);

export const formatDate = (dateStr, translate, showTime = false, showSeconds = false) => {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const addZero = (num) => {
        return 0 <= num && 10 > num ? '0' + num : num + '';
    };

    const dateObj = new Date(dateStr);
    const seconds = addZero(dateObj.getSeconds());
    const minutes = addZero(dateObj.getMinutes());
    const hour = addZero(dateObj.getHours());
    const month = 'function' === typeof translate ? translate('month_' + months[dateObj.getMonth()]) : months[dateObj.getMonth()];
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();

    let formattedDate = `${month} ${day}, ${year}`;

    formattedDate += showTime ? ` ${hour}:${minutes}` : '';
    formattedDate += showTime && showSeconds ? `:${seconds}` : '';

    return formattedDate;
};

export const interleave = (arr, callback) => arr.flatMap((el, index) => [el, callback(el, index)]).slice(0, -1);

export const blockDurationToDaysLeft = (duration, blockGenerationTargetTime) => {
    const seconds = duration * blockGenerationTargetTime;
    return moment.utc().add(seconds, 's').fromNow();
};

export const getUserCurrencyAmountText = (amount, price, networkIdentifier) => {
    if (networkIdentifier !== NetworkIdentifier.MAIN_NET || !price) {
        return '';
    }

    return `~${(price.value * amount).toFixed(2)} ${price.currency}`;
};

export const promiseAllSettled = (promises) =>
    Promise.all(
        promises.map((p) =>
            p
                .then((value) => ({
                    status: 'fulfilled',
                    value,
                }))
                .catch((reason) => ({
                    status: 'rejected',
                    reason,
                }))
        )
    );
