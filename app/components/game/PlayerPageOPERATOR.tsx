import React, { useState, useEffect } from 'react';
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
import { ScrollView, View } from 'react-native';
import DaySelectionDialog from './DaySelectionDialog';
import ChooseDayDialog from './ChooseDayDialog';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';
import AppDropdown from '../ui/forms/AppDropdown';
import { useUserList as useRoleList } from 'hooks/useUserList';
import { RoleTableItem } from 'types/roleTable';
import UserAddDialog from './UserAddDialog';






interface PlayerPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}


const PlayerPageOPERATOR = ({ currentUserId, gameId }: PlayerPageOPERATORProps) => {
    // Demo popover role picker
    const [demoRole, setDemoRole] = useState('');

    const [roleTable] = useRoleList<RoleTableItem[]>({
        key: "roleTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const demoRoleOptions = (roleTable?.value ?? [])
        .filter((roleItem) => roleItem.role.trim().length > 0 && roleItem.isVisible !== false)
        .map((roleItem) => ({
            value: roleItem.role,
            label: roleItem.role,
        }));

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

    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number | false>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: false,
    });

    const [isChooseDayDialogOpen, setIsChooseDayDialogOpen] = useState(false);

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

    // Clean setter that accepts Date[] and handles string conversion internally
    const setFixedDayDatesArray = (dates: Date[]) => {
        setDayDatesArray(dates.map(dateToStorageString));
    };


    useEffect(() => {
        if (dayDatesArray.value.length === 0 && dayDatesArray.state.isSyncing === false) {
            setFixedDayDatesArray([new Date()]);
        }
    }, [dayDatesArray, setFixedDayDatesArray]);

    const handleAddNewDay = () => {
        // setIsChooseDayDialogOpen(true);
        if (numberOfRealDaysPerInGameDay.value == false) {
            setIsChooseDayDialogOpen(true);
        } else {
            console.log('Adding new day with custom days per game day:', numberOfRealDaysPerInGameDay.value);
            addNewDay(numberOfRealDaysPerInGameDay.value)
        }
    };

    const addNewDay = (customDaysPerGameDay?: number) => {

        const currentDays = [...fixedDayDatesArray];
        const lastDate = currentDays[currentDays.length - 1];
        const newDate = new Date(lastDate);

        const daysToAdd = customDaysPerGameDay ?? numberOfRealDaysPerInGameDay.value;
        newDate.setDate(newDate.getDate() + daysToAdd);

        setFixedDayDatesArray([...currentDays, newDate]);

        // Sync the table to add the new day to all users
        setDoSync(true);

        // Snap to the newest day
        setSelectedDayIndex(currentDays.length);

    };







    const [doSync, setDoSync] = useState(false);
    const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);
    const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
    const [daysTableWidth, setDaysTableWidth] = useState(320); // default width
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);


    const replaceDayDate = (index: number, replacementDate: Date) => {
        const currentDays = [...fixedDayDatesArray];
        if (index >= 0 && index < currentDays.length) {
            currentDays[index] = replacementDate;
            setFixedDayDatesArray(currentDays);
        }
    };

    const addUser = (userData?: { realName: string; email: string; role: string }) => {
        // Generate random number between 1 and 1,000,000
        const randomId = Math.floor(Math.random() * 1000000) + 1;
        const newUser: UserTableItem = {
            realName: userData?.realName || "John Doe3",
            email: userData?.email || `player${randomId}@example.com`,
            userId: "NOT-JOINED",
            role: userData?.role || "player",
            playerData: { livingState: "alive", extraColumns: ["Testing"] },
            days: [{ vote: "", action: "", extraColumns: [""] }]
        };
        setUserTable([...users, newUser]);
        setDoSync(true);
    };

    const handleAddUser = (userData: { realName: string; email: string; role: string }) => {
        addUser(userData);
    };

    const HandleNewPlayer = () => {
        setIsAddUserDialogOpen(true);
    };



    return (
        <>

            <Column>
                {/* Demo HeroUI Popover Role Picker */}
                {/* <Column className='p-4 border-b border-subtle-border'>
                <PoppinsText weight='medium' className='mb-2'>Demo: Role Picker</PoppinsText>
                <AppDropdown
                    options={demoRoleOptions}
                    value={demoRole}
                    onValueChange={setDemoRole}
                    placeholder='Select a role'
                    emptyText='No roles available'
                />
            </Column> */}

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
                                        <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1 pr-1 max-w-min'>
                                            <ScrollView horizontal={true} className='px-1 m-0 h-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]' style={{ width: daysTableWidth }}>
                                                <Row className='h-6' gap={1}>
                                                    {fixedDayDatesArray.map((date, index) => (
                                                        selectedDayIndex.value === index ? (
                                                            <DaySelectionDialog
                                                                key={index}
                                                                isOpen={isDialogOpen}
                                                                onOpenChange={setIsDialogOpen}
                                                                index={index}
                                                                dayDate={date}
                                                                previousDate={index > 0 ? fixedDayDatesArray[index - 1] : new Date()}
                                                                followingDate={index < fixedDayDatesArray.length - 1 ? fixedDayDatesArray[index + 1] : undefined}
                                                                onPress={() => setSelectedDayIndex(index)}
                                                                replaceDayDate={replaceDayDate}
                                                            />
                                                        ) : (
                                                            <AppButton
                                                                key={index}
                                                                variant="grey"
                                                                className='w-16 max-h-6'
                                                                onPress={() => setSelectedDayIndex(index)}
                                                            >
                                                                <PoppinsText className='text-white'>{fixedDayDatesArray[index].getMonth() + 1}/{fixedDayDatesArray[index].getDate()}</PoppinsText>
                                                            </AppButton>
                                                        )
                                                    ))}
                                                    <AppButton variant="green" className='max-w-6 min-w-6 max-h-6 ml-1 rounded-full' onPress={handleAddNewDay}>
                                                        <PoppinsText weight="bold" className='text-white'>+</PoppinsText>
                                                    </AppButton>
                                                </Row>
                                            </ScrollView>
                                        </ScrollShadow>
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
                        <AppButton variant="black" className='w-40 h-8 ml-4 -mt-6' onPress={HandleNewPlayer}>
                            <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                            <PoppinsText weight='bold' className='text-white'>Add Player</PoppinsText>
                        </AppButton>

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
                    <Row className='items-center justify-center'>
                        <AppButton variant="black" className='w-40 h-8' onPress={HandleNewPlayer}>
                            <PoppinsText weight='bold' className='text-white text-xl'>+</PoppinsText>
                            <PoppinsText weight='bold' className='text-white'>Add Player</PoppinsText>
                        </AppButton>
                    </Row>
                )}





            </Column>

            <ChooseDayDialog
                isOpen={isChooseDayDialogOpen}
                onOpenChange={setIsChooseDayDialogOpen}
                gameId={gameId}
                addNewDay={addNewDay}
            />
            <UserAddDialog
                isOpen={isAddUserDialogOpen}
                onOpenChange={setIsAddUserDialogOpen}
                gameId={gameId}
                onAddUser={handleAddUser}
            />

        </>
    );
};

export default PlayerPageOPERATOR;

