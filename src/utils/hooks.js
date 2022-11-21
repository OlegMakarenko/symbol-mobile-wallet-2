import {useNavigation} from '@react-navigation/native';
import { DeviceEventEmitter } from 'react-native';

export const usePasscode = (type, onSuccess, onCancel) => {
    const navigation = useNavigation();
    const successState = '.s';
    const cancelState = '.c';
    
    return () => {
        const uniqueNumber = Math.floor(Date.now() / 1000);
        const eventId = `event.passcode.${uniqueNumber}`;
        DeviceEventEmitter.addListener(eventId + successState, onSuccess);
        DeviceEventEmitter.addListener(eventId + cancelState, onCancel);

        navigation.navigate('Passcode', {
            type,
            successEvent: eventId + successState,
            cancelEvent: eventId + cancelState
        })
    };
}

export const useValidation = (value, validators, formatResult) => {
    for (const validator of validators) {
        const validationResult = validator(value);
        if (validationResult && formatResult) {
            return formatResult(validationResult);
        }

        if (validationResult) {
            return validationResult;
        }
    }
};
