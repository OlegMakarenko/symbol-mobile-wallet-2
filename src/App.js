import React, { useEffect, useState } from 'react';
import { BackHandler, DeviceEventEmitter, SafeAreaView, StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { deleteUserPinCode, hasUserSetPinCode } from '@haskkor/react-native-pincode';
import SplashScreen from 'react-native-splash-screen';
import FlashMessage from 'react-native-flash-message';
import { ConnectionStatus } from '@/app/components';
import { Passcode } from '@/app/screens';
import { StorageMigration } from '@/app/lib/storage';
import { $t, initLocalization } from '@/app/localization';
import { Router, RouterView } from '@/app/Router';
import { colors, fonts, layout } from '@/app/styles';
import { ControllerEventName } from '@/app/constants';
import WalletController from '@/app/lib/controller/MobileWalletController';
import { showMessage } from '@/app/utils';

const unsafeAreaStyle = { ...layout.fill, backgroundColor: colors.bgStatusbar };
const safeAreaStyle = { ...layout.fill, backgroundColor: colors.bgGray };
const flashMessageStyle = { backgroundColor: colors.bgForm, borderBottomColor: colors.primary, borderBottomWidth: 2 };
const flashMessageTextStyle = { ...fonts.notification, color: colors.primary };

const App = () => {
    const [isPasscodeEnabled, setIsPasscodeEnabled] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isWalletStored, setIsWalletStored] = useState(false);
    const [isWalletLoaded, setIsWalletLoaded] = useState(false);
    const isPasscodeShown = isPasscodeEnabled && !isUnlocked;
    const isMainContainerShown = isWalletLoaded && !isPasscodeShown;
    const passcodeParams = {
        type: 'enter',
        successEvent: 'event.passcode.root.success',
        cancelEvent: 'event.passcode.root.cancel',
    };

    const unlock = () => {
        setIsUnlocked(true);
    };

    // Initialize the app. Migrate storage, initialize localization, passcode and load the wallet
    const init = async () => {
        setIsWalletStored(false);
        setIsWalletLoaded(false);
        await StorageMigration.migrate();
        await initLocalization();

        const isPasscodeEnabled = await hasUserSetPinCode();
        setIsPasscodeEnabled(isPasscodeEnabled);

        await load();
        SplashScreen.hide();
    };

    // Load the wallet and data from cache. Connect to network and fetch data
    const load = async () => {
        const isWalletStored = await WalletController.isWalletCreated();
        setIsWalletStored(isWalletStored);

        await WalletController.loadCache();
        setIsWalletLoaded(true);

        WalletController.runConnectionJob();
        WalletController.modules.market.fetchData();
    };

    const handleLogout = async () => {
        await deleteUserPinCode();
        handleLoginStateChange();
    };
    const handleLoginStateChange = () => {
        Router.goToHome();
        load();
    };
    const handleAccountChange = () => {
        WalletController.fetchAccountInfo();
    };
    const handleNewConfirmedTransaction = () => {
        showMessage({ message: $t('message_transactionConfirmed'), type: 'info' });
        WalletController.fetchAccountTransactions();
        WalletController.fetchAccountInfo();
    };

    useEffect(() => {
        // Initialize wallet and load data from cache
        init();

        // Listen for an event from the Passscode screen
        DeviceEventEmitter.addListener(passcodeParams.successEvent, unlock);
        DeviceEventEmitter.addListener(passcodeParams.cancel, BackHandler.exitApp);
        WalletController.on(ControllerEventName.LOGIN, handleLoginStateChange);
        WalletController.on(ControllerEventName.LOGOUT, handleLogout);
        WalletController.on(ControllerEventName.ACCOUNT_CHANGE, handleAccountChange);
        WalletController.on(ControllerEventName.NEW_TRANSACTION_CONFIRMED, handleNewConfirmedTransaction);

        return () => {
            WalletController.removeListener(ControllerEventName.LOGIN, handleLoginStateChange);
            WalletController.removeListener(ControllerEventName.LOGOUT, handleLogout);
            WalletController.removeListener(ControllerEventName.ACCOUNT_CHANGE, handleAccountChange);
        };
    }, []);

    return (
        <>
            <GestureHandlerRootView style={layout.fill}>
                <SafeAreaView style={unsafeAreaStyle}>
                    <View style={safeAreaStyle}>
                        <StatusBar backgroundColor={colors.bgStatusbar} barStyle="light-content" />
                        {isWalletStored && <ConnectionStatus />}
                        <FlashMessage
                            statusBarHeight={8}
                            animationDuration={200}
                            titleStyle={flashMessageTextStyle}
                            style={flashMessageStyle}
                        />
                        <RouterView isActive={isMainContainerShown} isLoggedIn={isWalletStored} />
                        {isPasscodeShown && <Passcode hideCancelButton keepListener keepNavigation route={{ params: passcodeParams }} />}
                    </View>
                </SafeAreaView>
            </GestureHandlerRootView>
        </>
    );
};

export default App;
