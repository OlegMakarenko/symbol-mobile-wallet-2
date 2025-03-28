import _ from 'lodash';
import React from 'react';
import { useMemo } from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
    Alert,
    Button,
    ButtonPlain,
    DialogBox,
    FeeSelector,
    FormItem,
    Screen,
    StyledText,
    TableView,
    TitleBar,
    TransactionGraphic,
    Widget,
} from '@/app/components';
import { TransactionType } from '@/app/constants';
import { $t } from '@/app/localization';
import { Router } from '@/app/Router';
import { TransactionService } from '@/app/lib/services';
import { colors, fonts, layout } from '@/app/styles';
import { calculateTransactionFees, getUserCurrencyAmountText, handleError, isAggregateTransaction } from '@/app/utils';
import { useDataManager, useInit, usePasscode, useToggle } from '@/app/hooks';
import WalletController from '@/app/lib/controller/MobileWalletController';
import { observer } from 'mobx-react-lite';

const SUPPORTED_TRANSACTION_TYPES = [
    TransactionType.AGGREGATE_BONDED,
    TransactionType.AGGREGATE_COMPLETE,
    TransactionType.TRANSFER,
    TransactionType.ADDRESS_ALIAS,
    TransactionType.MOSAIC_ALIAS,
    TransactionType.NAMESPACE_REGISTRATION,
    TransactionType.MOSAIC_DEFINITION,
    TransactionType.MOSAIC_SUPPLY_CHANGE,
    TransactionType.MOSAIC_SUPPLY_REVOCATION,
    TransactionType.VRF_KEY_LINK,
    TransactionType.ACCOUNT_KEY_LINK,
    TransactionType.NODE_KEY_LINK,
    TransactionType.VOTING_KEY_LINK,
    TransactionType.ACCOUNT_METADATA,
    TransactionType.NAMESPACE_METADATA,
    TransactionType.MOSAIC_METADATA,
];

