import React, { useMemo, useState } from 'react';
import { SectionList } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';
import { Filter, FormItem, ItemAsset, Screen, StyledText, TabNavigator, TitleBar } from 'src/components';
import { $t } from 'src/localization';
import { Router } from 'src/Router';
import store, { connect } from 'src/store';
import { colors } from 'src/styles';
import { handleError, useDataManager, useInit } from 'src/utils';

export const Assets = connect((state) => ({
    isWalletReady: state.wallet.isReady,
    chainHeight: state.network.chainHeight,
    currentAccount: state.account.current,
    mosaics: state.account.mosaics,
    namespaces: state.account.namespaces,
    networkProperties: state.network.networkProperties,
}))(function Assets(props) {
    const { isWalletReady, chainHeight, currentAccount, mosaics, namespaces, networkProperties } = props;
    const [filter, setFilter] = useState({});
    const [fetchData, isLoading] = useDataManager(
        async () => {
            await store.dispatchAction({ type: 'account/fetchData' });
        },
        null,
        handleError
    );
    useInit(fetchData, isWalletReady, [currentAccount]);

    const sections = [];
    const filteredMosaics = useMemo(() => {
        let mosaicsFilteredByCreator = mosaics;

        if (filter.created) {
            mosaicsFilteredByCreator = mosaics.filter((mosaic) => mosaic.creator === currentAccount.address);
        }
        if (filter.expired) {
            return mosaicsFilteredByCreator;
        }

        return mosaicsFilteredByCreator.filter((mosaic) => mosaic.isUnlimitedDuration || mosaic.endHeight > chainHeight);
    }, [filter, mosaics]);

    sections.push({
        title: $t('s_assets_mosaics'),
        group: 'mosaic',
        data: filteredMosaics,
    });

    if (namespaces.length) {
        sections.push({
            title: $t('s_assets_namespaces'),
            group: 'namespace',
            data: namespaces,
        });
    }

    const filterConfig = [
        {
            name: 'expired',
            title: $t('s_assets_filter_expired'),
            type: 'boolean',
        },
        {
            name: 'created',
            title: $t('s_assets_filter_created'),
            type: 'boolean',
        },
    ];

    return (
        <Screen titleBar={<TitleBar accountSelector settings currentAccount={currentAccount} />} navigator={<TabNavigator />}>
            <SectionList
                refreshControl={<RefreshControl tintColor={colors.primary} refreshing={isLoading} onRefresh={fetchData} />}
                ListHeaderComponent={<Filter data={filterConfig} value={filter} onChange={setFilter} />}
                stickySectionHeadersEnabled={false}
                sections={sections}
                keyExtractor={(item, section) => section.group + item.id}
                renderItem={({ item, section }) => (
                    <ItemAsset
                        asset={item}
                        chainHeight={chainHeight}
                        blockGenerationTargetTime={networkProperties.blockGenerationTargetTime}
                        nativeMosaicId={networkProperties.networkCurrency.mosaicId}
                        group={section.group}
                        onPress={() =>
                            Router.goToAssetDetails({
                                asset: item,
                                group: section.group,
                            })
                        }
                    />
                )}
                renderSectionHeader={({ section: { title, style } }) => (
                    <FormItem>
                        <StyledText type="label" style={style}>
                            {title}
                        </StyledText>
                    </FormItem>
                )}
            />
        </Screen>
    );
});
