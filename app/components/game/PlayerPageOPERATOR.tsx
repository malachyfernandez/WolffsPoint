import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import PlayerTable from './PlayerTable';
import DaysTable from './DaysTable';
import { UserTableItem } from 'types/playerTable';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView } from 'react-native';






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


    const [selectedDayIndex, setSelectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    const [dayDatesArray, setDayDatesArray] = useUserList<Date[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    // Initialize dayDatesArray with today's date if empty
    React.useEffect(() => {
        if (dayDatesArray.value.length === 0) {
            setDayDatesArray([new Date()]);
        }
    }, [dayDatesArray.value.length, setDayDatesArray]);

    const addNewDay = () => {
        const currentDays = [...dayDatesArray.value];
        const lastDate = currentDays[currentDays.length - 1];
        const newDate = new Date(lastDate);
        newDate.setDate(newDate.getDate() + numberOfRealDaysPerInGameDay.value);
        setDayDatesArray([...currentDays, newDate]);
    };





    const [doSync, setDoSync] = useState(false);
    const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);
    const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
    const [daysTableWidth, setDaysTableWidth] = useState(320); // default width


    const addUser = () => {
        const newUser: UserTableItem = {
            realName: "John Doe3",
            email: "john.doe@example.com",
            userId: "NOT-JOINED",
            role: "player",
            playerData: { livingState: "alive", extraColumns: ["Testing"] },
            days: [{ vote: "", action: "", extraColumns: [""] }]
        };
        setUserTable([...users, newUser]);
        setDoSync(true);
    };





    return (


        <Column>
            {/* if startingDate.value === "Unset" show dialog */}

            <>
                {/* <PoppinsText>startingDate: {startingDate.value}</PoppinsText> */}
                {/*<PoppinsText>realDaysPerInGameDay: {realDaysPerInGameDay.value}</PoppinsText>
                    <ChangeDateInfo gameId={gameId} isGettingStarted={false} /> */}

                <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1'>
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
                                    />
                                </Row>
                            </Column>
                            <Column gap={1}>
                                <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1 pr-1 max-w-min'>
                                    <ScrollView horizontal={true} className='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' style={{ width: daysTableWidth }}>
                                        <Row className='h-6' gap={1}>
                                            {dayDatesArray.value.map((date, index) => (
                                                <AppButton
                                                    key={index}
                                                    variant={selectedDayIndex.value === index ? "black" : "grey"}
                                                    className='w-16 max-h-6'
                                                    onPress={() => setSelectedDayIndex(index)}
                                                >
                                                    <PoppinsText className='text-white'>Day {index}</PoppinsText>
                                                </AppButton>
                                            ))}
                                            <AppButton variant="green" className='max-w-6 min-w-6 max-h-6 ml-1 rounded-full' onPress={addNewDay}>
                                                <PoppinsText weight="bold" className='text-white'>+</PoppinsText>
                                            </AppButton>
                                        </Row>
                                    </ScrollView>
                                </ScrollShadow>
                                <Row className={`${isDaysTableBeingEdited ? 'z-10' : '' } w-min max-w-min`}>
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
                <AppButton variant="black" className='w-40 h-8 ml-4 -mt-6' onPress={addUser}>
                    <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                    <PoppinsText weight='bold' className='text-white'>Add Player</PoppinsText>
                </AppButton>

                <PoppinsText>isPlayerTableBeingEdited: {isPlayerTableBeingEdited.toString()}</PoppinsText>
                <PoppinsText>isDaysTableBeingEdited: {isDaysTableBeingEdited.toString()}</PoppinsText>
            </>

        </Column>
    );
};

export default PlayerPageOPERATOR;
function syncAllColumnsToTitles() {
    throw new Error('Function not implemented.');
}

