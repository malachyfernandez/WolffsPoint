import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'heroui-native';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import LoadingContainer from '../ui/loading/LoadingContainer';
import NewspaperWritingView from './NewspaperWritingView';
import { useFindListItems, useListSet } from 'hooks/useData';
import { useGameOperatorUserId } from 'hooks/useGameOperatorUserId';
import { useSharedListValue } from 'hooks/useSharedListValue';
import OperatorDayNavigation from '../ui/daySelector/OperatorDayNavigation';
import NewspaperDayView from './NewspaperDayView';
import { useNewspaperDayOwner } from './useNewspaperDayOwner';
import { usePendingColumnOpen } from 'hooks/usePendingColumnOpen';
import { Usepaper } from 'types/usepaper';
import { NewspaperControlState, getNewspaperControlKey, getNewspaperDayControlItemId, getNewspaperDayItemId } from 'utils/newspaperControl';
import { hasNewspaperContent } from 'utils/newspaperSections';

interface NewspaperPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const NewspaperPageOPERATOR = ({ currentUserId, gameId }: NewspaperPageOPERATORProps) => {
    const [activeTab, setActiveTab] = useState<'writing' | 'viewing'>('viewing');
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
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
    const [readyDayKey, setReadyDayKey] = useState<string | null>(null);
    const selectedDayKey = `${selectedDayIndex}:${selectedDayOwner.ownerUserId}`;
    const handleSelectedDayReady = useCallback(() => {
        setReadyDayKey(selectedDayKey);
    }, [selectedDayKey]);

    const hasInitializedSelectedDayRef = useRef(false);
    const hasSeededSelectedDayRef = useRef(false);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const setOperatorSelectedDayIndex = useListSet<number>();
    const setNewspaperControl = useListSet<NewspaperControlState>();

    // Load the newser's draft so the operator can import it when they have control
    const newserDraftRecords = useFindListItems<Usepaper>('newspaper', {
        itemId: currentDayItemId,
        userIds: selectedDayOwner.validNewser?.userId ? [selectedDayOwner.validNewser.userId] : [''],
        returnTop: 1,
    });
    const newserDraft = hasNewspaperContent(newserDraftRecords?.[0]?.value)
        ? newserDraftRecords![0].value
        : null;
    const isNewserDraftLoading = newserDraftRecords === undefined;

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

    // Minimized column editors restore through here — the per-day writing
    // views unmount on day switches, so the request must live at page level.
    // Uses local setSelectedDayIndex only — handleSelectedDayIndexChange would
    // also write the shared selectedDayIndex user variable.
    const { pendingColumnOpen, requestColumnOpen, consumePendingColumnOpen } = usePendingColumnOpen(
        (dayIndex) => {
            setActiveTab('writing');
            setSelectedDayIndex(dayIndex);
        },
    );

    // Don't render any day navigation or content until data is loaded
    const isReady = isInitialLoadComplete;

    useEffect(() => {
        if (!hasInitializedSelectedDayRef.current && !isOperatorLoading && !isDayDatesLoading && !isSelectedDayLoading) {
            hasInitializedSelectedDayRef.current = true;
            setIsInitialLoadComplete(true);
        }
    }, [isDayDatesLoading, isOperatorLoading, isSelectedDayLoading, selectedDayIndex]);

    const handleTabChange = (value: string) => {
        if (value === 'writing' || value === 'viewing') {
            setActiveTab(value);
        }
    };

