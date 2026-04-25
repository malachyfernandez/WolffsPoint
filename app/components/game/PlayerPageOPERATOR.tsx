import React, { useState, useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useList } from 'hooks/useData';
import Column from '../layout/Column';
import PlayerTable from './PlayerTable';
import { UserTableItem } from 'types/playerTable';
import Row from '../layout/Row';
import ShadowScrollView from '../ui/ShadowScrollView';
import { View } from 'react-native';
import PlayerAddUserSection from './PlayerAddUserSection';
import DownloadPlayerDataButton from './DownloadPlayerDataButton';
import ComprehensiveDaySelector from '../ui/daySelector/ComprehensiveDaySelector';
import DaysTable from './DaysTable';
import LoadingText from '../ui/loading/LoadingText';






interface PlayerPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}


const PlayerPageOPERATOR = ({ currentUserId, gameId }: PlayerPageOPERATORProps) => {
    // const [startingDate] = useUserList({
    //     key: "startingDate",
    //     itemId: gameId,
    //     privacy: "PUBLIC",
    //     defaultValue: "Unset",
    // });

    const [userTable] = useList<UserTableItem[]>("userTable", gameId);

    const users = userTable?.value ?? [];

    // Get day dates for PlayerTable
    const [dayDatesArray] = useList<string[]>("dayDatesArray", gameId);

    // Convert stored MM/DD/YYYY strings back to real Date objects for UI use
    const fixedDayDatesArray = dayDatesArray.value.map(dateStr => {
        const [month, day, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    });

    const [doSync, setDoSync] = useState(false);
    const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);
    const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
    const [daysTableWidth, setDaysTableWidth] = useState(320); // default width
    const [isPlayerTableColumnsReady, setIsPlayerTableColumnsReady] = useState(false);
    const [isDaysTableColumnsReady, setIsDaysTableColumnsReady] = useState(false);

    // Get selected day index for DaysTable
    const [selectedDayIndex] = useList<number>("selectedDayIndex", gameId);

    // Track when all data is loaded before showing table with fade-in
    const isSyncing = userTable?.state?.isSyncing
        || selectedDayIndex?.state?.isSyncing
        || dayDatesArray?.state?.isSyncing;
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

    useEffect(() => {
        if (!isSyncing && !hasInitiallyLoaded) {
            setHasInitiallyLoaded(true);
        }
    }, [isSyncing, hasInitiallyLoaded]);

    const areAllColumnsReady = users.length === 0 || (isPlayerTableColumnsReady && isDaysTableColumnsReady);
    const showLoading = isSyncing || !hasInitiallyLoaded || !areAllColumnsReady;

    return (
        <>
            {showLoading && (
                <Column className='gap-4 min-h-[760px] items-center justify-center'>
                    <LoadingText text='Loading players' />
                </Column>
            )}
            <Animated.View entering={FadeIn.duration(300)} className={`min-h-[760px] ${showLoading ? 'opacity-0' : ''}`}>


                {users.length > 0 ? (
                    <Column className='gap-4 py-3 sm:px-4'>

                        <ShadowScrollView direction='horizontal' className='mr-1 pt-1' scrollViewClassName='px-1 py-5' horizontal>
                            <Row className='gap-4'>
                                <Column className='gap-1'>
                                    <Row className='gap-4 h-9'>
                                        {/* spacer to align with days table */}
                                    </Row>
                                    <Row className={`gap-4 ${isPlayerTableBeingEdited ? 'z-50' : ''}`.trim()}>
                                        <PlayerTable
                                            gameId={gameId}
                                            doSync={doSync}
                                            setDoSync={setDoSync}
                                            isBeingEdited={isPlayerTableBeingEdited}
                                            setIsBeingEdited={setIsPlayerTableBeingEdited}
                                            dayDatesArray={fixedDayDatesArray}
                                            onColumnsReady={setIsPlayerTableColumnsReady}
                                        />
                                    </Row>
                                </Column>
                                <Column className='gap-0'>
                                    <View className='' style={{ width: daysTableWidth }}>
                                        <ComprehensiveDaySelector
                                            gameId={gameId}
                                            showAddButton={true}
                                        />
                                    </View>
                                    <Row className={`${isDaysTableBeingEdited ? 'z-10 ' : ''}gap-4 w-min max-w-min`}>
                                        <DaysTable
                                            gameId={gameId}
                                            dayNumber={selectedDayIndex.value}
                                            dayCount={fixedDayDatesArray.length}
                                            isBeingEdited={isDaysTableBeingEdited}
                                            setIsBeingEdited={setIsDaysTableBeingEdited}
                                            onLayout={(event) => {
                                                const { width } = event.nativeEvent.layout;
                                                setDaysTableWidth(width);
                                            }}
                                            onWidthChange={(width) => {
                                                setDaysTableWidth(width);
                                            }}
                                            onColumnsReady={setIsDaysTableColumnsReady}
                                        />
                                    </Row>
                                </Column>
                            </Row>

                        </ShadowScrollView>
                        <PlayerAddUserSection gameId={gameId} />
                        <DownloadPlayerDataButton gameId={gameId} />
                    </Column>
                ) : (

                    // <FontText>Hellow</FontText>
                    <Column className='py-3 sm:px-4'>
                        <PlayerAddUserSection gameId={gameId} removeBottomSpace />
                    </Column>
                )}
            </Animated.View>
        </>
    );
};

export default PlayerPageOPERATOR;
