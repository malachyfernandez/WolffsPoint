import React, { useState, useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import { useUserList } from 'hooks/useUserList';
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
import ComprehensiveDaySelector from '../ui/daySelector/ComprehensiveDaySelector';
import NightlyCertificationDialog from './NightlyCertificationDialog';
import { getGameScopedKey, hasPlayerActionContent } from '../../../utils/multiplayer';
import { PlayerNightSubmission } from '../../../types/multiplayer';

interface NightlyPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const NightlyPageOPERATOR = ({ currentUserId: _currentUserId, gameId }: NightlyPageOPERATORProps) => {
    const [isCertificationDialogOpen, setIsCertificationDialogOpen] = useState(false);

    // Shared user table (same as players tab)
    const [userTable, setUserTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const users = userTable?.value ?? [];

    const [morningMessagesList, setMorningMessagesList] = useUserList<Record<string, string[]>>({
        key: "morningMessagesList",
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
    const actionCount = users.filter((user) => hasPlayerActionContent(submissionsByEmail[user.email]?.action)).length;

    // Shared day dates array (same as players tab)
    const [dayDatesArray] = useUserList<string[]>({
        key: "dayDatesArray",
        itemId: gameId,
        privacy: "PUBLIC",
        defaultValue: [],
    });

    // Track when all data is loaded before showing table with fade-in
    const isSyncing = userTable?.state?.isSyncing 
        || morningMessagesList?.state?.isSyncing 
        || selectedDayIndex?.state?.isSyncing
        || dayDatesArray?.state?.isSyncing
        || submissionRecords === undefined;
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

    useEffect(() => {
        if (!isSyncing && !hasInitiallyLoaded) {
            setHasInitiallyLoaded(true);
        }
    }, [isSyncing, hasInitiallyLoaded]);

    // Convert stored MM/DD/YYYY strings back to real Date objects for UI use
    const fixedDayDatesArray = dayDatesArray.value.map(dateStr => {
        const [month, day, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    });

    useEffect(() => {
        if (morningMessagesList.state.isSyncing === false) {
            const currentMessages = morningMessagesList.value || {};
            
            const updatedMessages = { ...currentMessages };
            
            users.forEach(user => {
                if (!updatedMessages[user.email]) {
                    updatedMessages[user.email] = new Array(fixedDayDatesArray.length).fill("");
                } else {
                    const userMessages = [...updatedMessages[user.email]];
                    while (userMessages.length < fixedDayDatesArray.length) {
                        userMessages.push("");
                    }
                    updatedMessages[user.email] = userMessages;
                }
            });
            
            if (JSON.stringify(updatedMessages) !== JSON.stringify(currentMessages)) {
                setMorningMessagesList(updatedMessages);
            }
        }
    }, [fixedDayDatesArray.length, users.length, morningMessagesList.state.isSyncing]);

    const [doSync, setDoSync] = useState(false);
    const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);
    const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
    const [daysTableWidth, setDaysTableWidth] = useState(320); // default width
    const [isPlayerTableColumnsReady, setIsPlayerTableColumnsReady] = useState(false);
    const [isDaysTableColumnsReady, setIsDaysTableColumnsReady] = useState(false);

    const updateMorningMessage = (dayIndex: number, userIndex: number, value: string) => {
        const user = users[userIndex];
        if (!user) return;
        
        const currentMessages = morningMessagesList.value || {};
        const updatedMessages = { ...currentMessages };
        
        if (!updatedMessages[user.email]) {
            updatedMessages[user.email] = new Array(fixedDayDatesArray.length).fill("");
        }
        
        const userMessages = [...updatedMessages[user.email]];
        userMessages[dayIndex] = value;
        updatedMessages[user.email] = userMessages;
        
        setMorningMessagesList(updatedMessages);
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

    const areAllColumnsReady = users.length === 0 || (isPlayerTableColumnsReady && isDaysTableColumnsReady);
    // Only show loading on initial load, not when syncing after
    const showLoading = !hasInitiallyLoaded || !areAllColumnsReady;

    return (
        <>
            {showLoading && (
                <Column className='gap-4 min-h-[760px] items-center justify-center'>
                    <LoadingText text='Loading nightly data' />
                </Column>
            )}
            <Column className={`gap-4 min-h-[760px] ${showLoading ? 'opacity-0' : ''}`}>
            {users.length > 0 ? (
                <Animated.View entering={FadeIn.duration(300)}>
                    <Column className='gap-4'>
                        <Row className='gap-4 justify-between items-center mb-4'>
                            <Column className='gap-0'>
                                <FontText weight='medium'>Player submissions</FontText>
                                <FontText variant='subtext'>{voteCount}/{users.length} voted, {actionCount}/{users.length} submitted actions</FontText>
                            </Column>
                            <AppButton variant='accent' className='w-48' onPress={() => setIsCertificationDialogOpen(true)}>
                                <FontText weight='medium' color='white'>Review / Certify</FontText>
                            </AppButton>
                        </Row>

                        <ScrollShadow LinearGradientComponent={LinearGradient} className='mr-1 pt-1'>
                            <ScrollView horizontal={true} className='px-1 py-5'>
                                <Row className='gap-4'>
                                    <Column className='gap-1'>
                                        <Row className='gap-4 h-6'>
                                            {/* spacer to align with days table */}
                                        </Row>
                                        <Row className={`gap-4 ${isPlayerTableBeingEdited ? 'z-50' : '' ?? ''}`.trim()}>
                                            <NightlyPlayerTable
                                                gameId={gameId}
                                                doSync={doSync}
                                                setDoSync={setDoSync}
                                                isBeingEdited={isPlayerTableBeingEdited}
                                                setIsBeingEdited={setIsPlayerTableBeingEdited}
                                                dayDatesArray={fixedDayDatesArray}
                                                updatePlayerLivingState={updatePlayerLivingState}
                                                onColumnsReady={setIsPlayerTableColumnsReady}
                                            />
                                        </Row>
                                    </Column>
                                    <Column className='gap-1'>
                                        <View style={{ width: daysTableWidth }}>
                                            <ComprehensiveDaySelector
                                                gameId={gameId}
                                                showAddButton={true}
                                                showInitialSetupDialog={true}
                                            />
                                        </View>
                                        <Row className={`${isDaysTableBeingEdited ? 'z-10' : ''}gap-4 w-min max-w-min`}>
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
                                                morningMessagesList={morningMessagesList.value || {}}
                                                updateMorningMessage={updateMorningMessage}
                                                onColumnsReady={setIsDaysTableColumnsReady}
                                            />
                                        </Row>
                                    </Column>
                                </Row>
                            </ScrollView>
                        </ScrollShadow>

                        <NightlyCertificationDialog
                            isOpen={isCertificationDialogOpen}
                            onOpenChange={setIsCertificationDialogOpen}
                            users={users}
                            submissionsByEmail={submissionsByEmail}
                            onCertify={certifySubmissions}
                        />
                    </Column>
                </Animated.View>
            ) : (
                <Row className='gap-4 items-center justify-center'>
                    <FontText weight='medium' className='text-center text-gray-500'>
                        No players available. Add players in the Players tab first.
                    </FontText>
                </Row>
            )}
        </Column>
        </>
    );
};

export default NightlyPageOPERATOR;
