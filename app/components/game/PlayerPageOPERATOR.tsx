import React, { useState, useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import PlayerTable from './PlayerTable';
import { UserTableItem } from 'types/playerTable';
import Row from '../layout/Row';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from 'react-native';
import PlayerAddUserSection from './PlayerAddUserSection';
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

    const [userTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const users = userTable?.value ?? [];

    // Get day dates for PlayerTable
    const [dayDatesArray] = useUserList<string[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

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
    const [selectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

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

    const areAllColumnsReady = isPlayerTableColumnsReady && isDaysTableColumnsReady;
    const showLoading = isSyncing || !hasInitiallyLoaded || !areAllColumnsReady;

    return (
        <>
            {showLoading && (
                <Column className='min-h-[760px] items-center justify-center'>
                    <LoadingText text='Loading players' />
                </Column>
            )}
            <Animated.View entering={FadeIn.duration(300)} className={`min-h-[760px] ${showLoading ? 'opacity-0' : ''}`}>


                {users.length > 0 ? (
                    <Column>

                        <ScrollShadow LinearGradientComponent={LinearGradient} className='mr-1 pt-1'>
                            {/* <Row > */}
                            <ScrollView horizontal={true} className='px-1 py-5'>
                                <Row>
                                    <Column gap={1}>
                                        <Row className='h-6'>
                                            {/* spacer to align with days table */}
                                        </Row>
                                        <Row className={isPlayerTableBeingEdited ? 'z-50' : ''}>
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
                                    <Column gap={1}>
                                        <View className='' style={{ width: daysTableWidth }}>
                                            <ComprehensiveDaySelector
                                                gameId={gameId}
                                            />
                                        </View>
                                        <Row className={`${isDaysTableBeingEdited ? 'z-10' : ''} w-min max-w-min`}>
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

                            </ScrollView>
                            {/* </Row> */}

                        </ScrollShadow>
                        <PlayerAddUserSection gameId={gameId} />
                    </Column>
                ) : (

                    // <PoppinsText>Hellow</PoppinsText>
                    <PlayerAddUserSection gameId={gameId} removeBottomSpace />
                )}
            </Animated.View>
        </>
    );
};

export default PlayerPageOPERATOR;
