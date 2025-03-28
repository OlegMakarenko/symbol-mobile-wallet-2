import React, { useState } from 'react';
import { Button, FormItem, Screen, StyledText, TextBox } from '@/app/components';
import { $t } from '@/app/localization';
import { Router } from '@/app/Router';
import { handleError, validateAccountName, validateKey, validateRequired } from '@/app/utils';
import { useDataManager, useProp, useValidation } from '@/app/hooks';
import { observer } from 'mobx-react-lite';
import { WalletAccountType } from '@/app/constants';
import WalletController from '@/app/lib/controller/MobileWalletController';

export const AddExternalAccount = observer(function AddExternalAccount(props) {
    const { networkIdentifier } = WalletController;
    const { route } = props;
    const [accountName, setAccountName] = useState('');
    const [privateKey, setPrivateKey] = useProp(route.params?.privateKey, '');
    const nameErrorMessage = useValidation(accountName, [validateRequired(), validateAccountName()], $t);
    const privateKeyErrorMessage = useValidation(privateKey, [validateRequired(), validateKey()], $t);

    const [addAccount, isAddAccountLoading] = useDataManager(
        async () => {
            const name = accountName;
            await WalletController.addAccount({
                accountType: WalletAccountType.EXTERNAL,
                privateKey,
                name,
                networkIdentifier,
            });
            Router.goToHome();
        },
        null,
        handleError
    );

    const isLoading = isAddAccountLoading;
    const isButtonDisabled = !!nameErrorMessage || !!privateKeyErrorMessage;

    return (
        <Screen
            isLoading={isLoading}
            bottomComponent={
                <FormItem>
                    <Button title={$t('button_addAccount')} isDisabled={isButtonDisabled} onPress={addAccount} />
                </FormItem>
            }
        >
            <FormItem>
                <StyledText type="title">{$t('s_addAccount_name_title')}</StyledText>
                <TextBox
                    title={$t('s_addAccount_name_input')}
                    errorMessage={nameErrorMessage}
                    value={accountName}
                    onChange={setAccountName}
                />
            </FormItem>
            <FormItem>
                <StyledText type="title">{$t('s_addAccount_privateKey_title')}</StyledText>
                <StyledText type="body">{$t('s_addAccount_privateKey_description')}</StyledText>
            </FormItem>
            <FormItem>
                <TextBox
                    title={$t('s_addAccount_privateKey_input')}
                    errorMessage={privateKeyErrorMessage}
                    value={privateKey}
                    onChange={setPrivateKey}
                />
            </FormItem>
        </Screen>
    );
});
