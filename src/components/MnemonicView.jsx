import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borders, colors, fonts, spacings } from '@/app/styles';
import { ButtonCopy } from '@/app/components';
import { $t } from '@/app/localization';

export const MnemonicView = (props) => {
    const { isShown, isCopyDisabled, mnemonic, onShowPress } = props;
    const placeholder = Array(mnemonic.length).join('*');
    const styleMnemonicText = isShown ? [styles.textMnemonic] : [styles.textMnemonic, styles.hidden];
    const mnemonicText = isShown ? mnemonic : placeholder;

    return (
        <View style={styles.root}>
            <Text style={styleMnemonicText}>{mnemonicText}</Text>
            {isShown && !isCopyDisabled && <ButtonCopy content={mnemonicText} style={styles.copy} />}
            {!isShown && (
                <TouchableOpacity onPress={onShowPress} style={styles.button}>
                    <Text style={styles.textButton}>{$t('button_showMnemonic')}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        position: 'relative',
        width: '100%',
        backgroundColor: colors.bgForm,
        borderRadius: borders.borderRadiusForm,
    },
    copy: {
        position: 'absolute',
        top: spacings.padding / 2,
        right: spacings.padding / 2,
    },
    textMnemonic: {
        ...fonts.label,
        marginVertical: spacings.margin,
        color: colors.textForm,
        textAlign: 'center',
        padding: spacings.padding,
    },
    textButton: {
        ...fonts.button,
        color: colors.controlButtonText,
        textAlign: 'center',
    },
    button: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hidden: {
        opacity: 0.1,
    },
});
