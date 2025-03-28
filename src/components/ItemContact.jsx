import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacings } from '@/app/styles';
import { trunc } from '@/app/utils';
import { AccountAvatar, ItemBase } from '@/app/components';

export function ItemContact(props) {
    const { contact, onPress } = props;
    const { name, address } = contact;

    return (
        <ItemBase contentContainerStyle={styles.root} onPress={onPress}>
            <View style={styles.sectionIcon}>
                <AccountAvatar size="md" address={address} />
            </View>
            <View style={styles.sectionMiddle}>
                <Text style={styles.textName}>{name}</Text>
                <Text style={styles.textDescription}>{trunc(address, 'address-long')}</Text>
            </View>
        </ItemBase>
    );
}

const styles = StyleSheet.create({
    root: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    textName: {
        ...fonts.subtitle,
        color: colors.textBody,
    },
    textDescription: {
        ...fonts.body,
        color: colors.textBody,
        opacity: 0.7,
    },
    sectionIcon: {
        flexDirection: 'column',
        justifyContent: 'center',
        paddingRight: spacings.padding,
    },
    sectionMiddle: {
        flex: 1,
        flexDirection: 'column',
    },
});
