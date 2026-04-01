import React, { useMemo } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppDropdown from '../ui/forms/AppDropdown';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { PlayerNightSubmission, PlayerProfile } from '../../../types/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { UserTableItem } from '../../../types/playerTable';
import { defaultGameSchedule, formatTimeLabel, getCurrentPlayableDayIndex, getGameScopedKey, isDayReleasedAtTime, isNightWindowOpen, parseStoredDayDates } from '../../../utils/multiplayer';

interface YourEyesOnlyPagePLAYERProps {
    gameId: string;
    currentEmail: string;
    matchingPlayer: UserTableItem;
    currentProfile: PlayerProfile;
}

const YourEyesOnlyPagePLAYER = ({ gameId, currentEmail, matchingPlayer, currentProfile }: YourEyesOnlyPagePLAYERProps) => {
    const { value: userTable } = useSharedListValue<UserTableItem[]>({ key: 'userTable', itemId: gameId, defaultValue: [] });
    const { value: nightlyMessagesList } = useSharedListValue<Record<string, string[]>>({ key: 'nightlyMessagesList', itemId: gameId, defaultValue: {} });
    const { value: nightlyResponseList } = useSharedListValue<Record<string, string[]>>({ key: 'nightlyResponseList', itemId: gameId, defaultValue: {} });
    const { value: dayDateStrings } = useSharedListValue<string[]>({ key: 'dayDatesArray', itemId: gameId, defaultValue: [] });
    const roleTable = useSharedListValue<RoleTableItem[]>({ key: 'roleTable', itemId: gameId, defaultValue: [] });
    const scheduleRecords = useUserVariableGet({ key: getGameScopedKey('gameSchedule', gameId), returnTop: 1 });

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const currentDayDate = dayDates[currentDayIndex] ?? new Date();
    const schedule = scheduleRecords?.[0]?.value ?? defaultGameSchedule;

    const [submission, setSubmission] = useUserVariable<PlayerNightSubmission>({
        key: getGameScopedKey(`playerNightSubmission-day-${currentDayIndex}`, gameId),
        defaultValue: {
            gameId,
            gameDayId: `${gameId}-day-${currentDayIndex}`,
            dayIndex: currentDayIndex,
            playerEmail: currentEmail,
            playerUserId: currentProfile.userId,
            vote: '',
            action: '',
            submittedVoteAt: null,
            submittedActionAt: null,
        },
        privacy: 'PUBLIC',
        filterKey: 'playerEmail',
        searchKeys: ['playerEmail', 'vote', 'action'],
        sortKey: 'submittedActionAt',
    });

    const roleData = roleTable.value.find((roleItem) => roleItem.role === matchingPlayer.role);
    const voteOptions = userTable
        .filter((user) => user.playerData.livingState !== 'dead')
        .map((user) => ({
            value: user.email,
            label: user.realName || user.email,
        }));
    const currentNightMessage = nightlyMessagesList[currentEmail]?.[currentDayIndex] ?? '';
    const currentNightResponse = nightlyResponseList[currentEmail]?.[currentDayIndex] ?? '';
    const canEditNight = isNightWindowOpen(currentDayDate, schedule.nightlyDeadlineTime);
    const canSeeResponse = isDayReleasedAtTime(currentDayDate, schedule.nightlyResponseReleaseTime);

    return (
        <Column gap={4}>
            <Column className='rounded-xl border border-subtle-border bg-white p-4' gap={2}>
                <PoppinsText weight='medium'>Role</PoppinsText>
                <PoppinsText>{matchingPlayer.role || 'Unassigned'}</PoppinsText>
                <PoppinsText weight='medium' className='pt-2'>Role message</PoppinsText>
                <PoppinsText>{roleData?.roleMessage || 'No role message yet.'}</PoppinsText>
                <PoppinsText weight='medium' className='pt-2'>Tonight&apos;s message</PoppinsText>
                <PoppinsText>{currentNightMessage || 'No nightly message yet.'}</PoppinsText>
            </Column>
            <Column className='rounded-xl border border-subtle-border bg-white p-4' gap={3}>
                <Row className='justify-between items-center'>
                    <PoppinsText weight='medium'>Tonight&apos;s submission</PoppinsText>
                    <PoppinsText varient='subtext'>Deadline: {formatTimeLabel(schedule.nightlyDeadlineTime)}</PoppinsText>
                </Row>
                <Column gap={1}>
                    <PoppinsText>Vote</PoppinsText>
                    <AppDropdown
                        options={voteOptions}
                        value={submission.value.vote}
                        onValueChange={(value) => {
                            if (!canEditNight) {
                                return;
                            }

                            setSubmission({
                                ...submission.value,
                                vote: value,
                                submittedVoteAt: Date.now(),
                            });
                        }}
                        placeholder='Choose a player'
                    />
                </Column>
                <Column gap={1}>
                    <PoppinsText>Action</PoppinsText>
                    <PoppinsTextInput
                        className='w-full min-h-[120px] border border-subtle-border p-3'
                        value={submission.value.action}
                        onChangeText={(value) => {
                            if (!canEditNight) {
                                return;
                            }

                            setSubmission({
                                ...submission.value,
                                action: value,
                                submittedActionAt: Date.now(),
                            });
                        }}
                        multiline={true}
                        autoGrow={true}
                        editable={canEditNight}
                        placeholder='Describe your nightly action'
                    />
                </Column>
                {!canEditNight && (
                    <PoppinsText varient='subtext'>The submission window has closed for tonight.</PoppinsText>
                )}
            </Column>
            <Column className='rounded-xl border border-subtle-border bg-white p-4' gap={2}>
                <PoppinsText weight='medium'>Nightly response</PoppinsText>
                <PoppinsText>{canSeeResponse ? (currentNightResponse || 'No response yet.') : `Responses unlock at ${formatTimeLabel(schedule.nightlyResponseReleaseTime)}.`}</PoppinsText>
            </Column>
            <Column className='rounded-xl border border-subtle-border bg-white p-4' gap={3}>
                <PoppinsText weight='medium'>Previous days</PoppinsText>
                {matchingPlayer.days.length > 0 ? matchingPlayer.days.map((day, dayIndex) => {
                    if (dayIndex >= currentDayIndex) {
                        return null;
                    }
                    return (
                        <Column key={dayIndex} className='border border-subtle-border rounded-xl p-3' gap={1}>
                            <PoppinsText weight='medium'>Day {dayIndex + 1}</PoppinsText>
                            <PoppinsText varient='subtext'>Vote: {day.vote || '—'}</PoppinsText>
                            <PoppinsText varient='subtext'>Action: {day.action || '—'}</PoppinsText>
                            <PoppinsText varient='subtext'>Message: {nightlyMessagesList[currentEmail]?.[dayIndex] || '—'}</PoppinsText>
                            <PoppinsText varient='subtext'>Response: {nightlyResponseList[currentEmail]?.[dayIndex] || '—'}</PoppinsText>
                        </Column>
                    );
                }) : (
                    <PoppinsText varient='subtext'>No previous days yet.</PoppinsText>
                )}
            </Column>
        </Column>
    );
};

export default YourEyesOnlyPagePLAYER;
