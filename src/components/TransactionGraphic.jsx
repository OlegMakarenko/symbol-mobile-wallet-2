/* eslint-disable react/display-name */
import _ from 'lodash';
import React, { useState } from 'react';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AccountAvatar, TableView, TouchableNative } from '@/app/components';
import { $t } from '@/app/localization';
import { borders, colors, fonts, spacings } from '@/app/styles';
import { filterCustomMosaics, getAddressName, getColorFromHash, getMosaicAmount, trunc } from '@/app/utils';
import { TransactionType } from '@/app/constants';
import WalletController from '@/app/lib/controller/MobileWalletController';
import { observer } from 'mobx-react-lite';

const TABLE_MAX_HEIGHT = 500;

export const TransactionGraphic = observer(function TransactionGraphic(props) {
    const { transaction } = props;
    const { ticker, currentAccount, networkIdentifier, networkProperties, accounts } = WalletController;
    const { addressBook } = WalletController.modules;
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasBeenExpanded, setHasBeenExpanded] = useState(props.isExpanded);
    const walletAccounts = accounts[networkIdentifier];
    const signerName = getAddressName(transaction.signerAddress, currentAccount, walletAccounts, addressBook);
    const signerNameColorStyle = {
        color: getColorFromHash(transaction.signerAddress),
    };
    const signerNameStyle = [styles.signerName, signerNameColorStyle];
    const targetNameStyle = [styles.targetName];

    const truncText = (str) => trunc(str, 'custom', 24);
    let actionTypeText = truncText($t(`transactionDescriptor_${transaction.type}`));
    let Target = () => <View />;
    let targetName = '';
    let ActionBody = () => null;

    const TargetMosaic = () => (
        <View style={styles.targetIconWrapper}>
            <Image source={require('@/app/assets/images/icon-tx-mosaic.png')} style={styles.targetIcon} />
        </View>
    );
    const TargetNamespace = () => (
        <View style={styles.targetIconWrapper}>
            <Image source={require('@/app/assets/images/icon-tx-namespace.png')} style={styles.targetIcon} />
        </View>
    );
    const TargetLock = () => (
        <View style={styles.targetIconWrapper}>
            <Image source={require('@/app/assets/images/icon-tx-lock.png')} style={styles.targetIcon} />
        </View>
    );

    switch (transaction.type) {
        case TransactionType.TRANSFER:
            Target = () => <AccountAvatar address={transaction.recipientAddress} size="md" />;
            targetName = getAddressName(transaction.recipientAddress, currentAccount, walletAccounts, addressBook);
            targetNameStyle.push({
                color: getColorFromHash(transaction.recipientAddress),
            });
            const transferredAmount = getMosaicAmount(transaction.mosaics, networkProperties.networkCurrency.mosaicId);
            const hasMessage = !!transaction.message;
            const hasCustomMosaic = !!filterCustomMosaics(transaction.mosaics, networkProperties.networkCurrency.mosaicId).length;

            if (hasMessage && transaction.message.isDelegatedHarvestingMessage) {
                actionTypeText = truncText($t(`transactionDescriptor_${transaction.type}_harvesting`));
            }

            ActionBody = () => (
                <>
                    {hasMessage && <Image style={styles.actionIcon} source={require('@/app/assets/images/icon-tx-message.png')} />}
                    {hasCustomMosaic && (
                        <Image style={styles.actionIcon} source={require('@/app/assets/images/icon-select-mosaic-custom.png')} />
                    )}
                    {!!transferredAmount && (
                        <Text style={styles.actionText}>
                            {Math.abs(transferredAmount)} {ticker}
                        </Text>
                    )}
                </>
            );
            break;
        case TransactionType.NAMESPACE_REGISTRATION:
            Target = TargetNamespace;
            targetName = transaction.namespaceName;
            break;
        case TransactionType.MOSAIC_ALIAS:
            Target = TargetMosaic;
            targetName = transaction.mosaicId;
            ActionBody = () => <Text style={styles.actionText}>{truncText(transaction.namespaceName)}</Text>;
            break;
        case TransactionType.ADDRESS_ALIAS:
            Target = () => <AccountAvatar address={transaction.address} size="md" />;
            targetName = getAddressName(transaction.address, currentAccount, walletAccounts, addressBook);
            targetNameStyle.push({
                color: getColorFromHash(transaction.address),
            });
            ActionBody = () => <Text style={styles.actionText}>{truncText(transaction.namespaceName)}</Text>;
            break;
        case TransactionType.MOSAIC_DEFINITION:
            Target = TargetMosaic;
            targetName = transaction.mosaicId;
            break;
        case TransactionType.MOSAIC_SUPPLY_CHANGE:
            Target = TargetMosaic;
            targetName = transaction.mosaicId;
            ActionBody = () => <Text style={styles.actionText}>{transaction.delta}</Text>;
            break;
        case TransactionType.MOSAIC_SUPPLY_REVOCATION:
            Target = () => <AccountAvatar address={transaction.sourceAddress} size="md" />;
            targetName = getAddressName(transaction.sourceAddress, currentAccount, walletAccounts, addressBook);
            targetNameStyle.push({
                color: getColorFromHash(transaction.sourceAddress),
            });
            ActionBody = () => (
                <>
                    <Image style={styles.actionIcon} source={require('@/app/assets/images/icon-select-mosaic-custom.png')} />
                    <Text style={styles.actionText}>{transaction.mosaicId}</Text>
                </>
            );
            break;
        case TransactionType.ACCOUNT_MOSAIC_RESTRICTION:
        case TransactionType.ACCOUNT_ADDRESS_RESTRICTION:
        case TransactionType.ACCOUNT_OPERATION_RESTRICTION:
            Target = () => <AccountAvatar address={transaction.signerAddress} size="md" />;
            targetName = getAddressName(transaction.signerAddress, currentAccount, walletAccounts, addressBook);
            targetNameStyle.push({
                color: getColorFromHash(transaction.signerAddress),
            });
            ActionBody = () => <Text style={styles.actionText}>{truncText($t(`data_${transaction.restrictionType}`))}</Text>;
            break;
        case TransactionType.MOSAIC_GLOBAL_RESTRICTION: {
            Target = () => <TargetMosaic />;
            targetName = transaction.referenceMosaicId;
            const actionText = truncText(
                `${transaction.restrictionKey} ${$t(`data_${transaction.newRestrictionType}`)} ${transaction.newRestrictionValue}`
            );
            ActionBody = () => <Text style={styles.actionText}>{actionText}</Text>;
            break;
        }
        case TransactionType.MOSAIC_ADDRESS_RESTRICTION: {
            Target = () => <AccountAvatar address={transaction.targetAddress} size="md" />;
            targetName = getAddressName(transaction.targetAddress, currentAccount, walletAccounts, addressBook);
            targetNameStyle.push({
                color: getColorFromHash(transaction.targetAddress),
            });
            const actionText = truncText(`${transaction.restrictionKey} = ${transaction.newRestrictionValue}`);
            ActionBody = () => <Text style={styles.actionText}>{actionText}</Text>;
            break;
        }
        case TransactionType.MULTISIG_ACCOUNT_MODIFICATION:
            Target = () => <AccountAvatar address={transaction.signerAddress} size="md" />;
            targetName = getAddressName(transaction.signerAddress, currentAccount, walletAccounts, addressBook);
            targetNameStyle.push({
                color: getColorFromHash(transaction.signerAddress),
            });
            break;
        case TransactionType.VRF_KEY_LINK:
        case TransactionType.NODE_KEY_LINK:
        case TransactionType.VOTING_KEY_LINK:
        case TransactionType.ACCOUNT_KEY_LINK: {
            Target = () => <AccountAvatar address={transaction.linkedAccountAddress} size="md" />;
            targetName = getAddressName(transaction.linkedAccountAddress, currentAccount, walletAccounts, addressBook);
            targetNameStyle.push({
                color: getColorFromHash(transaction.linkedAccountAddress),
            });
            const actionText = truncText(`${$t(`data_${transaction.linkAction}`)}`);
            ActionBody = () => <Text style={styles.actionText}>{actionText}</Text>;
            break;
        }
        case TransactionType.HASH_LOCK: {
            Target = () => <TargetLock />;
            targetName = $t('transactionDescriptionShort_hashLock', { duration: transaction.duration });
            const lockedAmount = Math.abs(transaction.lockedAmount);
            ActionBody = () => (
                <Text style={styles.actionText}>
                    {lockedAmount} {ticker}
                </Text>
            );
            break;
        }
        case TransactionType.SECRET_LOCK:
        case TransactionType.SECRET_PROOF: {
            Target = () => <TargetLock />;
            targetName = '';
            ActionBody = () => <Text style={styles.actionText}>{truncText(transaction.secret)}</Text>;
            break;
        }
        case TransactionType.ACCOUNT_METADATA: {
            Target = () => <AccountAvatar address={transaction.targetAddress} size="md" />;
            targetName = getAddressName(transaction.targetAddress, currentAccount, walletAccounts, addressBook);
            targetNameStyle.push({
                color: getColorFromHash(transaction.targetAddress),
            });
            ActionBody = () => <Text style={styles.actionText}>{truncText(transaction.scopedMetadataKey)}</Text>;
            break;
        }
        case TransactionType.NAMESPACE_METADATA: {
            Target = () => <TargetNamespace />;
            targetName = transaction.targetNamespaceId;
            ActionBody = () => <Text style={styles.actionText}>{truncText(transaction.scopedMetadataKey)}</Text>;
            break;
        }
        case TransactionType.MOSAIC_METADATA: {
            Target = () => <TargetMosaic />;
            targetName = transaction.targetMosaicId;
            ActionBody = () => <Text style={styles.actionText}>{truncText(transaction.scopedMetadataKey)}</Text>;
            break;
        }
    }

    const tableMaxHeight = useSharedValue(0);
    const animatedTable = useAnimatedStyle(() => ({
        maxHeight: tableMaxHeight.value,
    }));
    const animatedIconExpand = useAnimatedStyle(() => ({
        opacity: interpolate(tableMaxHeight.value, [0, 100], [0.2, 0]),
    }));

    const iconExpandStyle = [styles.iconExpand, animatedIconExpand];

    const getTableData = () =>
        _.omit(
            transaction,
            'amount',
            'lockedAmount',
            'id',
            'innerTransactions',
            'cosignatures',
            'deadline',
            'type',
            'fee',
            'status',
            'group',
            'height',
            'hash',
            'signerPublicKey',
            'signerAddress',
            'recipientAddress',
            'sourceAddress',
            'timestamp'
        );
    const handlePress = () => {
        if (!hasBeenExpanded) {
            setHasBeenExpanded(true);
        }
        setIsExpanded(!isExpanded);
        tableMaxHeight.value = withTiming(isExpanded ? 0 : TABLE_MAX_HEIGHT);
    };
    const expand = () => {
        setHasBeenExpanded(true);
        setIsExpanded(true);
        tableMaxHeight.value = TABLE_MAX_HEIGHT;
    };

    useEffect(() => {
        if (props.isExpanded) {
            setTimeout(expand);
        }
    }, [props.isExpanded]);

    return (
        <TouchableNative style={styles.root} onPress={handlePress}>
            <Text style={signerNameStyle}>{signerName}</Text>
            <View style={styles.middleSection}>
                <AccountAvatar size="md" address={transaction.signerAddress} />
                <View style={styles.arrowSection}>
                    <Text style={styles.actionTypeText}>{actionTypeText}</Text>
                    <Image source={require('@/app/assets/images/graphic/arrow.png')} style={styles.arrow} />
                    <View style={styles.actionBody}>
                        <ActionBody />
                    </View>
                </View>
                <View style={styles.target}>
                    <Target />
                </View>
            </View>
            <Text style={targetNameStyle}>{targetName}</Text>
            <Animated.View style={animatedTable}>{hasBeenExpanded && <TableView data={getTableData()} />}</Animated.View>
            <Animated.Image source={require('@/app/assets/images/icon-down.png')} style={iconExpandStyle} />
        </TouchableNative>
    );
});

