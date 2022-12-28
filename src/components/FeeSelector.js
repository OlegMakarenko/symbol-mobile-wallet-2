import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Slider from 'react-native-smooth-slider';
import { FormItem } from 'src/components';
import { $t } from 'src/localization';
import { borders, colors, fonts, spacings } from 'src/styles';
import { useToggle } from 'src/utils';

const images = [
    require('src/assets/images/fees-slow-3.png'),
    require('src/assets/images/fees-medium-3.png'),
    require('src/assets/images/fees-fast-3.png'),
];

export const FeeSelector = props => {
    const { style, title, fees, ticker, value, onChange } = props;
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [sliderKey, refreshSlider] = useToggle(true);
    const imageTranslation = useSharedValue(0);
    const minimumSliderValue = 0;
    const maximumSliderValue = 2;
    const sliderValue = value < fees.medium 
        ? 0
        : value < fees.fast
        ? 1
        : 2;
    const imageSrc = images[sliderValue];

    const options = [{
        label: $t('selector_fee_slow'),
        value: fees.slow
    },{
        label: $t('selector_fee_medium'),
        value: fees.medium
    },{
        label: $t('selector_fee_fast'),
        value: fees.fast
    }]

    const selectedFeeLabel = `${options[sliderValue].label} ${value} ${ticker}`;
    const modalTitle = options[sliderValue].label;

    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [{
            translateX: imageTranslation.value
        }]
    }));

    const handleChange = newValue => {
        const newSliderValue = Math.round(newValue);
        onChange(options[newSliderValue]?.value || 0)
        if (newSliderValue !== sliderValue) {
            imageTranslation.value = -500;
            imageTranslation.value = withTiming(0);
        }
    };
    const showModal = () => setIsModalVisible(true);
    const hideModal = () => setIsModalVisible(false);
    const handleSlidingComplete = () => {
        hideModal();
        refreshSlider();
    }

    return (
        <View style={[styles.root, style]}>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.value}>{selectedFeeLabel}</Text>
            </View>
            <Slider
                value={sliderValue}
                minimumValue={minimumSliderValue}
                maximumValue={maximumSliderValue}
                minimumTrackTintColor={colors.transparent}
                maximumTrackTintColor={colors.transparent}
                style={styles.slider}
                trackStyle={styles.track}
                thumbStyle={styles.thumb}
                thumbTouchSize={{width: 60, height: 60}}
                useNativeDriver={true}
                key={sliderKey}
                onValueChange={handleChange}
                onSlidingStart={showModal}
                onSlidingComplete={handleSlidingComplete}
            />
            <Modal animationType="fade" transparent visible={isModalVisible} style={styles.modal}>
                {isModalVisible && (
                    <View style={styles.modal}>
                        <FormItem>
                            <Animated.Image source={imageSrc} style={[animatedImageStyle, styles.modalImage]} />
                        </FormItem>
                        <FormItem>
                            <Text style={styles.modalTitle}>{modalTitle}</Text>
                            <Text style={styles.modalValue}>{value} {ticker}</Text>
                        </FormItem>
                    </View>
                )}
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        height: spacings.controlHeight,
        borderTopLeftRadius: borders.borderRadius,
        borderTopRightRadius: borders.borderRadius,
        borderWidth: borders.borderWidth,
        borderBottomColor: colors.controlBaseStroke,
        backgroundColor: colors.controlBaseBg,
    },
    textContainer: {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: spacings.margin,
    },
    title: {
        ...fonts.placeholder,
        color: colors.controlBasePlaceholder,
        marginTop: -fonts.placeholder.fontSize / 2,
    },
    value: {
        ...fonts.textBox, 
        color: colors.controlBaseText,
    },
    slider: {
        marginTop: -18,
        marginHorizontal: spacings.padding
    },
    track: {
        height: borders.borderWidth
    },
    thumb: {
        backgroundColor: colors.textBody,
        borderWidth: borders.borderWidth,
        borderColor: colors.controlBaseStroke
    },
    modal: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        backgroundColor: '#000c',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacings.padding,
    },
    modalImage: {
        width: 272,
        height: 85
    },
    modalTitle: {
        ...fonts.title, 
        color: colors.controlBaseText,
        textAlign: 'center'
    },
    modalValue: {
        ...fonts.label, 
        color: colors.controlBaseText,
        textAlign: 'center'
    },
});