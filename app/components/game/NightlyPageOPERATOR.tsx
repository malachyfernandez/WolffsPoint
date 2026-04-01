import React, { useState, useEffect } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import { useUserList } from 'hooks/useUserList';
import { useUserVariable } from 'hooks/useUserVariable';
import { useUserVariableGet } from 'hooks/useUserVariableGet';
import Column from '../layout/Column';
import NightlyPlayerTable from './NightlyPlayerTable';
import NightlyDaysTable from './NightlyDaysTable';
import { UserTableItem } from 'types/playerTable';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from 'react-native';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';
import { useUserList as useRoleList } from 'hooks/useUserList';
import { RoleTableItem } from 'types/roleTable';
import ComprehensiveDaySelector from '../ui/daySelector/ComprehensiveDaySelector';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import NightlyCertificationDialog from './NightlyCertificationDialog';
import { defaultGameSchedule, getGameScopedKey } from '../../../utils/multiplayer';
import { GameSchedule, PlayerNightSubmission } from '../../../types/multiplayer';

interface NightlyPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const NightlyPageOPERATOR = ({ currentUserId, gameId }: NightlyPageOPERATORProps) => {
    const [isCertificationDialogOpen, setIsCertificationDialogOpen] = useState(false);
    const [gameSchedule, setGameSchedule] = useUserVariable<GameSchedule>({
        key: getGameScopedKey('gameSchedule', gameId),
        defaultValue: defaultGameSchedule,
        privacy: 'PUBLIC',
    });

