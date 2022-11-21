import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, fonts } from 'src/styles';

export const StyledText = props => {
    const { children, style, type } = props;
    let customStyle;

    switch (type) {
        case 'title':
            customStyle = styles.title;
            break;
        case 'subtitle':
            customStyle = styles.subtitle;
            break;
        case 'body':
            customStyle = styles.body;
            break;
        case 'label':
            customStyle = styles.label;
            break;
        case 'body-bold':
            customStyle = styles.bodyBold;
            break;
        case 'link':
            customStyle = styles.link;
            break;
    }

    return (
        <Text style={[styles.root, customStyle, style]}>
            {children}
        </Text>
    );
};

const styles = StyleSheet.create({
    root: {
        color: colors.textBody
    },
    title: {
        ...fonts.title
    },
    subtitle: {
        ...fonts.subtitle
    },
    body: {
        ...fonts.body
    },
    bodyBold: {
        ...fonts.bodyBold
    },
    label: {
        ...fonts.label
    },
    link: {
        ...fonts.body,
        textDecorationStyle: 'solid',
        color: colors.textLink
    },
});