    const selectedOwnerUserId = selectedDayOwner.ownerUserId;
    const operatorHasControl = selectedOwnerUserId === currentUserId;

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
    }: {
        dayIndex: number;
        hasControl: boolean;
    }) => {
        const canAssignToNewser = Boolean(selectedDayOwner.validNewser?.userId);

        if (!hasControl) {
            return (
                <Column className='gap-4 items-center pt-48'>
                    <AppButton
                        variant='accent'
                        className='w-full sm:w-auto sm:min-w-65'
                        disabled={!selectedDayOwner.validNewser?.userId}
                        onPress={takeControl}
                    >
                        <FontText weight='medium' color='white'>Take control</FontText>
                    </AppButton>
                    <FontText variant='subtext' className='text-center max-w-105'>
                        {selectedDayOwner.validNewser?.email
                            ? `The Newser currently owns this day. Taking control lets you edit the newspaper directly.`
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
                        className='w-full sm:w-auto sm:min-w-65'
                        disabled={!canAssignToNewser}
                        onPress={giveBackControl}
                    >
                        <FontText weight='medium' color='white'>Give back control</FontText>
                    </AppButton>
                </Row>
                <NewspaperWritingView
                    gameId={getNewspaperDayItemId(gameId, dayIndex)}
                    dayIndex={dayIndex}
                    realGameId={gameId}
                    importSourceLabel='Newser'
                    importDraft={newserDraft}
                    isImportDraftLoading={isNewserDraftLoading}
                    onImportDraft={() => {}}
                    pendingColumnOpen={pendingColumnOpen}
                    onRequestColumnOpen={requestColumnOpen}
                    onConsumePendingColumnOpen={consumePendingColumnOpen}
                />
            </Column>
        );
    };

    const renderViewingContent = (dayIndex: number, ownerUserId: string, onReady?: () => void) => {
        return (
            // <View className='py-4 rounded-2xl' style={{
            //     // @ts-ignore: web-only CSS
            //     backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
            //     backgroundRepeat: 'repeat',
            //     backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
            // }}>
            <View>
                <NewspaperDayView gameId={gameId} dayIndex={dayIndex} ownerUserId={ownerUserId} onReady={onReady} />
            </View>
        );
    };

    return (
        <LoadingContainer
            dependencies={[isReady]}
            loadingText='Loading newspaper'
            className='min-h-190'
            keepMounted={false}
        >
        <Column className='gap-4 py-3'>
            <View className='mt-2 -mb-2 w-full'>
                <OperatorDayNavigation
                    gameId={gameId}
                    ownerUserId={operatorUserId}
                    selectedDayIndex={selectedDayIndex}
                    onSelectedDayIndexChange={(dayIndex) => {
                        // Manual navigation abandons any undelivered restore request
                        consumePendingColumnOpen();
                        handleSelectedDayIndexChange(dayIndex);
                    }}
                />
            </View>

            <View className='relative'>
                <View className='relative'>
                    <Column className='gap-4 py-3'>
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

            <Column className='gap-4 max-w-237.5 w-full self-center'>
                <View className='px-2 sm:px-0'>
                    <LayoutStateAnimatedView.Container stateVar={String(selectedDayIndex)} highPerformance>
                        <LayoutStateAnimatedView.OptionContainer page={selectedDayIndex} pushInAnimation={fromRight}>
                            <LayoutStateAnimatedView.Option
                                stateValue={String(selectedDayIndex)}
                                isReady={!selectedDayOwner.isLoading && (activeTab === 'writing' || readyDayKey === selectedDayKey)}
                            >
                                {selectedDayOwner.isLoading ? (
                                    <Column className='items-center justify-center py-24'>
                                        <FontText variant='subtext'>Loading newspaper…</FontText>
                                    </Column>
                                ) : (
                                    <Tabs value={activeTab} onValueChange={handleTabChange} className='flex-1'>
                                        <Tabs.Content value='viewing' className='flex-1'>
                                            {renderViewingContent(selectedDayIndex, selectedOwnerUserId, handleSelectedDayReady)}
                                        </Tabs.Content>
                                        <Tabs.Content value='writing' className='flex-1'>
                                            {renderOperatorWritingContent({
                                                dayIndex: selectedDayIndex,
                                                hasControl: operatorHasControl,
                                            })}
                                        </Tabs.Content>
                                    </Tabs>
                                )}
                            </LayoutStateAnimatedView.Option>
                        </LayoutStateAnimatedView.OptionContainer>
                    </LayoutStateAnimatedView.Container>
                </View>
            </Column>
        </Column>
        </LoadingContainer>
    );
};

export default NewspaperPageOPERATOR;
