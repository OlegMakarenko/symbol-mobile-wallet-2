import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { borders, colors, spacings } from 'src/styles';
import { StyledText, TouchableNative } from 'src/components';
import { interleave } from 'src/utils';

const SCREEN_WIDTH = Dimensions.get('screen').width;

const BottomLine = props => {
    const { measures, scrollX } = props;
    const initialInputRange = measures.map((_, index) => Math.round(index * SCREEN_WIDTH));
    const initialOutputWidthRange = measures.map((measure) => Math.round(measure.width));
    const initialOutputLeftRange = measures.map((measure) => Math.round(measure.x));
    
    const inputRange = interleave(initialInputRange, (el, index) => {
        return (el + initialInputRange[index + 1]) / 2;
    })
    const outputWidthRange = interleave(initialOutputWidthRange, (el, index) => {
        return (el + initialOutputWidthRange[index + 1]) / 4;
    })
    const outputLeftRange = interleave(initialOutputLeftRange, (el, index) => {
        const middlePosition = (el + initialOutputLeftRange[index + 1]) / 2;
        const halfSize = (outputWidthRange[index + 1]) / 2;
        return middlePosition + halfSize;
    })

    const animatedBottomLine = useAnimatedStyle(() => ({
        width: interpolate(scrollX.value, inputRange, outputWidthRange),
        left: interpolate(scrollX.value, inputRange, outputLeftRange),
    }));
    const bottomLineStyle = [styles.bottomLine, animatedBottomLine];

    return <Animated.View style={bottomLineStyle} />;
}

export const TabView = props => {
    const { style, tabs } = props;
    const [tabsMeasures, setTabsMeasures] = useState([]);
    const scrollX = useSharedValue(0);
    const tabsContainerRef = useRef(null);
    const flatListRef = useRef(null);
    const tabsWithRef = useMemo(() => tabs.map(tab => ({...tab, ref: React.createRef()})), [tabs]);
    const isBottomLineShown = tabsMeasures.length > 1;

    const handleScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
    });
    const handleTabPress = index => {
        flatListRef.current.scrollToIndex({animated: true, index});
    };

    const getMeasures = () => setTimeout(() => {
        const measures = [];

        tabsWithRef.forEach(tab => {
            tab.ref.current.measureLayout(
                tabsContainerRef.current,
                (x, _, width) => {
                    measures.push({x, width});

                    if (measures.length === tabs.length) {
                        setTabsMeasures(measures);
                    }
                }
            )
        });
    });

    useEffect(() => {
        if (tabsContainerRef.current) {
            getMeasures();
        }
    }, [tabsContainerRef])

    return (
        <View style={style}>
            <View style={styles.tabsContainer} ref={tabsContainerRef}>
                {tabsWithRef.map((tab, index) => (
                    <TouchableNative key={'tab' + index} onPress={() => handleTabPress(index)}>
                        <View style={styles.tab} ref={tab.ref} >
                            <StyledText type="label">{tab.label}</StyledText>
                        </View>
                    </TouchableNative>
                ))}
                {isBottomLineShown && <BottomLine measures={tabsMeasures} scrollX={scrollX} />}
            </View>
            <Animated.FlatList
                data={tabs}
                keyExtractor={(item, index) => 'tab-content' + index}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                bounces={false}
                ref={flatListRef}
                renderItem={({item}) => (
                    <View style={styles.item}>
                        {item.content}
                    </View>
                )}
                onScroll={handleScroll}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    item: {
        width: SCREEN_WIDTH,
        height: 900
    },
    tabsContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        position: 'relative',
        backgroundColor: colors.bgActive,
        marginBottom: spacings.margin
    },
    tab: {
        height: spacings.controlHeight,
        paddingHorizontal: spacings.padding,
        justifyContent: 'center'
    },
    bottomLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 2,
        height: borders.borderWidth,
        backgroundColor: colors.primary,
        borderRadius: borders.borderWidth / 2,
    }
});