    const [roleTable] = useRoleList<RoleTableItem[]>({
        key: "roleTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    // Shared user table (same as players tab)
    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const users = userTable?.value ?? [];

    // Nightly response list - tracks nightly responses per night per email
    const [nightlyResponseList, setNightlyResponseList] = useUserList<Record<string, string[]>>({
        key: "nightlyResponseList",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: {},
    });

    // Nightly messages list - tracks nightly messages per night per email
    const [nightlyMessagesList, setNightlyMessagesList] = useUserList<Record<string, string[]>>({
        key: "nightlyMessagesList",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: {},
    });

    // Shared selected day index (same as players tab)
    const [selectedDayIndex] = useUserList<number>({
        key: "selectedDayIndex",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 0,
    });

    const submissionRecords = useUserVariableGet<PlayerNightSubmission>({
        key: getGameScopedKey(`playerNightSubmission-day-${selectedDayIndex.value}`, gameId),
        returnTop: 200,
    });

    const submissionsByEmail = Object.fromEntries(
        (submissionRecords ?? [])
            .filter((record) => record.value.playerEmail.trim().length > 0)
            .map((record) => [record.value.playerEmail, record.value])
    ) as Record<string, PlayerNightSubmission>;

    const voteCount = users.filter((user) => (submissionsByEmail[user.email]?.vote ?? '').trim().length > 0).length;
    const actionCount = users.filter((user) => (submissionsByEmail[user.email]?.action ?? '').trim().length > 0).length;

    // Shared number of real days per in-game day (same as players tab)
    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number>({
        key: "numberOfRealDaysPerInGameDay",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: 2,
    });

    // Shared day dates array (same as players tab)
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

    // Sync nightly lists when days are added
    useEffect(() => {
        if (nightlyResponseList.state.isSyncing === false && nightlyMessagesList.state.isSyncing === false) {
            const currentResponses = nightlyResponseList.value || {};
            const currentMessages = nightlyMessagesList.value || {};
            
            // Ensure all users have entries for each day
            const updatedResponses = { ...currentResponses };
            const updatedMessages = { ...currentMessages };
            
            users.forEach(user => {
                if (!updatedResponses[user.email]) {
                    updatedResponses[user.email] = new Array(fixedDayDatesArray.length).fill("");
                } else {
                    // Ensure the user has enough days
                    const userResponses = [...updatedResponses[user.email]];
                    while (userResponses.length < fixedDayDatesArray.length) {
                        userResponses.push("");
                    }
                    updatedResponses[user.email] = userResponses;
                }
                
                if (!updatedMessages[user.email]) {
                    updatedMessages[user.email] = new Array(fixedDayDatesArray.length).fill("");
                } else {
                    // Ensure the user has enough days
                    const userMessages = [...updatedMessages[user.email]];
                    while (userMessages.length < fixedDayDatesArray.length) {
                        userMessages.push("");
                    }
                    updatedMessages[user.email] = userMessages;
                }
            });
            
            // Update if changed
            if (JSON.stringify(updatedResponses) !== JSON.stringify(currentResponses)) {
                setNightlyResponseList(updatedResponses);
            }
            if (JSON.stringify(updatedMessages) !== JSON.stringify(currentMessages)) {
                setNightlyMessagesList(updatedMessages);
            }
        }
    }, [fixedDayDatesArray.length, users.length, nightlyResponseList.state.isSyncing, nightlyMessagesList.state.isSyncing]);

    const [doSync, setDoSync] = useState(false);
    const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);
    const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
    const [daysTableWidth, setDaysTableWidth] = useState(320); // default width

    // Update nightly response for a specific user on a specific day
    const updateNightlyResponse = (dayIndex: number, userIndex: number, value: string) => {
        const user = users[userIndex];
        if (!user) return;
        
        const currentResponses = nightlyResponseList.value || {};
        const updatedResponses = { ...currentResponses };
        
        if (!updatedResponses[user.email]) {
            updatedResponses[user.email] = new Array(fixedDayDatesArray.length).fill("");
        }
        
        const userResponses = [...updatedResponses[user.email]];
        userResponses[dayIndex] = value;
        updatedResponses[user.email] = userResponses;
        
        setNightlyResponseList(updatedResponses);
    };

    // Update nightly message for a specific user on a specific day
    const updateNightlyMessage = (dayIndex: number, userIndex: number, value: string) => {
        const user = users[userIndex];
        if (!user) return;
        
        const currentMessages = nightlyMessagesList.value || {};
        const updatedMessages = { ...currentMessages };
        
        if (!updatedMessages[user.email]) {
            updatedMessages[user.email] = new Array(fixedDayDatesArray.length).fill("");
        }
        
        const userMessages = [...updatedMessages[user.email]];
        userMessages[dayIndex] = value;
        updatedMessages[user.email] = userMessages;
        
        setNightlyMessagesList(updatedMessages);
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

    const certifySubmissions = () => {
        const certifiedUsers = users.map((user) => {
            const submission = submissionsByEmail[user.email];
            const nextDays = [...(user.days ?? [])];

            while (nextDays.length <= selectedDayIndex.value) {
                nextDays.push({});
            }

            if (submission) {
                nextDays[selectedDayIndex.value] = {
                    ...nextDays[selectedDayIndex.value],
                    vote: submission.vote,
                    action: submission.action,
                };
            }

            return {
                ...user,
                days: nextDays,
            };
        });

        setUserTable(certifiedUsers);
        setDoSync(true);
    };

    return (
        <Column>
            {users.length > 0 ? (
                <Column>
                    <Row className='justify-between items-center mb-4'>
                        <Column gap={0}>
                            <PoppinsText weight='medium'>Player submissions</PoppinsText>
                            <PoppinsText varient='subtext'>{voteCount}/{users.length} voted, {actionCount}/{users.length} submitted actions</PoppinsText>
                        </Column>
                        <AppButton variant='black' className='w-48' onPress={() => setIsCertificationDialogOpen(true)}>
                            <PoppinsText weight='medium' color='white'>Review / Certify</PoppinsText>
                        </AppButton>
                    </Row>

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
                                    <View style={{ width: daysTableWidth }}>
                                        <ComprehensiveDaySelector
                                            gameId={gameId}
                                        />
                                    </View>
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
                                            nightlyResponseList={nightlyResponseList.value || {}}
                                            nightlyMessagesList={nightlyMessagesList.value || {}}
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

                    <Column className='mt-6 rounded-xl border border-subtle-border bg-white p-4' gap={3}>
                        <PoppinsText weight='medium'>Nightly schedule</PoppinsText>
                        <Column gap={1}>
                            <PoppinsText varient='subtext'>Action / vote deadline</PoppinsText>
                            <PoppinsTextInput
                                className='w-40 border border-subtle-border p-3'
                                value={gameSchedule.value.nightlyDeadlineTime}
                                onChangeText={(value) => setGameSchedule({
                                    ...gameSchedule.value,
                                    nightlyDeadlineTime: value,
                                })}
                                placeholder='22:00'
                            />
                        </Column>
                        <Column gap={1}>
                            <PoppinsText varient='subtext'>Nightly response release time</PoppinsText>
                            <PoppinsTextInput
                                className='w-40 border border-subtle-border p-3'
                                value={gameSchedule.value.nightlyResponseReleaseTime}
                                onChangeText={(value) => setGameSchedule({
                                    ...gameSchedule.value,
                                    nightlyResponseReleaseTime: value,
                                })}
                                placeholder='23:00'
                            />
                        </Column>
                    </Column>

                    <NightlyCertificationDialog
                        isOpen={isCertificationDialogOpen}
                        onOpenChange={setIsCertificationDialogOpen}
                        users={users}
                        submissionsByEmail={submissionsByEmail}
                        onCertify={certifySubmissions}
                    />
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