const styles = StyleSheet.create({
    root: {
        position: 'relative',
        width: '100%',
        backgroundColor: colors.bgCard,
        borderRadius: borders.borderRadius,
        padding: spacings.padding,
        overflow: 'hidden',
    },
    signerName: {
        ...fonts.transactionSignerName,
        color: colors.primary,
        width: '50%',
        marginBottom: spacings.margin / 2,
    },
    middleSection: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacings.margin / 2,
    },
    arrowSection: {
        position: 'relative',
        marginHorizontal: spacings.margin,
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTypeText: {
        ...fonts.transactionSignerName,
        lineHeight: 20,
        color: colors.textBody,
        textAlign: 'center',
    },
    actionBody: {
        minHeight: 20,
        minWidth: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        width: 18,
        height: 18,
        marginRight: spacings.margin / 4,
    },
    actionText: {
        ...fonts.transactionSignerName,
        lineHeight: 20,
        color: colors.textBody,
        textAlign: 'center',
    },
    arrow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    target: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    targetIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgForm,
    },
    targetIcon: {
        height: 24,
        width: 24,
    },
    targetName: {
        ...fonts.transactionSignerName,
        color: colors.primary,
        width: '50%',
        textAlign: 'right',
        alignSelf: 'flex-end',
    },
    table: {
        height: '100%',
    },
    iconExpand: {
        position: 'absolute',
        left: spacings.padding,
        bottom: 0,
        width: '100%',
        height: 24,
        resizeMode: 'contain',
        opacity: 0.2,
    },
});
