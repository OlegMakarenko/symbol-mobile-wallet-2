import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';
import { Screen, TitleBar, TabNavigator, StyledText, ItemTransaction, ItemTransactionPlaceholder } from 'src/components';
import { $t } from 'src/localization';
import store, { connect } from 'src/store';
import { colors, spacings } from 'src/styles';
import { handleError, useDataManager, useInit } from 'src/utils';

export const History = connect(state => ({
    isWalletReady: state.wallet.isReady,
    currentAccount: state.account.current,
    partial: state.transaction.partial,
    unconfirmed: state.transaction.unconfirmed,
    confirmed: state.transaction.confirmed,
    isLastPage: state.transaction.isLastPage
}))(function History(props) {
    const { isWalletReady, isLastPage, currentAccount, partial, unconfirmed, confirmed } = props;
    const [pageNumber, setPageNumber] = useState(1);
    const [isNextPageRequested, setIsNextPageRequested] = useState(false);
    const [fetchTransactions, isLoading] = useDataManager(async () => {
        setPageNumber(1);
        await store.dispatchAction({type: 'transaction/fetchData'});
    }, null, handleError);
    const [fetchNextPage, isPageLoading] = useDataManager(async () => {
        const nextPageNumber = pageNumber + 1;
        await store.dispatchAction({type: 'transaction/fetchPage', payload: {pageNumber: nextPageNumber}});
        setPageNumber(nextPageNumber);
    }, null, handleError);
    useInit(fetchTransactions, isWalletReady);

    const onEndReached = () => !isLastPage && setIsNextPageRequested(true);
    const isPlaceholderShown = (group) => group === 'confirmed' && !isLastPage;
    const placeholderCount = 2;

    const isPartialShown = !!partial?.length;
    const isUnconfirmedShown = !!unconfirmed?.length;
    const isConfirmedShown = !!confirmed?.length;
    const sections = [];

    if (isPartialShown) {
        sections.push({
            title: $t('transactionGroup_partial'),
            style: styles.titlePartial,
            group: 'partial',
            data: partial
        });
    }
    if (isUnconfirmedShown) {
        sections.push({
            title: $t('transactionGroup_unconfirmed'),
            style: styles.titleUnconfirmed,
            group: 'unconfirmed',
            data: unconfirmed
        });
    }
    if (isConfirmedShown) {
        sections.push({
            title: $t('transactionGroup_confirmed'),
            style: null,
            group: 'confirmed',
            data: confirmed
        });
    }

    useEffect(() => {
        if (!isLoading && !isPageLoading && isNextPageRequested) {
            fetchNextPage();
            setIsNextPageRequested(false);
        }
    }, [isLoading, isPageLoading, isNextPageRequested])

    return (
        <Screen 
            titleBar={<TitleBar accountSelector settings currentAccount={currentAccount} />}
            navigator={<TabNavigator />}
        >
            <SectionList
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchTransactions} />}
                onEndReached={onEndReached}
                onEndReachedThreshold={1}
                sections={sections}
                keyExtractor={(item, section) => section.group + item.id}
                renderItem={({item, section}) => <ItemTransaction group={section.group} transaction={item} />}
                renderSectionHeader={({ section: { title, style } }) => (
                    <View style={styles.sectionHeader}>
                        <StyledText type="label" style={style}>{title}</StyledText>
                    </View>
                )}
                renderSectionFooter={({ section: { group } }) => (
                    <View style={styles.sectionFooter}>
                        {isPlaceholderShown(group) &&<>
                            {Array(placeholderCount).fill(null).map(() => <ItemTransactionPlaceholder />)}
                            <ActivityIndicator color={colors.primary} style={styles.loadingIndicator} />
                        </>}
                    </View>
                )}
            />
        </Screen>
    );
});

const styles = StyleSheet.create({
    titlePartial: {
        color: colors.info
    },
    titleUnconfirmed: {
        color: colors.warning
    },
    loadingIndicator: {
        position: 'absolute',
        height: '100%',
        width: '100%'
    },
    sectionHeader: {
        marginTop: spacings.margin
    },
    sectionFooter: {
        position: 'relative',
        marginBottom: spacings.margin
    },
});
