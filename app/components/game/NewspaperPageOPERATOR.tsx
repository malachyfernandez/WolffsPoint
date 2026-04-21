import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs } from 'heroui-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import NewspaperWritingView from './NewspaperWritingView';
import { useUserList } from 'hooks/useUserList';
import { useUserListGet } from 'hooks/useUserListGet';
import { useUserListSet } from 'hooks/useUserListSet';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import OperatorDayNavigation from '../ui/daySelector/OperatorDayNavigation';
import NewspaperDayView from './NewspaperDayView';
import { Usepaper } from '../../../types/usepaper';
import { useNewspaperDayOwner } from './useNewspaperDayOwner';
import { NewspaperControlState, getNewspaperControlKey, getNewspaperDayControlItemId, getNewspaperDayItemId } from '../../../utils/newspaperControl';

interface NewspaperPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

type AnimationDirection = 'left' | 'right';

// Configurable tile size for the paper background texture (in pixels)
const TILE_SIZE = 600;
const minimumUsepaper: Usepaper = {
    columns: ['', ''],
};

const NewspaperPageOPERATOR = ({ currentUserId, gameId }: NewspaperPageOPERATORProps) => {
    const [activeTab, setActiveTab] = useState<'writing' | 'viewing'>('viewing');
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const { width } = useWindowDimensions();
    const { operatorUserId, isLoading: isOperatorLoading } = useGameOperatorUserId(gameId);

    // Get operator's day dates to know how many days are available
    const { value: operatorDayDates, isLoading: isDayDatesLoading } = useSharedListValue<string[]>({
        key: 'dayDatesArray',
        itemId: gameId,
        defaultValue: [],
        userIds: operatorUserId ? [operatorUserId] : undefined,
    });

    // Get operator's selected day index to seed local state
    const { value: operatorSelectedDayIndex, isLoading: isSelectedDayLoading } = useSharedListValue<number>({
        key: 'selectedDayIndex',
        itemId: gameId,
        defaultValue: 0,
        userIds: operatorUserId ? [operatorUserId] : undefined,
    });

    const totalDays = operatorDayDates.length;
    const currentDayItemId = getNewspaperDayItemId(gameId, selectedDayIndex);
    const selectedDayOwner = useNewspaperDayOwner({
        gameId,
        dayIndex: selectedDayIndex,
    });

    // Animation state
    const slideDistance = useMemo(() => Math.min(Math.max(width * 0.12, 24), 72), [width]);
    const transitionDuration = 240;
    const [leavingDayIndex, setLeavingDayIndex] = useState<number | null>(null);
    const previousDayIndexRef = useRef<number | null>(null);
    const leavingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasInitializedSelectedDayRef = useRef(false);
    const hasSeededSelectedDayRef = useRef(false);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const leavingDayOwner = useNewspaperDayOwner({
        gameId,
        dayIndex: leavingDayIndex ?? 0,
        disabled: leavingDayIndex === null,
    });
    const [, setOperatorUsepaper] = useUserList<Usepaper>({
        key: 'usepaper',
        itemId: currentDayItemId,
        privacy: 'PUBLIC',
        defaultValue: minimumUsepaper,
    });
    const setOperatorSelectedDayIndex = useUserListSet<number>();
    const setNewspaperControl = useUserListSet<NewspaperControlState>();
    const selectedNewserUsepaper = useUserListGet<Usepaper>({
        key: 'usepaper',
        itemId: currentDayItemId,
        userIds: selectedDayOwner.validNewser?.userId ? [selectedDayOwner.validNewser.userId] : [''],
        returnTop: 1,
    });

    const enteringOpacity = useSharedValue(1);
    const enteringTranslateX = useSharedValue(0);
    const leavingOpacity = useSharedValue(1);
    const leavingTranslateX = useSharedValue(0);

    // Seed local selected day from operator's stored value
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

    // Write selected day back to operator's data
    const handleSelectedDayIndexChange = (dayIndex: number) => {
        setSelectedDayIndex(dayIndex);
        // Also write to operator's user list so newser can read it
        void setOperatorSelectedDayIndex({
            key: 'selectedDayIndex',
            itemId: gameId,
            value: dayIndex,
            privacy: 'PUBLIC',
        });
    };

    // Don't render any day navigation or content until data is loaded
    const isOwnershipLoading = selectedDayOwner.isLoading || (leavingDayIndex !== null && leavingDayOwner.isLoading);
    const isReady = isInitialLoadComplete && !isOwnershipLoading;

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
        // Don't animate until initial load is complete
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
    }, [enteringOpacity, enteringTranslateX, leavingOpacity, leavingTranslateX, isInitialLoadComplete, selectedDayIndex, slideDistance]);

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

    const selectedOwnerUserId = selectedDayOwner.ownerUserId;
    const leavingOwnerUserId = leavingDayOwner.ownerUserId;
    const operatorHasControl = selectedOwnerUserId === currentUserId;
    const selectedNewserUsepaperValue = selectedNewserUsepaper?.[0]?.value?.columns?.length
        ? selectedNewserUsepaper[0].value
        : minimumUsepaper;

    const writeControlState = (ownerType: 'newser' | 'operator', ownerUserId: string) => {
        return setNewspaperControl({
            key: getNewspaperControlKey(gameId),
            itemId: getNewspaperDayControlItemId(selectedDayIndex),
            value: {
                ownerType,
                ownerUserId,
                newserUserId: selectedDayOwner.validNewser?.userId ?? '',
                newserEmail: selectedDayOwner.validNewser?.email ?? '',
                updatedAt: Date.now(),
            },
            privacy: 'PUBLIC',
        });
    };

    const takeControl = () => {
        setOperatorUsepaper(selectedNewserUsepaperValue);
        void writeControlState('operator', currentUserId);
    };

    const giveBackControl = () => {
        if (!selectedDayOwner.validNewser?.userId) {
            return;
        }

        void writeControlState('newser', selectedDayOwner.validNewser.userId);
    };

    const renderOperatorWritingContent = ({
        dayIndex,
        hasControl,
        isLeaving = false,
    }: {
        dayIndex: number;
        hasControl: boolean;
        isLeaving?: boolean;
    }) => {
        const canAssignToNewser = Boolean(selectedDayOwner.validNewser?.userId);

        if (!hasControl) {
            return (
                <Column className='gap-4 min-h-[760px] items-center justify-center px-4'>
                    <AppButton
                        variant='accent'
                        className='min-w-[260px]'
                        disabled={!selectedDayOwner.validNewser?.userId}
                        onPress={takeControl}
                    >
                        <FontText weight='medium' color='white'>Take control</FontText>
                    </AppButton>
                    <FontText variant='subtext' className='text-center max-w-[420px]'>
                        {selectedDayOwner.validNewser?.email
                            ? `The Newser currently owns this day. Taking control copies their current draft into the operator newspaper for Day ${dayIndex + 1}.`
                            : 'Assign a Newser in Config before using the shared newspaper-control flow.'}
                    </FontText>
                </Column>
            );
        }

        return (
            <Column className='gap-4'>
                <Row className='gap-4 justify-center py-2'>
                    <AppButton
                        variant='accent'
                        className='min-w-[260px]'
                        disabled={!canAssignToNewser || isLeaving}
                        onPress={giveBackControl}
                    >
                        <FontText weight='medium' color='white'>Give back control</FontText>
                    </AppButton>
                </Row>
                <NewspaperWritingView gameId={getNewspaperDayItemId(gameId, dayIndex)} />
            </Column>
        );
    };

    const renderViewingContent = (dayIndex: number, ownerUserId: string, isLeaving: boolean = false) => {
        return (
            <View className='py-4 rounded-2xl' style={{
                // @ts-ignore: web-only CSS
                backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
                backgroundRepeat: 'repeat',
                backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
            }}>
                <NewspaperDayView gameId={gameId} dayIndex={dayIndex} ownerUserId={ownerUserId} isLeaving={isLeaving} />
            </View>
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
        <Column className='gap-4'>
            <View className='mt-2 -mb-2 w-full'>
                <OperatorDayNavigation
                    gameId={gameId}
                    ownerUserId={operatorUserId}
                    selectedDayIndex={selectedDayIndex}
                    onSelectedDayIndexChange={handleSelectedDayIndexChange}
                />
            </View>

            <View className='relative'>
                <View className='relative'>
                    <Column className='gap-4 p-4'>
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

            <Column className='gap-4 max-w-[950px] w-full'>
                <View style={styles.animatedContentContainer}>
                    {leavingDayIndex != null ? (
                        <Animated.View
                            key={`leaving-${leavingDayIndex}`}
                            pointerEvents='none'
                            style={[styles.animatedContentOverlay, leavingStyle]}
                        >
                            <Tabs value={activeTab} onValueChange={handleTabChange} className='flex-1'>
                                <Tabs.Content value='viewing' className='flex-1'>
                                    {renderViewingContent(leavingDayIndex, leavingOwnerUserId, true)}
                                </Tabs.Content>
                                <Tabs.Content value='writing' className='flex-1'>
                                    {renderOperatorWritingContent({
                                        dayIndex: leavingDayIndex,
                                        hasControl: leavingOwnerUserId === currentUserId,
                                        isLeaving: true,
                                    })}
                                </Tabs.Content>
                            </Tabs>
                        </Animated.View>
                    ) : null}

                    <Animated.View entering={isInitialLoadComplete ? FadeIn.duration(300) : undefined} key={`selected-${selectedDayIndex}`} style={enteringStyle}>
                        <Tabs value={activeTab} onValueChange={handleTabChange} className='flex-1'>
                            <Tabs.Content value='viewing' className='flex-1'>
                                {renderViewingContent(selectedDayIndex, selectedOwnerUserId)}
                            </Tabs.Content>
                            <Tabs.Content value='writing' className='flex-1'>
                                {renderOperatorWritingContent({
                                    dayIndex: selectedDayIndex,
                                    hasControl: operatorHasControl,
                                })}
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
