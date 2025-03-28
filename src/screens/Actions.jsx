import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { FormItem, ItemBase, Screen, StyledText, TabNavigator, TitleBar } from '@/app/components';
import { $t } from '@/app/localization';
import { Router } from '@/app/Router';
import { spacings } from '@/app/styles';
import WalletController from '@/app/lib/controller/MobileWalletController';
import { observer } from 'mobx-react-lite';

export const Actions = observer(function Actions() {
    const { currentAccount, isWalletReady } = WalletController;

    const list = [
        {
            title: $t('s_actions_addressBook_title'),
            description: $t('s_actions_addressBook_description'),
            icon: require('@/app/assets/images/art-address-book.png'),
            handler: Router.goToAddressBookList,
        },
        {
            title: $t('s_actions_harvesting_title'),
            description: $t('s_actions_harvesting_description'),
            icon: require('@/app/assets/images/art-harvesting.png'),
            handler: Router.goToHarvesting,
        },
        {
            title: $t('s_actions_send_title'),
            description: $t('s_actions_send_description'),
            icon: require('@/app/assets/images/art-ship.png'),
            handler: Router.goToSend,
        },
        // {
        //     title: $t('s_actions_createMosaic_title'),
        //     description: $t('s_actions_createMosaic_description'),
        //     icon: require('@/app/assets/images/art-mosaic.png'),
        //     handler: Router.goToMosaicCreation,
        // },
    ];

    return (
        <Screen
            titleBar={<TitleBar accountSelector settings currentAccount={currentAccount} />}
            navigator={<TabNavigator />}
            isLoading={!isWalletReady}
        >
            <FormItem type="group" clear="bottom">
                <StyledText type="title">{$t('s_actions_title')}</StyledText>
            </FormItem>
            <FormItem clear="horizontal">
                {list.map((item, index) => (
                    <ItemBase contentContainerStyle={styles.item} key={'act' + index} onPress={item.handler}>
                        <Image source={item.icon} style={styles.itemIcon} />
                        <View style={styles.itemTextContainer}>
                            <StyledText type="subtitle" style={styles.itemTitle}>
                                {item.title}
                            </StyledText>
                            <StyledText type="body">{item.description}</StyledText>
                        </View>
                    </ItemBase>
                ))}
            </FormItem>
        </Screen>
    );
});

const styles = StyleSheet.create({
    container: {},
    item: {
        padding: 0,
        minHeight: 100,
        position: 'relative',
    },
    itemIcon: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        resizeMode: 'contain',
    },
    itemTextContainer: {
        marginLeft: 100,
        padding: spacings.margin,
    },
    itemTitle: {
        marginBottom: spacings.margin / 2,
    },
});