export const TransactionRequest = observer(function TransactionRequest(props) {
    const { route } = props;
    const { currentAccount, currentAccountInfo, isWalletReady, networkProperties, ticker } = WalletController;
    const { price } = WalletController.modules.market;
    const { params } = route;
    const [transaction, setTransaction] = useState(null);
    const [styleAmount, setStyleAmount] = useState(null);
    const [userCurrencyAmountText, setUserCurrencyAmountText] = useState('');
    const [speed, setSpeed] = useState('medium');
    const [isTypeSupported, setIsTypeSupported] = useState(false);
    const [isNetworkSupported, setIsNetworkSupported] = useState(false);
    const [isConfirmVisible, toggleConfirm] = useToggle(false);
    const [isSuccessAlertVisible, toggleSuccessAlert] = useToggle(false);
    const [isErrorAlertVisible, toggleErrorAlert] = useToggle(false);
    const isTransactionLoaded = !!transaction;
    const cosignatoryList = { cosignatories: currentAccountInfo.cosignatories };
    const isAggregate = !!transaction?.innerTransactions;

    const transactionFees = useMemo(() => (transaction ? calculateTransactionFees(transaction, networkProperties) : {}), [transaction]);

    const getTransactionPreviewTable = (data, isEmbedded) =>
        _.omit(data, [
            'amount',
            'innerTransactions',
            'signTransactionObject',
            'signerPublicKey',
            'deadline',
            'cosignatures',
            'timestamp',
            isEmbedded ? 'fee' : null,
        ]);
    const [loadTransaction, isTransactionLoading] = useDataManager(
        async (payload, generationHash) => {
            const fillSignerPublickey = currentAccount.publicKey;
            const transaction = await TransactionService.resolveTransactionFromPayload(
                payload,
                networkProperties,
                currentAccount,
                fillSignerPublickey
            );

            const styleAmount = [styles.textAmount];
            if (transaction.amount < 0) {
                styleAmount.push(styles.outgoing);
            } else if (transaction.amount > 0) {
                styleAmount.push(styles.incoming);
            }

            let isTypeSupported = false;

            if (isAggregateTransaction(transaction)) {
                isTypeSupported = transaction.innerTransactions.every((transaction) =>
                    SUPPORTED_TRANSACTION_TYPES.some((item) => item === transaction.type)
                );
            } else {
                isTypeSupported = SUPPORTED_TRANSACTION_TYPES.some((item) => item === transaction.type);
            }

            const userCurrencyAmountText = getUserCurrencyAmountText(
                Math.abs(transaction.amount),
                price,
                networkProperties.networkIdentifier
            );

            setTransaction(transaction);
            setIsTypeSupported(isTypeSupported);
            setIsNetworkSupported(generationHash === networkProperties.generationHash);
            setStyleAmount(styleAmount);
            setUserCurrencyAmountText(userCurrencyAmountText);
        },
        null,
        (e) => {
            handleError(e);
            toggleErrorAlert();
        }
    );
    const [send, isSending] = useDataManager(
        async (password) => {
            await WalletController.signAndAnnounceTransaction(transaction, true, password);
            toggleSuccessAlert();
        },
        null,
        handleError
    );
    const confirmSend = usePasscode('enter', send);
    const handleConfirmPress = () => {
        toggleConfirm();
        confirmSend();
    };
    const cancel = () => {
        Router.goToHome();
    };

    // Update transaction maxFee value when speed is changed or fees recalculated
    useEffect(() => {
        if (transaction) {
            transaction.fee = transactionFees[speed];
        }
    }, [transactionFees, speed, transaction]);

    useEffect(() => {
        if (isWalletReady) loadTransaction(params.data, params.generationHash);
    }, [params, currentAccount, isWalletReady]);

    const [loadState, isStateLoading] = useDataManager(WalletController.fetchAccountInfo, null, handleError);
    useInit(loadState, isWalletReady, [currentAccount]);

    const isButtonDisabled = !isTransactionLoaded || !isTypeSupported || !isNetworkSupported || currentAccountInfo.isMultisig;
    const isLoading = !isWalletReady || isTransactionLoading || isSending || isStateLoading;

    return (
        <Screen titleBar={<TitleBar accountSelector settings currentAccount={currentAccount} />} isLoading={isLoading}>
            <ScrollView>
                <FormItem>
                    <StyledText type="title">{$t('s_transactionRequest_title')}</StyledText>
                    <StyledText type="body">{$t('s_transactionRequest_description')}</StyledText>
                </FormItem>
                {currentAccountInfo.isMultisig && (
                    <>
                        <FormItem>
                            <Alert type="warning" title={$t('warning_multisig_title')} body={$t('warning_multisig_body')} />
                        </FormItem>
                        <FormItem>
                            <TableView data={cosignatoryList} />
                        </FormItem>
                    </>
                )}
                {!isNetworkSupported && (
                    <FormItem>
                        <Alert
                            type="warning"
                            title={$t('warning_transactionRequest_networkType_title')}
                            body={$t('warning_transactionRequest_networkType_body')}
                        />
                    </FormItem>
                )}
                {!isTypeSupported && (
                    <>
                        <FormItem>
                            <Alert
                                type="warning"
                                title={$t('warning_transactionRequest_transactionType_title')}
                                body={$t('warning_transactionRequest_transactionType_body')}
                            />
                        </FormItem>
                        <FormItem>
                            <Widget>
                                <FormItem>
                                    <StyledText type="subtitle">{$t('s_transactionRequest_supportedTypes_title')}</StyledText>
                                    {SUPPORTED_TRANSACTION_TYPES.map((type, index) => (
                                        <StyledText type="body" key={index}>
                                            {$t(`transactionDescriptor_${type}`)}
                                        </StyledText>
                                    ))}
                                </FormItem>
                            </Widget>
                        </FormItem>
                    </>
                )}
                <FormItem>
                    <StyledText type="label">{$t('s_transactionDetails_amount')}</StyledText>
                    <View style={styles.amountRow}>
                        <StyledText style={styleAmount}>
                            {transaction ? transaction.amount : '-'} {ticker} {''}
                        </StyledText>
                        {!!userCurrencyAmountText && (
                            <StyledText style={[styleAmount, styles.userCurrencyText]}>{userCurrencyAmountText}</StyledText>
                        )}
                    </View>
                </FormItem>
                <FormItem>
                    {isTransactionLoaded && !isAggregate && <TransactionGraphic transaction={transaction} isExpanded={isTypeSupported} />}
                    {isTransactionLoaded &&
                        isAggregate &&
                        transaction.innerTransactions.map((item, index) => (
                            <FormItem type="list" key={'tx' + index}>
                                <TransactionGraphic transaction={item} isExpanded={isTypeSupported} />
                            </FormItem>
                        ))}
                </FormItem>
                <FormItem>
                    <FeeSelector title={$t('input_feeSpeed')} value={speed} fees={transactionFees} ticker={ticker} onChange={setSpeed} />
                </FormItem>
                <FormItem>
                    <Button title={$t('button_send')} isDisabled={isButtonDisabled} onPress={toggleConfirm} />
                </FormItem>
                <FormItem>
                    <ButtonPlain title={$t('button_cancel')} style={layout.alignSelfCenter} onPress={cancel} />
                </FormItem>
            </ScrollView>
            <DialogBox
                type="confirm"
                title={$t('transaction_confirm_title')}
                body={
                    <ScrollView>
                        <FormItem clear="horizontal">
                            <TableView data={getTransactionPreviewTable(transaction)} />
                        </FormItem>
                        {transaction?.innerTransactions?.map((innerTransaction, index) => (
                            <FormItem key={'inner' + index} clear="horizontal">
                                <TableView data={getTransactionPreviewTable(innerTransaction, true)} />
                            </FormItem>
                        ))}
                    </ScrollView>
                }
                isVisible={isConfirmVisible}
                onSuccess={handleConfirmPress}
                onCancel={toggleConfirm}
            />
            <DialogBox
                type="alert"
                title={$t('transaction_success_title')}
                text={$t('transaction_success_text')}
                isVisible={isSuccessAlertVisible}
                onSuccess={Router.goToHome}
            />
            <DialogBox
                type="alert"
                title={$t('s_transactionRequest_error_title')}
                text={$t('s_transactionRequest_error_text')}
                isVisible={isErrorAlertVisible}
                onSuccess={Router.goToHome}
            />
        </Screen>
    );
});

const styles = StyleSheet.create({
    textAmount: {
        ...fonts.amount,
        color: colors.textBody,
    },
    outgoing: {
        color: colors.danger,
    },
    incoming: {
        color: colors.success,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    userCurrencyText: {
        ...fonts.body,
    },
});
