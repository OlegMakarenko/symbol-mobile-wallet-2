import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { LoadingIndicator } from '@/app/components';
import { colors, spacings } from '@/app/styles';

export const Screen = (props) => {
    const { children, style, titleBar, bottomComponent, bottomComponent2, navigator, isLoading } = props;
    const isKeyboardAvoidingViewEnabled = Platform.OS === 'ios' ? true : false;

    return isLoading ? (
        <LoadingIndicator fill />
    ) : (
        <View style={[styles.root, style]}>
            {titleBar}
            <KeyboardAvoidingView style={styles.content} enabled={isKeyboardAvoidingViewEnabled} behavior="padding">
                {children}
            </KeyboardAvoidingView>
            {bottomComponent2}
            {!!bottomComponent && <View style={styles.bottom}>{bottomComponent}</View>}
            {navigator}
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        height: '100%',
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: colors.bgGray,
    },
    content: {
        flex: 1,
        marginBottom: 0,
    },
    bottom: {
        marginBottom: spacings.margin,
    },
});
