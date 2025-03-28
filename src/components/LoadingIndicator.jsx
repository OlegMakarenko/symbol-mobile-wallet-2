import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/app/styles';

export const LoadingIndicator = (props) => {
    const { size, fill } = props;
    const indicatorSize = size === 'sm' ? 'small' : 'large';

    return (
        <>
            <View style={styles.root}>
                <View style={styles.spinnerContainer}>
                    <ActivityIndicator size={indicatorSize} color={colors.primary} />
                </View>
            </View>
            {fill && <View style={styles.fillHeight} />}
        </>
    );
};

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    spinnerContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
    },
    fillHeight: {
        height: '100%',
        width: '100%',
    },
});
