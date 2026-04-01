import React, { useState, useEffect } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import PlayerTable from './PlayerTable';
import { UserTableItem } from 'types/playerTable';
import Row from '../layout/Row';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from 'react-native';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';
import PlayerAddUserSection from './PlayerAddUserSection';
import ComprehensiveDaySelector from '../ui/daySelector/ComprehensiveDaySelector';
import DaysTable from './DaysTable';






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

    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const users = userTable?.value ?? [];

    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number | false>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: false,
    });

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

    // Get selected day index for DaysTable
    const [selectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });



    return (
        <>

            <Column>


                {users.length > 0 ? (
                    <Column>

                        <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1 pt-1'>
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
                                                isBeingEdited={isDaysTableBeingEdited}
                                                setIsBeingEdited={setIsDaysTableBeingEdited}
                                                onLayout={(event) => {
                                                    const { width } = event.nativeEvent.layout;
                                                    setDaysTableWidth(width);
                                                }}
                                                onWidthChange={(width) => {
                                                    setDaysTableWidth(width);
                                                }}
                                            />
                                        </Row>
                                    </Column>
                                </Row>

                            </ScrollView>
                            {/* </Row> */}

                        </ScrollShadow>
                        <PlayerAddUserSection gameId={gameId} />

                        {numberOfRealDaysPerInGameDay.value !== false && (
                            <Row className="items-center pt-8 mt-4 border-t border-subtle-border">
                                <PoppinsText weight='medium'>Days per game day</PoppinsText>
                                <PoppinsNumberInput
                                    value={numberOfRealDaysPerInGameDay.value}
                                    onChangeText={(displayValue, isValid, numericValue) => {
                                        if (isValid && numericValue !== null) {
                                            setNumberOfRealDaysPerInGameDay(numericValue);
                                        }
                                    }}
                                    minValue={1}
                                    maxValue={30}
                                    inline={true}
                                    useDefaultStyling={true}
                                />
                            </Row>
                        )}
                    </Column>
                ) : (

                    // <PoppinsText>Hellow</PoppinsText>
                    <PlayerAddUserSection gameId={gameId} removeBottomSpace />
                )}





            </Column>

        </>
    );
};

export default PlayerPageOPERATOR;

