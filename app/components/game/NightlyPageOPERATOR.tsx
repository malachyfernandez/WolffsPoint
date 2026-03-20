import React, { useState, useEffect } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import Column from '../layout/Column';
import NightlyPlayerTable from './NightlyPlayerTable';
import NightlyDaysTable from './NightlyDaysTable';
import { UserTableItem } from 'types/playerTable';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from 'react-native';
import DaySelectionDialog from './DaySelectionDialog';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';
import { useUserList as useRoleList } from 'hooks/useUserList';
import { RoleTableItem } from 'types/roleTable';

interface NightlyPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const NightlyPageOPERATOR = ({ currentUserId, gameId }: NightlyPageOPERATORProps) => {
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

    // Shared user table (same as players tab)
    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const users = userTable?.value ?? [];

    // Nightly response list - tracks nightly responses per night
    const [nightlyResponseList, setNightlyResponseList] = useUserList<string[][]>({
        key: "nightlyResponseList",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    // Nightly messages list - tracks nightly messages per night
    const [nightlyMessagesList, setNightlyMessagesList] = useUserList<string[][]>({
        key: "nightlyMessagesList",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    // Shared selected day index (same as players tab)
    const [selectedDayIndex, setSelectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    // Shared number of real days per in-game day (same as players tab)
    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    // Shared day dates array (same as players tab)
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

    // Sync nightly lists when days are added
    useEffect(() => {
        if (nightlyResponseList.value.length < fixedDayDatesArray.length && nightlyResponseList.state.isSyncing === false) {
            const newResponses = [...nightlyResponseList.value];
            while (newResponses.length < fixedDayDatesArray.length) {
                newResponses.push(new Array(users.length).fill(""));
            }
            setNightlyResponseList(newResponses);
        }
    }, [fixedDayDatesArray.length, nightlyResponseList.value.length, users.length, nightlyResponseList.state.isSyncing]);

    useEffect(() => {
        if (nightlyMessagesList.value.length < fixedDayDatesArray.length && nightlyMessagesList.state.isSyncing === false) {
            const newMessages = [...nightlyMessagesList.value];
            while (newMessages.length < fixedDayDatesArray.length) {
                newMessages.push(new Array(users.length).fill(""));
            }
            setNightlyMessagesList(newMessages);
        }
    }, [fixedDayDatesArray.length, nightlyMessagesList.value.length, users.length, nightlyMessagesList.state.isSyncing]);

    // Sync nightly lists when users are added
    useEffect(() => {
        if (nightlyResponseList.state.isSyncing === false && nightlyMessagesList.state.isSyncing === false) {
            const updatedResponses = nightlyResponseList.value.map(dayResponses => {
                const updatedDayResponses = [...dayResponses];
                while (updatedDayResponses.length < users.length) {
                    updatedDayResponses.push("");
                }
                return updatedDayResponses;
            });
            
            const updatedMessages = nightlyMessagesList.value.map(dayMessages => {
                const updatedDayMessages = [...dayMessages];
                while (updatedDayMessages.length < users.length) {
                    updatedDayMessages.push("");
                }
                return updatedDayMessages;
            });

            if (JSON.stringify(updatedResponses) !== JSON.stringify(nightlyResponseList.value)) {
                setNightlyResponseList(updatedResponses);
            }
            if (JSON.stringify(updatedMessages) !== JSON.stringify(nightlyMessagesList.value)) {
                setNightlyMessagesList(updatedMessages);
            }
        }
    }, [users.length, nightlyResponseList.value, nightlyMessagesList.value, nightlyResponseList.state.isSyncing, nightlyMessagesList.state.isSyncing]);

    const addNewDay = () => {
        const currentDays = [...fixedDayDatesArray];
        const lastDate = currentDays[currentDays.length - 1];
        const newDate = new Date(lastDate);
        newDate.setDate(newDate.getDate() + numberOfRealDaysPerInGameDay.value);
        setFixedDayDatesArray([...currentDays, newDate]);

        // Snap to the newest day
        setSelectedDayIndex(currentDays.length);
    };

    const [doSync, setDoSync] = useState(false);
    const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);
    const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
    const [daysTableWidth, setDaysTableWidth] = useState(320); // default width
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const replaceDayDate = (index: number, replacementDate: Date) => {
        const currentDays = [...fixedDayDatesArray];
        if (index >= 0 && index < currentDays.length) {
            currentDays[index] = replacementDate;
            setFixedDayDatesArray(currentDays);
        }
    };

    // Update nightly response for a specific user on a specific day
    const updateNightlyResponse = (dayIndex: number, userIndex: number, value: string) => {
        const newResponses = [...nightlyResponseList.value];
        if (newResponses[dayIndex]) {
            newResponses[dayIndex][userIndex] = value;
            setNightlyResponseList(newResponses);
        }
    };

    // Update nightly message for a specific user on a specific day
    const updateNightlyMessage = (dayIndex: number, userIndex: number, value: string) => {
        const newMessages = [...nightlyMessagesList.value];
        if (newMessages[dayIndex]) {
            newMessages[dayIndex][userIndex] = value;
            setNightlyMessagesList(newMessages);
        }
    };

    // Update player living state (same as players tab)
    const updatePlayerLivingState = (userIndex: number, livingState: 'alive' | 'dead') => {
        const updatedUsers = [...users];
        if (updatedUsers[userIndex]) {
            updatedUsers[userIndex].playerData.livingState = livingState;
            setUserTable(updatedUsers);
            setDoSync(true);
        }
    };

    return (
        <Column>
            {users.length > 0 ? (
                <Column>
                    <ScrollShadow LinearGradientComponent={LinearGradient} color="#fdfbf6" className='mr-1 pt-1'>
                        <ScrollView horizontal={true} className='px-1 py-5'>
                            <Row>
                                <Column gap={1}>
                                    <Row className='h-6'>
                                        {/* spacer to align with days table */}
                                    </Row>
                                    <Row className={isPlayerTableBeingEdited ? 'z-50' : ''}>
                                        <NightlyPlayerTable
                                            gameId={gameId}
                                            doSync={doSync}
                                            setDoSync={setDoSync}
                                            isBeingEdited={isPlayerTableBeingEdited}
                                            setIsBeingEdited={setIsPlayerTableBeingEdited}
                                            dayDatesArray={fixedDayDatesArray}
                                            updatePlayerLivingState={updatePlayerLivingState}
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
                                                <AppButton variant="green" className='max-w-6 min-w-6 max-h-6 ml-1 rounded-full' onPress={addNewDay}>
                                                    <PoppinsText weight="bold" className='text-white'>+</PoppinsText>
                                                </AppButton>
                                            </Row>
                                        </ScrollView>
                                    </ScrollShadow>
                                    <Row className={`${isDaysTableBeingEdited ? 'z-10' : ''} w-min max-w-min`}>
                                        <NightlyDaysTable
                                            gameId={gameId}
                                            dayNumber={selectedDayIndex.value}
                                            isBeingEdited={isDaysTableBeingEdited}
                                            setIsBeingEdited={setIsDaysTableBeingEdited}
                                            onLayout={(event: any) => {
                                                const { width } = event.nativeEvent.layout;
                                                setDaysTableWidth(width);
                                            }}
                                            onWidthChange={(width: number) => {
                                                setDaysTableWidth(width);
                                            }}
                                            nightlyResponseList={nightlyResponseList.value}
                                            nightlyMessagesList={nightlyMessagesList.value}
                                            updateNightlyResponse={updateNightlyResponse}
                                            updateNightlyMessage={updateNightlyMessage}
                                        />
                                    </Row>
                                </Column>
                            </Row>
                        </ScrollView>
                    </ScrollShadow>

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
                </Column>
            ) : (
                <Row className='items-center justify-center'>
                    <PoppinsText weight='medium' className='text-center text-gray-500'>
                        No players available. Add players in the Players tab first.
                    </PoppinsText>
                </Row>
            )}
        </Column>
    );
};

export default NightlyPageOPERATOR;
