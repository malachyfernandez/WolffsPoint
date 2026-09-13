import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'heroui-native';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import Column from '../layout/Column';
import LoadingContainer from '../ui/loading/LoadingContainer';
import NewspaperWritingView from './NewspaperWritingView';
import OperatorDayNavigation from '../ui/daySelector/OperatorDayNavigation';
import NewspaperDayView from './NewspaperDayView';
import FontText from '../ui/text/FontText';
import PlaceholderCard from '../ui/PlaceholderCard';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useFindListItems, useValue } from 'hooks/useData';
import { getNewspaperDayItemId, getNewserAcceptedKey, NewserAccepted } from '../../../utils/newspaperControl';
import { useNewspaperDayOwner } from './useNewspaperDayOwner';
import { Usepaper } from '../../../types/usepaper';
import { Newspaper } from 'lucide-react-native';
import { hasNewspaperContent } from '../../../utils/newspaperSections';

interface NewspaperPageNEWSERProps {
    currentUserId: string;
    currentEmail: string;
    gameId: string;
}

const NewspaperPageNEWSER = ({ currentUserId, currentEmail, gameId }: NewspaperPageNEWSERProps) => {
    const [activeTab, setActiveTab] = useState<'writing' | 'viewing'>('writing');
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
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
    const hasInitializedSelectedDayRef = useRef(false);
    const hasSeededSelectedDayRef = useRef(false);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

    const selectedDayOwner = useNewspaperDayOwner({
        gameId,
        dayIndex: selectedDayIndex,
    });
    const [readyDayKey, setReadyDayKey] = useState<string | null>(null);
    const selectedDayKey = `${selectedDayIndex}:${selectedDayOwner.ownerUserId}`;
    const handleSelectedDayReady = useCallback(() => {
        setReadyDayKey(selectedDayKey);
    }, [selectedDayKey]);
    const currentDayItemId = getNewspaperDayItemId(gameId, selectedDayIndex);

    // Load the operator's draft so the newser can import it when they have control
    const operatorDraftRecords = useFindListItems<Usepaper>('newspaper', {
        itemId: currentDayItemId,
        userIds: operatorUserId ? [operatorUserId] : [''],
        returnTop: 1,
    });
    const operatorDraft = hasNewspaperContent(operatorDraftRecords?.[0]?.value)
        ? operatorDraftRecords![0].value
        : null;
    const isOperatorDraftLoading = operatorDraftRecords === undefined;

    // Write a "newser accepted" record under the newser's own userId so the
    // operator can discover the newser's userId even when the operator's
    // userData query doesn't include the newser's record. The newser writes
    // this; the operator reads it via useFindValues in useNewspaperDayOwner.
    const [accepted, setAccepted] = useValue<NewserAccepted>(getNewserAcceptedKey(gameId), {
        defaultValue: { email: '', userId: '', gameId, acceptedAt: 0 },
        privacy: 'PUBLIC',
    });

    useEffect(() => {
        if (!currentEmail || !currentUserId) {
            return;
        }

        const current = accepted.value;
        if (
            current.email === currentEmail
            && current.userId === currentUserId
            && current.gameId === gameId
        ) {
            return;
        }

        setAccepted({
            email: currentEmail,
            userId: currentUserId,
            gameId,
            acceptedAt: Date.now(),
        });
    }, [accepted, currentEmail, currentUserId, gameId, setAccepted]);

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
            setIsInitialLoadComplete(true);
        }
    }, [isDayDatesLoading, isOperatorLoading, isSelectedDayLoading, selectedDayIndex]);

    const handleTabChange = (value: string) => {
        if (value === 'writing' || value === 'viewing') {
            setActiveTab(value);
        }
    };

    const isReady = isInitialLoadComplete;

    const renderViewingContent = (dayIndex: number, ownerUserId: string, onReady?: () => void) => {
        return (
            // <View className='py-4 rounded-2xl' style={{
            //     // @ts-ignore: web-only CSS
            //     backgroundImage: "url('https://d9tic9wqq4.ufs.sh/f/e3bq9j1bOXyi6QFuqBSV3IcVxmF4QjUoPvCOdS2HLawpi0Ey')",
            //     backgroundRepeat: 'repeat',
            //     backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
            // }}>
                <NewspaperDayView gameId={gameId} dayIndex={dayIndex} ownerUserId={ownerUserId} onReady={onReady} />
            // </View>
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

            <Column className='gap-4 max-w-237.5 w-full self-center'>
                <View className='px-2 sm:px-0'>
                    <LayoutStateAnimatedView.Container stateVar={String(selectedDayIndex)} highPerformance>
                        <LayoutStateAnimatedView.OptionContainer page={selectedDayIndex} pushInAnimation={fromRight}>
                            <LayoutStateAnimatedView.Option
                                stateValue={String(selectedDayIndex)}
                                isReady={!selectedDayOwner.isLoading && (activeTab === 'writing' || readyDayKey === selectedDayKey)}
                            >
                                {selectedDayOwner.isLoading ? (
                                    <Column className='min-h-190 items-center justify-center'>
                                        <FontText variant='subtext'>Loading newspaper…</FontText>
                                    </Column>
                                ) : (
                                    <Tabs value={activeTab} onValueChange={handleTabChange} className='flex-1'>
                                        <Tabs.Content value='viewing' className='flex-1'>
                                            {renderViewingContent(selectedDayIndex, selectedDayOwner.ownerUserId, handleSelectedDayReady)}
                                        </Tabs.Content>
                                        <Tabs.Content value='writing' className='flex-1'>
                                            {currentUserId === selectedDayOwner.ownerUserId ? (
                                                <NewspaperWritingView
                                                    gameId={currentDayItemId}
                                                    realGameId={gameId}
                                                    importSourceLabel='Operator'
                                                    importDraft={operatorDraft}
                                                    isImportDraftLoading={isOperatorDraftLoading}
                                                    onImportDraft={() => {}}
                                                />
                                            ) : (
                                                <PlaceholderCard>
                                                    <Column className='gap-3 items-center'>
                                                        <Newspaper size={48} color='rgb(46, 41, 37)' />
                                                        <FontText weight='bold' className='text-xl text-center'>
                                                            Editing locked
                                                        </FontText>
                                                        <FontText variant='subtext' className='text-center'>
                                                            You do not have control of today’s newspaper.
                                                        </FontText>
                                                    </Column>
                                                </PlaceholderCard>
                                            )}
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

export default NewspaperPageNEWSER;
