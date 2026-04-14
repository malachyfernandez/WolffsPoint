import React, { useEffect, useMemo, useRef, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { PlayerProfile } from '../../../types/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { UserTableItem } from '../../../types/playerTable';
import { getContextualDayRangeLabel, getCurrentPlayableDayIndex, parseStoredDayDates } from '../../../utils/multiplayer';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import YourEyesOnlyDayContentPLAYER from './YourEyesOnlyDayContentPLAYER';

interface YourEyesOnlyPagePLAYERProps {
    gameId: string;
    currentEmail: string;
    matchingPlayer: UserTableItem;
    currentProfile: PlayerProfile;
}

type AnimationDirection = 'left' | 'right';

const YourEyesOnlyPagePLAYER = ({ gameId, currentEmail, matchingPlayer, currentProfile }: YourEyesOnlyPagePLAYERProps) => {
    const { value: dayDateStrings } = useSharedListValue<string[]>({ key: 'dayDatesArray', itemId: gameId, defaultValue: [] });
    const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({ key: 'numberOfRealDaysPerInGameDay', itemId: gameId, defaultValue: 2 });
    const roleTable = useSharedListValue<RoleTableItem[]>({ key: 'roleTable', itemId: gameId, defaultValue: [] });
    const { width } = useWindowDimensions();

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(currentDayIndex);
    const selectedDayRangeLabel = useMemo(() => getContextualDayRangeLabel(dayDates, selectedDayIndex, numberOfRealDaysPerInGameDay), [selectedDayIndex, dayDates, numberOfRealDaysPerInGameDay]);
    const previousDayLabel = useMemo(() => selectedDayIndex > 0 ? getContextualDayRangeLabel(dayDates, selectedDayIndex - 1, numberOfRealDaysPerInGameDay) : '', [dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]);
    const nextDayLabel = useMemo(() => selectedDayIndex < currentDayIndex ? getContextualDayRangeLabel(dayDates, selectedDayIndex + 1, numberOfRealDaysPerInGameDay) : '', [currentDayIndex, dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]);
    const roleData = roleTable.value.find((roleItem) => roleItem.role === matchingPlayer.role);
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
        if (!hasInitializedSelectedDayRef.current && dayDates.length > 0) {
            hasInitializedSelectedDayRef.current = true;
            setSelectedDayIndex(currentDayIndex);
            return;
        }

        setSelectedDayIndex((currentValue) => Math.min(currentValue, currentDayIndex));
    }, [currentDayIndex, dayDates.length]);

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
    }, [enteringOpacity, enteringTranslateX, leavingOpacity, leavingTranslateX, selectedDayIndex, slideDistance]);

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
        <Column className='pb-8' gap={7}>
            <Column gap={4}>
                {roleData?.aboutRole?.trim().length ? (
                    <MarkdownRenderer
                        markdown={roleData.aboutRole}
                        textAlign='center'
                        viewHeightImages={30}
                    />
                ) : (
                    <Column className='items-center py-6'>
                        <PoppinsText varient='subtext'>The operator has not written this role&apos;s about section yet.</PoppinsText>
                    </Column>
                )}
            </Column>

            <Column className='border-y border-border/15 py-5' gap={5}>
                <Row className='items-start justify-between gap-4'>
                    <Pressable
                        onPress={() => {
                            if (selectedDayIndex > 0) {
                                setSelectedDayIndex(selectedDayIndex - 1);
                            }
                        }}
                        disabled={selectedDayIndex <= 0}
                        className={`w-20 items-center ${selectedDayIndex <= 0 ? 'opacity-30' : ''}`}
                    >
                        <ChevronLeft size={28} color='rgb(46, 41, 37)' />
                        <PoppinsText varient='subtext' className='text-center text-xs'>
                            {previousDayLabel || ' '}
                        </PoppinsText>
                    </Pressable>

                    <Column className='flex-1 items-center pt-1' gap={1}>
                        <PoppinsText weight='medium' className='text-center'>
                            {selectedDayRangeLabel || 'Current game day'}
                        </PoppinsText>
                        <PoppinsText varient='subtext' className='text-xs text-center'>
                            Day {selectedDayIndex + 1}
                        </PoppinsText>
                    </Column>

                    <Pressable
                        onPress={() => {
                            if (selectedDayIndex < currentDayIndex) {
                                setSelectedDayIndex(selectedDayIndex + 1);
                            }
                        }}
                        disabled={selectedDayIndex >= currentDayIndex}
                        className={`w-20 items-center ${selectedDayIndex >= currentDayIndex ? 'opacity-30' : ''}`}
                    >
                        <ChevronRight size={28} color='rgb(46, 41, 37)' />
                        <PoppinsText varient='subtext' className='text-center text-xs'>
                            {nextDayLabel || ' '}
                        </PoppinsText>
                    </Pressable>
                </Row>

                <View style={styles.animatedContentContainer}>
                    {leavingDayIndex != null ? (
                        <Animated.View
                            key={`leaving-${leavingDayIndex}`}
                            pointerEvents='none'
                            style={[styles.animatedContentOverlay, leavingStyle]}
                        >
                            <YourEyesOnlyDayContentPLAYER
                                gameId={gameId}
                                currentEmail={currentEmail}
                                currentUserId={currentProfile.userId}
                                dayIndex={leavingDayIndex}
                            />
                        </Animated.View>
                    ) : null}

                    <Animated.View key={`selected-${selectedDayIndex}`} style={enteringStyle}>
                        <YourEyesOnlyDayContentPLAYER
                            gameId={gameId}
                            currentEmail={currentEmail}
                            currentUserId={currentProfile.userId}
                            dayIndex={selectedDayIndex}
                        />
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

export default YourEyesOnlyPagePLAYER;
