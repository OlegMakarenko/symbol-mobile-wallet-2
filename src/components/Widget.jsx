import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { borders, colors, spacings } from '@/app/styles';
import { StyledText, TouchableNative } from '@/app/components';

export const Widget = (props) => {
    const { children, title, color, onHeaderPress } = props;
    const style = [styles.widget, color ? { backgroundColor: color } : null];

    return (
        <View style={style}>
            {!!title && (
                <TouchableNative style={styles.widgetHeader} onPress={onHeaderPress}>
                    <StyledText type="label">{title}</StyledText>
                    <Image source={require('@/app/assets/images/icon-expand.png')} style={styles.icon} />
                </TouchableNative>
            )}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    widget: {
        flexDirection: 'column',
        backgroundColor: colors.bgCard,
        borderRadius: borders.borderRadiusForm,
        minHeight: 100,
        overflow: 'hidden',
    },
    widgetHeader: {
        width: '100%',
        paddingHorizontal: spacings.padding,
        paddingVertical: spacings.paddingSm,
        backgroundColor: colors.bgCardTransparent,
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginLeft: spacings.paddingSm,
        width: 14,
        height: 14,
    },
});
