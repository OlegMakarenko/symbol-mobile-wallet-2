import React, { useEffect, useState } from 'react';
import { deleteUserPinCode, hasUserSetPinCode } from '@haskkor/react-native-pincode';
import { Checkbox, FormItem, MnemonicView, Screen, StyledText } from '@/app/components';
import { handleError } from '@/app/utils';
import { useDataManager, usePasscode } from '@/app/hooks';
import { $t } from '@/app/localization';
import { Router } from '@/app/Router';
import WalletController from '@/app/lib/controller/MobileWalletController';

export function SettingsSecurity() {
    const [isPasscodeEnabled, setIsPasscodeEnabled] = useState(false);
    const [mnemonic, setMnemonic] = useState('');
    const [isMnemonicShown, setIsMnemonicShown] = useState(false);
    const [loadData, isDataLoading] = useDataManager(
        async () => {
            const isPasscodeEnabled = await hasUserSetPinCode();
            const mnemonic = await WalletController.getMnemonic();

            setIsPasscodeEnabled(isPasscodeEnabled);
            setMnemonic(mnemonic);
        },
        null,
        handleError
    );
    const [togglePasscodeEnabled, isSetPasscodeLoading] = useDataManager(
        async () => {
            if (isPasscodeEnabled) {
                await deleteUserPinCode();
            }

            loadData();
            Router.goBack();
        },
        null,
        handleError
    );

    const passcodeAction = isPasscodeEnabled ? 'enter' : 'choose';
    const confirmEnablePasscode = usePasscode(passcodeAction, togglePasscodeEnabled);

    const showMnemonic = () => {
        setIsMnemonicShown(true);
    };
    const confirmShowMnemonic = usePasscode('enter', showMnemonic);

    useEffect(() => {
        loadData()
    }, []);

    const isLoading = isDataLoading || isSetPasscodeLoading;

    return (
        <Screen isLoading={isLoading}>
            <FormItem>
                <StyledText type="title">{$t('settings_security_pin_title')}</StyledText>
                <StyledText type="body">{$t('settings_security_pin_body')}</StyledText>
            </FormItem>
            <FormItem>
                <Checkbox title={$t('settings_security_pin_toggle')} value={isPasscodeEnabled} onChange={confirmEnablePasscode} />
            </FormItem>
            <FormItem>
                <StyledText type="title">{$t('settings_security_mnemonic_title')}</StyledText>
                <StyledText type="body">{$t('settings_security_mnemonic_body')}</StyledText>
            </FormItem>
            <FormItem>
                <MnemonicView mnemonic={mnemonic} isShown={isMnemonicShown} onShowPress={confirmShowMnemonic} />
            </FormItem>
        </Screen>
    );
}
