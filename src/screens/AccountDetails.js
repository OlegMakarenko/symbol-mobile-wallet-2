import React from 'react';
import { Linking } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { AccountAvatar, ButtonPlain, DialogBox, FormItem, Screen, TableView, Widget } from 'src/components';
import { config } from 'src/config';
import { $t } from 'src/localization';
import { Router } from 'src/Router';
import { connect } from 'src/store';
import { layout } from 'src/styles';
import { publicAccountFromPrivateKey, usePasscode, useToggle } from 'src/utils';

export const AccountDetails = connect((state) => ({
    currentAccount: state.account.current,
    networkIdentifier: state.network.networkIdentifier,
}))(function AccountDetails(props) {
    const { currentAccount, networkIdentifier } = props;
    const { privateKey, index, ...restAccountInfo } = currentAccount;
    const [isPrivateKeyDialogShown, togglePrivateKeyDialog] = useToggle(false);
    const tableData = {
        ...restAccountInfo,
        publicKey: publicAccountFromPrivateKey(privateKey, networkIdentifier).publicKey,
        seedIndex: index,
    };
    const isTestnet = networkIdentifier === 'testnet';

    const openBlockExplorer = () => Linking.openURL(config.explorerURL[networkIdentifier] + '/accounts/' + currentAccount.address);
    const openFaucet = () => Linking.openURL(config.faucetURL + '/?recipient=' + currentAccount.address);
    const revealPrivateKey = usePasscode('enter', togglePrivateKeyDialog);

    return (
        <Screen
            bottomComponent={
                <>
                    {isTestnet && (
                        <FormItem>
                            <ButtonPlain
                                icon={require('src/assets/images/icon-primary-faucet.png')}
                                title={$t('button_faucet')}
                                onPress={openFaucet}
                            />
                        </FormItem>
                    )}
                    <FormItem>
                        <ButtonPlain
                            icon={require('src/assets/images/icon-primary-explorer.png')}
                            title={$t('button_openTransactionInExplorer')}
                            onPress={openBlockExplorer}
                        />
                    </FormItem>
                    <FormItem>
                        <ButtonPlain
                            icon={require('src/assets/images/icon-primary-key.png')}
                            title={$t('button_revealPrivateKey')}
                            onPress={revealPrivateKey}
                        />
                    </FormItem>
                </>
            }
        >
            <ScrollView>
                <FormItem>
                    <Widget>
                        <FormItem style={layout.alignCenter}>
                            <AccountAvatar address={currentAccount.address} size="lg" />
                        </FormItem>
                        <FormItem>
                            <TableView data={tableData} rawAddresses />
                        </FormItem>
                    </Widget>
                </FormItem>
            </ScrollView>
            <DialogBox
                type="alert"
                title={$t('dialog_sensitive')}
                body={<TableView data={{ privateKey }} />}
                isVisible={isPrivateKeyDialogShown}
                onSuccess={togglePrivateKeyDialog}
            />
        </Screen>
    );
});
