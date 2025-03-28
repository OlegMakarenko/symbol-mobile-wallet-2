import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { PlatformUtils } from '@/app/lib/platform/PlatformUtils';

export const ButtonCopy = (props) => {
    const { content, style, size } = props;
    const styleIcon = size === 'sm' ? styles.icon : styles.iconSm;

    const handlePress = () => {
        try {
            PlatformUtils.copyToClipboard(content);
            showMessage({ message: content, type: 'info' });
        } catch (error) {
            showMessage({ message: error.message, type: 'danger' });
        }
    };
    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    return (
        <View style={style} onTouchEnd={stopPropagation}>
            <TouchableOpacity onPress={handlePress} hitSlop={10}>
                <Image source={require('@/app/assets/images/icon-copy.png')} style={styleIcon} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    icon: {
        width: 24,
        height: 24,
    },
    iconSm: {
        width: 16,
        height: 16,
    },
});
