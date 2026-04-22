import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs } from 'heroui-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Column from '../layout/Column';
import NewspaperWritingView from './NewspaperWritingView';
import OperatorDayNavigation from '../ui/daySelector/OperatorDayNavigation';
import NewspaperDayView from './NewspaperDayView';
import FontText from '../ui/text/FontText';
import PlaceholderCard from '../ui/PlaceholderCard';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { getNewspaperDayItemId } from '../../../utils/newspaperControl';
import { useNewspaperDayOwner } from './useNewspaperDayOwner';
import { Newspaper } from 'lucide-react-native';

interface NewspaperPageNEWSERProps {
    currentUserId: string;
    gameId: string;
}

type AnimationDirection = 'left' | 'right';

const TILE_SIZE = 600;

const NewspaperPageNEWSER = ({ currentUserId, gameId }: NewspaperPageNEWSERProps) => {
    const [activeTab, setActiveTab] = useState<'writing' | 'viewing'>('writing');
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const { width } = useWindowDimensions();
    const { operatorUserId, isLoading: isOperatorLoading } = useGameOperatorUserId(gameId);
    const { value: operatorDayDates, isLoading: isDayDatesLoading } = useSharedListValue<string[]>({
        key: 'dayDatesArray',
        itemId: gameId,
        defaultValue: [],
        userIds: operatorUserId ? [operatorUserId] : undefined,
    });
    const { value: operatorSelectedDayIndex, isLoading: isSelectedDayLoading } = useSharedListValue<number>({
        key: 'selectedDayIndex',
        itemId: gameId,
        defaultValue: 0,
        userIds: operatorUserId ? [operatorUserId] : undefined,
    });

    const totalDays = operatorDayDates.length;
    const [leavingDayIndex, setLeavingDayIndex] = useState<number | null>(null);
    const previousDayIndexRef = useRef<number | null>(null);
    const leavingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasInitializedSelectedDayRef = useRef(false);
    const hasSeededSelectedDayRef = useRef(false);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

    const selectedDayOwner = useNewspaperDayOwner({
        gameId,
        dayIndex: selectedDayIndex,
    });
    const leavingDayOwner = useNewspaperDayOwner({
        gameId,
        dayIndex: leavingDayIndex ?? 0,
        disabled: leavingDayIndex === null,
    });
    const currentDayItemId = getNewspaperDayItemId(gameId, selectedDayIndex);

    const slideDistance = useMemo(() => Math.min(Math.max(width * 0.12, 24), 72), [width]);
    const transitionDuration = 240;

    const enteringOpacity = useSharedValue(1);
    const enteringTranslateX = useSharedValue(0);
    const leavingOpacity = useSharedValue(1);
    const leavingTranslateX = useSharedValue(0);

    useEffect(() => {
        if (isOperatorLoading || isDayDatesLoading || isSelectedDayLoading) {
            return;
        }

        const maxDayIndex = Math.max(totalDays - 1, 0);
        if (!hasSeededSelectedDayRef.current) {
            hasSeededSelectedDayRef.current = true;
            setSelectedDayIndex(Math.min(operatorSelectedDayIndex, maxDayIndex));
            return;
        }

        setSelectedDayIndex((currentValue) => Math.min(currentValue, maxDayIndex));
    }, [isDayDatesLoading, isOperatorLoading, isSelectedDayLoading, operatorSelectedDayIndex, totalDays]);

    useEffect(() => {
        if (!hasInitializedSelectedDayRef.current && !isOperatorLoading && !isDayDatesLoading && !isSelectedDayLoading) {
            hasInitializedSelectedDayRef.current = true;
            previousDayIndexRef.current = selectedDayIndex;
            setIsInitialLoadComplete(true);
        }
    }, [isDayDatesLoading, isOperatorLoading, isSelectedDayLoading, selectedDayIndex]);

    useEffect(() => {
        return () => {
            if (leavingTimeoutRef.current) {
                clearTimeout(leavingTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isInitialLoadComplete) {
            return;
        }

        const previousDayIndex = previousDayIndexRef.current;

        if (previousDayIndex == null) {
            previousDayIndexRef.current = selectedDayIndex;
            enteringOpacity.value = 1;
            enteringTranslateX.value = 0;
            leavingOpacity.value = 0;
            leavingTranslateX.value = 0;
            return;
        }

        if (previousDayIndex === selectedDayIndex) {
            return;
        }

        if (leavingTimeoutRef.current) {
            clearTimeout(leavingTimeoutRef.current);
        }

        const direction: AnimationDirection = selectedDayIndex > previousDayIndex ? 'left' : 'right';
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

        previousDayIndexRef.current = selectedDayIndex;
    }, [enteringOpacity, enteringTranslateX, isInitialLoadComplete, leavingOpacity, leavingTranslateX, selectedDayIndex, slideDistance]);

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

    const handleTabChange = (value: string) => {
        if (value === 'writing' || value === 'viewing') {
            setActiveTab(value);
        }
    };

    const isOwnershipLoading = selectedDayOwner.isLoading || (leavingDayIndex !== null && leavingDayOwner.isLoading);
    const isReady = isInitialLoadComplete && !isOwnershipLoading;

    const renderViewingContent = (dayIndex: number, ownerUserId: string, isLeaving: boolean = false) => {
        return (
            // <View className='py-4 rounded-2xl' style={{
            //     // @ts-ignore: web-only CSS
            //     backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
            //     backgroundRepeat: 'repeat',
            //     backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
            // }}>
                <NewspaperDayView gameId={gameId} dayIndex={dayIndex} ownerUserId={ownerUserId} isLeaving={isLeaving} />
            // </View>
        );
    };

    if (!isReady) {
        return (
            <Column className='gap-4 min-h-[760px] items-center justify-center'>
                <FontText variant='subtext'>Loading newspaper…</FontText>
            </Column>
        );
    }

    return (
        <Column className='gap-4 py-3'>
            <View className='mt-2 -mb-2 w-full'>
                <OperatorDayNavigation
                    gameId={gameId}
                    ownerUserId={operatorUserId}
                    selectedDayIndex={selectedDayIndex}
                    onSelectedDayIndexChange={setSelectedDayIndex}
                />
            </View>

            <View className='relative'>
                <View className='relative'>
                    <Column className='gap-4 px-2 py-3'>
                        <Tabs value={activeTab} onValueChange={handleTabChange} variant='secondary' className='flex-1'>
                            <Tabs.List>
                                <Tabs.Indicator />
                                <Tabs.Trigger value='viewing'>
                                    {({ isSelected }) => (
                                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                            Viewing
                                        </Tabs.Label>
                                    )}
                                </Tabs.Trigger>
                                <Tabs.Trigger value='writing'>
                                    {({ isSelected }) => (
                                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                            Writing
                                        </Tabs.Label>
                                    )}
                                </Tabs.Trigger>
                            </Tabs.List>
                        </Tabs>
                    </Column>
                </View>
            </View>

            <Column className='gap-4 max-w-[950px] w-full self-center'>
                <View style={styles.animatedContentContainer}>
                    {leavingDayIndex != null ? (
                        <Animated.View
                            key={`leaving-${leavingDayIndex}`}
                            pointerEvents='none'
                            style={[styles.animatedContentOverlay, leavingStyle]}
                        >
                            <Tabs value={activeTab} onValueChange={handleTabChange} className='flex-1'>
                                <Tabs.Content value='viewing' className='flex-1'>
                                    {renderViewingContent(leavingDayIndex, leavingDayOwner.ownerUserId, true)}
                                </Tabs.Content>
                                <Tabs.Content value='writing' className='flex-1'>
                                    {currentUserId === leavingDayOwner.ownerUserId ? (
                                        <NewspaperWritingView gameId={getNewspaperDayItemId(gameId, leavingDayIndex)} />
                                    ) : (
                                        <PlaceholderCard>
                                            <Column className='gap-3 items-center'>
                                                <Newspaper size={48} color='rgb(46, 41, 37)' />
                                                <FontText weight='bold' className='text-xl text-center'>
                                                    Editing locked
                                                </FontText>
                                                <FontText variant='subtext' className='text-center'>
                                                    You do not have control of today's newspaper.
                                                </FontText>
                                            </Column>
                                        </PlaceholderCard>
                                    )}
                                </Tabs.Content>
                            </Tabs>
                        </Animated.View>
                    ) : null}

                    <Animated.View entering={isInitialLoadComplete ? FadeIn.duration(300) : undefined} key={`selected-${selectedDayIndex}`} style={enteringStyle}>
                        <Tabs value={activeTab} onValueChange={handleTabChange} className='flex-1'>
                            <Tabs.Content value='viewing' className='flex-1'>
                                {renderViewingContent(selectedDayIndex, selectedDayOwner.ownerUserId)}
                            </Tabs.Content>
                            <Tabs.Content value='writing' className='flex-1'>
                                {currentUserId === selectedDayOwner.ownerUserId ? (
                                    <NewspaperWritingView gameId={currentDayItemId} />
                                ) : (
                                    <PlaceholderCard>
                                        <Column className='gap-3 items-center'>
                                            <Newspaper size={48} color='rgb(46, 41, 37)' />
                                            <FontText weight='bold' className='text-xl text-center'>
                                                Editing locked
                                            </FontText>
                                            <FontText variant='subtext' className='text-center'>
                                                You do not have control of today's newspaper.
                                            </FontText>
                                        </Column>
                                    </PlaceholderCard>
                                )}
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

export default NewspaperPageNEWSER;
