import React, { useState, useEffect } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import PlayerTable from './PlayerTable';
import { UserTableItem } from 'types/playerTable';
import Row from '../layout/Row';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView } from 'react-native';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';
import PlayerDaysSection from './PlayerDaysSection';
import PlayerAddUserSection from './PlayerAddUserSection';






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

    const [dayDatesArray, setDayDatesArray] = useUserList<string[]>({
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

    // Helper: convert Date to MM/DD/YYYY string
    const dateToStorageString = (date: Date): string => {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    useEffect(() => {
        if (dayDatesArray.value.length === 0 && dayDatesArray.state.isSyncing === false) {
            setDayDatesArray([dateToStorageString(new Date())]);
        }
    }, [dayDatesArray.value.length, dayDatesArray.state.isSyncing, setDayDatesArray]);

    const addNewDay = (customDaysPerGameDay?: number) => {

        const currentDays = [...fixedDayDatesArray];
        const lastDate = currentDays[currentDays.length - 1];
        const newDate = new Date(lastDate);

        const daysToAdd = customDaysPerGameDay ?? numberOfRealDaysPerInGameDay.value;
        if (typeof daysToAdd === 'number') {
            newDate.setDate(newDate.getDate() + daysToAdd);
        }

        setDayDatesArray([...currentDays, newDate].map(dateToStorageString));

        // Sync the table to add the new day to all users
        setDoSync(true);

    };







    const [doSync, setDoSync] = useState(false);
    const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);



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
                                    <PlayerDaysSection
                                        gameId={gameId}
                                        addNewDay={addNewDay}
                                    />
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
                    <PlayerAddUserSection gameId={gameId} />
                )}





            </Column>

        </>
    );
};

export default PlayerPageOPERATOR;

