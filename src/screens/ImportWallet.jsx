import React, { useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
    Button,
    ButtonClose,
    ButtonPlain,
    FormItem,
    MnemonicInput,
    QRScanner,
    Screen,
    StyledText,
    WalletCreationAnimation,
} from '@/app/components';
import { createOptInPrivateKeyFromMnemonic, handleError } from '@/app/utils';
import { useDataManager, usePasscode } from '@/app/hooks';
import { Router } from '@/app/Router';
import { $t } from '@/app/localization';
import { NetworkIdentifier, WalletAccountType } from '@/app/constants';
import WalletController from '@/app/lib/controller/MobileWalletController';
import { SymbolQR } from '@/app/lib/features/SymbolQR';

export const ImportWallet = () => {
    const [name] = useState($t('s_importWallet_defaultAccountName'));
    const [mnemonic, setMnemonic] = useState('');
    const [isMnemonicValid, setIsMnemonicValid] = useState(false);
    const [isQRScannerVisible, setIsQRScannerVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(1);
    const isButtonDisabled = !mnemonic.length || !isMnemonicValid;
    const steps = [
        $t('s_importWallet_loading_step1'),
        $t('s_importWallet_loading_step2'),
        $t('s_importWallet_loading_step3'),
        $t('s_importWallet_loading_step4'),
        $t('s_importWallet_loading_step5'),
    ];

    const handleMnemonicScan = (data) => setMnemonic(data.mnemonic);
    const toggleQRScanner = () => setIsQRScannerVisible(!isQRScannerVisible);
    const next = () => createPasscode();
    const [checkOptInAccounts] = useDataManager(
        async () => {
            const optInPrivateKey = createOptInPrivateKeyFromMnemonic(mnemonic);
            setLoadingStep(4);
            setTimeout(() => saveMnemonic(optInPrivateKey), 500);
        },
        null,
        handleError
    );
    const [saveMnemonic] = useDataManager(
        async (optInPrivateKey) => {
            await WalletController.saveMnemonicAndGenerateAccounts({
                mnemonic: mnemonic.trim(),
                name,
            });
            if (optInPrivateKey) {
                await WalletController.addAccount({
                    accountType: WalletAccountType.EXTERNAL,
                    privateKey: optInPrivateKey,
                    name: 'Opt-in Account',
                    networkIdentifier: NetworkIdentifier.MAIN_NET,
                });
            }
            setLoadingStep(5);
            setTimeout(completeLoading, 500);
        },
        null,
        handleError
    );
    const startLoading = () => {
        setIsLoading(true);
        setTimeout(() => setLoadingStep(2), 500);
        setTimeout(() => setLoadingStep(3), 1000);
        setTimeout(checkOptInAccounts, 1500);
    };
    const completeLoading = async () => {
        WalletController.notifyLoginCompleted();
    };
    const createPasscode = usePasscode('choose', startLoading);

    return (
        <Screen
            bottomComponent={
                !isLoading && (
                    <FormItem>
                        <Button title={$t('button_next')} isDisabled={isButtonDisabled} onPress={next} />
                    </FormItem>
                )
            }
        >
            {isLoading && <WalletCreationAnimation steps={steps} currentStep={loadingStep} />}
            <FormItem>
                <ButtonClose type="cancel" style={styles.buttonCancel} onPress={Router.goBack} />
            </FormItem>
            <FormItem>
                <Image source={require('@/app/assets/images/logo-symbol-full.png')} style={styles.logo} />
            </FormItem>
            <ScrollView>
                <FormItem>
                    <StyledText type="title">{$t('s_importWallet_title')}</StyledText>
                    <StyledText type="body">{$t('s_importWallet_text')}</StyledText>
                </FormItem>
                <FormItem>
                    <MnemonicInput value={mnemonic} onChange={setMnemonic} onValidityChange={setIsMnemonicValid} />
                </FormItem>
                <FormItem>
                    <ButtonPlain title={$t('button_scanQR')} onPress={toggleQRScanner} />
                    <QRScanner
                        type={SymbolQR.TYPE.Mnemonic}
                        isVisible={isQRScannerVisible}
                        onClose={toggleQRScanner}
                        onSuccess={handleMnemonicScan}
                    />
                </FormItem>
            </ScrollView>
        </Screen>
    );
};

const styles = StyleSheet.create({
    backgroundArt: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    buttonCancel: {
        alignSelf: 'flex-end',
    },
    logo: {
        width: '100%',
        height: 48,
        margin: 'auto',
        resizeMode: 'contain',
    },
});
