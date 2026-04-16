import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tabs } from 'heroui-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
import NewspaperWritingView from './NewspaperWritingView';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperViewingHeader from './NewspaperViewingHeader';
import { useUserList } from 'hooks/useUserList';
import OperatorDayNavigation from '../ui/daySelector/OperatorDayNavigation';

interface NewspaperPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

type AnimationDirection = 'left' | 'right';

const NewspaperPageOPERATOR = ({ gameId }: NewspaperPageOPERATORProps) => {
    const [activeTab, setActiveTab] = useState('writing');
    const { width } = useWindowDimensions();

    // Get the current day key from shared state
    const [selectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    const [dayDatesArray] = useUserList<string[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    // Create a unique key for the newspaper based on the day index (not date)
    const getNewspaperKey = (dayIndex: number) => {
        return `day-${dayIndex}`;
    };

    const currentDayKey = getNewspaperKey(selectedDayIndex.value);
    

    // Animation state
    const slideDistance = useMemo(() => Math.min(Math.max(width * 0.12, 24), 72), [width]);
    const transitionDuration = 240;
    const [leavingDayIndex, setLeavingDayIndex] = useState<number | null>(null);
    const previousDayIndexRef = useRef<number | null>(null);
    const leavingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasInitializedSelectedDayRef = useRef(false);

    const enteringOpacity = useSharedValue(1);
    const enteringTranslateX = useSharedValue(0);
    const leavingOpacity = useSharedValue(1);
    const leavingTranslateX = useSharedValue(0);

    useEffect(() => {
        if (!hasInitializedSelectedDayRef.current && selectedDayIndex.value !== undefined) {
            hasInitializedSelectedDayRef.current = true;
            return;
        }
    }, [selectedDayIndex.value]);

    useEffect(() => {
        return () => {
            if (leavingTimeoutRef.current) {
                clearTimeout(leavingTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const previousDayIndex = previousDayIndexRef.current;

        if (previousDayIndex == null) {
            previousDayIndexRef.current = selectedDayIndex.value;
            enteringOpacity.value = 1;
            enteringTranslateX.value = 0;
            leavingOpacity.value = 0;
            leavingTranslateX.value = 0;
            return;
        }

        if (previousDayIndex === selectedDayIndex.value) {
            return;
        }

        if (leavingTimeoutRef.current) {
            clearTimeout(leavingTimeoutRef.current);
        }

        const direction: AnimationDirection = selectedDayIndex.value > previousDayIndex ? 'left' : 'right';
        const enteringStartX = direction === 'left' ? slideDistance : -slideDistance;
        const leavingEndX = direction === 'left' ? -slideDistance : slideDistance;

        setLeavingDayIndex(previousDayIndex);

        enteringOpacity.value = 0;
        enteringTranslateX.value = enteringStartX;
        leavingOpacity.value = 1;
        leavingTranslateX.value = 0;

        enteringOpacity.value = withTiming(1, { duration: transitionDuration });
        enteringTranslateX.value = withTiming(0, { duration: transitionDuration });
        leavingOpacity.value = withTiming(0, { duration: transitionDuration });
        leavingTranslateX.value = withTiming(leavingEndX, { duration: transitionDuration });

        leavingTimeoutRef.current = setTimeout(() => {
            setLeavingDayIndex(null);
        }, transitionDuration);

        previousDayIndexRef.current = selectedDayIndex.value;
    }, [enteringOpacity, enteringTranslateX, leavingOpacity, leavingTranslateX, selectedDayIndex.value, slideDistance]);

    const enteringStyle = useAnimatedStyle(() => {
        return {
            opacity: enteringOpacity.value,
            transform: [{ translateX: enteringTranslateX.value }],
        };
    });

    const leavingStyle = useAnimatedStyle(() => {
        return {
            opacity: leavingOpacity.value,
            transform: [{ translateX: leavingTranslateX.value }],
        };
    });

    return (
        <Column gap={4}>
            {/* Day Navigation Bar - Operator view with arrow navigation */}
            <View className='mt-2 -mb-2 w-full'>
                <OperatorDayNavigation gameId={gameId} />
            </View>

            {/* Header with BlurView and Tabs */}
            <View className='relative'>
                {/* <BlurView
                    intensity={20}
                    tint='light'
                    className='absolute top-0 left-0 right-0 h-full'
                /> */}
                <View className='relative'>
                    <Column className='p-4'>
                        <Tabs value={activeTab} onValueChange={setActiveTab} variant="secondary" className="flex-1" >
                            <Tabs.List>
                                <Tabs.Indicator />
                                <Tabs.Trigger value="writing">
                                    {({ isSelected }) => (
                                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                            Writing
                                        </Tabs.Label>
                                    )}
                                </Tabs.Trigger>
                                <Tabs.Trigger value="viewing">
                                    {({ isSelected }) => (
                                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                            Viewing
                                        </Tabs.Label>
                                    )}
                                </Tabs.Trigger>
                            </Tabs.List>
                        </Tabs>
                    </Column>
                </View>
            </View>

            {/* Content Area */}
            <Column className='max-w-[950px] w-full'>
                <View style={styles.animatedContentContainer}>
                    {leavingDayIndex != null ? (
                        <Animated.View
                            key={`leaving-${leavingDayIndex}`}
                            pointerEvents='none'
                            style={[styles.animatedContentOverlay, leavingStyle]}
                        >
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                                <Tabs.Content value="writing" className='flex-1'>
                                    <Column gap={4}>
                                        <NewspaperWritingView gameId={`${gameId}-${getNewspaperKey(leavingDayIndex)}`} />
                                    </Column>
                                </Tabs.Content>

                                <Tabs.Content value="viewing" className='flex-1'>
                                    <Column gap={4}>
                                        <NewspaperViewingHeader />
                                        <NewspaperViewingView itemId={`${gameId}-${getNewspaperKey(leavingDayIndex)}`} />
                                    </Column>
                                </Tabs.Content>
                            </Tabs>
                        </Animated.View>
                    ) : null}

                    <Animated.View key={`selected-${selectedDayIndex.value}`} style={enteringStyle}>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                            <Tabs.Content value="writing" className='flex-1'>
                                <Column gap={4}>
                                    <NewspaperWritingView gameId={`${gameId}-${currentDayKey}`} />
                                </Column>
                            </Tabs.Content>

                            <Tabs.Content value="viewing" className='flex-1'>
                                <Column gap={4}>
                                    <NewspaperViewingHeader />
                                    <NewspaperViewingView itemId={`${gameId}-${currentDayKey}`} />
                                </Column>
                            </Tabs.Content>
                        </Tabs>
                    </Animated.View>
                </View>
            </Column>
        </Column>
    );
};

const styles = StyleSheet.create({
    animatedContentContainer: {
        overflow: 'hidden',
        position: 'relative',
    },
    animatedContentOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
});

export default NewspaperPageOPERATOR;
