import React, { useEffect, useMemo, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppDropdown from '../ui/forms/AppDropdown';
import MarkdownRenderer, { MarkdownRendererInputDataProvider } from '../ui/markdown/MarkdownRenderer';
import PlayerDaySelector from './PlayerDaySelector';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { PlayerNightSubmission, PlayerProfile } from '../../../types/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { UserTableItem } from '../../../types/playerTable';
import { buildScheduledDate, defaultGameSchedule, formatCountdown, formatRelativeDuration, formatTimeLabel, getCurrentPlayableDayIndex, getDayEndDate, getDayRangeLabel, getDayReleaseDate, getGameScopedKey, getPlayerActionSummary, isDayContentReleased, isNightWindowOpen, normalizeGameSchedule, normalizePlayerActionState, parseStoredDayDates } from '../../../utils/multiplayer';

interface YourEyesOnlyPagePLAYERProps {
    gameId: string;
    currentEmail: string;
    matchingPlayer: UserTableItem;
    currentProfile: PlayerProfile;
}

const YourEyesOnlyPagePLAYER = ({ gameId, currentEmail, matchingPlayer, currentProfile }: YourEyesOnlyPagePLAYERProps) => {
    const { value: userTable } = useSharedListValue<UserTableItem[]>({ key: 'userTable', itemId: gameId, defaultValue: [] });
    const { value: morningMessagesList } = useSharedListValue<Record<string, string[]>>({ key: 'morningMessagesList', itemId: gameId, defaultValue: {} });
    const { value: dayDateStrings } = useSharedListValue<string[]>({ key: 'dayDatesArray', itemId: gameId, defaultValue: [] });
    const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({ key: 'numberOfRealDaysPerInGameDay', itemId: gameId, defaultValue: 2 });
    const roleTable = useSharedListValue<RoleTableItem[]>({ key: 'roleTable', itemId: gameId, defaultValue: [] });
    const scheduleRecords = useUserVariableGet({ key: getGameScopedKey('gameSchedule', gameId), returnTop: 1 });
    const [now, setNow] = useState(() => new Date());

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const [selectedDayIndex, setSelectedDayIndex] = useState(currentDayIndex);
    const schedule = normalizeGameSchedule(scheduleRecords?.[0]?.value ?? defaultGameSchedule);
    const selectedDayEndDate = useMemo(() => getDayEndDate(dayDates, selectedDayIndex, numberOfRealDaysPerInGameDay), [selectedDayIndex, dayDates, numberOfRealDaysPerInGameDay]);
    const selectedDayRangeLabel = useMemo(() => getDayRangeLabel(dayDates, selectedDayIndex, numberOfRealDaysPerInGameDay), [selectedDayIndex, dayDates, numberOfRealDaysPerInGameDay]);
    const selectedMorningDayIndex = selectedDayIndex - 1;
    const selectedMorningRangeLabel = useMemo(() => getDayRangeLabel(dayDates, selectedMorningDayIndex, numberOfRealDaysPerInGameDay), [selectedMorningDayIndex, dayDates, numberOfRealDaysPerInGameDay]);
    const selectedMorningReleaseDate = useMemo(() => selectedMorningDayIndex >= 0 ? getDayReleaseDate(dayDates, selectedMorningDayIndex, schedule.wakeUpTime) : null, [dayDates, schedule.wakeUpTime, selectedMorningDayIndex]);
    const hasSelectedMorning = selectedMorningDayIndex >= 0 && isDayContentReleased(dayDates, selectedMorningDayIndex, schedule.wakeUpTime, now);

    useEffect(() => {
        setSelectedDayIndex((currentValue) => Math.min(currentValue, currentDayIndex));
    }, [currentDayIndex]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    const [submission, setSubmission] = useUserVariable<PlayerNightSubmission>({
        key: getGameScopedKey(`playerNightSubmission-day-${selectedDayIndex}`, gameId),
        defaultValue: {
            gameId,
            gameDayId: `${gameId}-day-${selectedDayIndex}`,
            dayIndex: selectedDayIndex,
            playerEmail: currentEmail,
            playerUserId: currentProfile.userId,
            vote: '',
            action: {},
            submittedVoteAt: null,
            submittedActionAt: null,
        },
        privacy: 'PUBLIC',
        filterKey: 'playerEmail',
        searchKeys: ['playerEmail', 'vote'],
        sortKey: 'submittedActionAt',
    });

    const roleData = roleTable.value.find((roleItem) => roleItem.role === matchingPlayer.role);
    const voteOptions = userTable
        .filter((user) => user.playerData.livingState !== 'dead')
        .map((user) => ({
            value: user.email,
            label: user.realName || user.email,
        }));
    const playerOptions = userTable.map((user) => ({
        value: user.realName,
        label: `${user.realName}${user.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
        meta: {
            livingState: user.playerData.livingState,
        },
    }));
    const roleOptions = roleTable.value
        .filter((role) => role.role.trim().length > 0 && role.isVisible !== false)
        .map((role) => ({
            value: role.role,
            label: role.role,
        }));
    const isSelectedDayLocked = selectedDayIndex < currentDayIndex || !isNightWindowOpen(selectedDayEndDate, schedule.nightlyDeadlineTime, now);
    const currentMorningMessage = hasSelectedMorning ? morningMessagesList[currentEmail]?.[selectedMorningDayIndex] ?? '' : '';
    const currentActionState = useMemo(() => normalizePlayerActionState(submission.value.action), [submission.value.action]);
    const currentActionSummary = useMemo(() => getPlayerActionSummary(submission.value.action), [submission.value.action]);
    const nightlyDeadline = useMemo(() => buildScheduledDate(selectedDayEndDate, schedule.nightlyDeadlineTime), [selectedDayEndDate, schedule.nightlyDeadlineTime]);
    const voteCountdown = isSelectedDayLocked ? 'LOCKED' : formatCountdown(nightlyDeadline, now);
    const actionDueIn = formatRelativeDuration(nightlyDeadline, now);

    return (
        <Column className='pb-8' gap={7}>
            <Column gap={4}>
                {roleData?.aboutRole?.trim().length ? (
                    <MarkdownRenderer
                        markdown={roleData.aboutRole}
                        textAlign='center'
                        viewHeightImages={30}
                    />
                ) : (
                    <Column className='items-center py-6'>
                        <PoppinsText varient='subtext'>The operator has not written this role&apos;s about section yet.</PoppinsText>
                    </Column>
                )}
            </Column>

            <Column className='border-y border-border/15 py-5' gap={5}>
                <PlayerDaySelector
                    dayDates={dayDates}
                    selectedDayIndex={selectedDayIndex}
                    currentDayIndex={currentDayIndex}
                    onSelectDay={setSelectedDayIndex}
                    fallbackSpanDays={numberOfRealDaysPerInGameDay}
                />

                <Column className='items-center' gap={2}>
                    <PoppinsText weight='medium' className='text-center'>Morning Message</PoppinsText>
                    <PoppinsText varient='subtext' className='text-center'>
                        {selectedMorningDayIndex >= 0 ? `Received when ${selectedDayRangeLabel} begins` : 'There is no morning message before the first game day.'}
                    </PoppinsText>
                    <PoppinsText className='text-center text-lg leading-8'>
                        {selectedMorningDayIndex < 0
                            ? 'No morning message yet.'
                            : hasSelectedMorning
                                ? (currentMorningMessage || 'No morning message yet.')
                                : selectedMorningReleaseDate
                                    ? `You haven’t woken up for ${selectedDayRangeLabel || 'this game day'} yet. Unlocks ${selectedMorningReleaseDate.getMonth() + 1}/${selectedMorningReleaseDate.getDate()} at ${formatTimeLabel(schedule.wakeUpTime)}.`
                                    : `You haven’t woken up for ${selectedDayRangeLabel || 'this game day'} yet.`}
                    </PoppinsText>
                    {selectedMorningDayIndex >= 0 && selectedMorningRangeLabel ? (
                        <PoppinsText varient='subtext' className='text-center'>Comes from the overnight results after {selectedMorningRangeLabel}.</PoppinsText>
                    ) : null}
                </Column>

                <PoppinsText weight='bold' className='text-lg tracking-[0.45em]'>VOTE</PoppinsText>
                <PoppinsText weight='bold' className='text-5xl leading-[3.5rem]'>{voteCountdown}</PoppinsText>
                <PoppinsText varient='subtext'>{selectedDayRangeLabel || 'Current game day'} closes at {formatTimeLabel(schedule.nightlyDeadlineTime)}.</PoppinsText>
                <PoppinsText varient='subtext'>
                    {isSelectedDayLocked
                        ? `This day is locked. You’re viewing the saved vote and action for ${selectedDayRangeLabel || 'this game day'}.`
                        : `Actions due ${nightlyDeadline.getTime() > now.getTime() ? `in ${actionDueIn}` : 'now'}.`}
                </PoppinsText>
            </Column>

            <Row className='items-start gap-6' style={{ flexWrap: 'wrap' }}>
                <Column className='min-w-[240px] flex-1' gap={3}>
                    <PoppinsText weight='medium' className='text-sm tracking-[0.24em] uppercase opacity-60'>{selectedDayRangeLabel || 'Current'} Vote</PoppinsText>
                    <AppDropdown
                        options={voteOptions}
                        value={submission.value.vote}
                        onValueChange={(value) => {
                            if (isSelectedDayLocked || roleData?.doesRoleVote === false) {
                                return;
                            }

                            setSubmission({
                                ...submission.value,
                                vote: value,
                                submittedVoteAt: Date.now(),
                            });
                        }}
                        placeholder={roleData?.doesRoleVote === false ? 'This role does not vote' : 'Choose a player'}
                        triggerClassName='rounded-2xl border border-border/15 bg-none px-4 py-4'
                        contentClassName='border border-border/15'
                        disabled={isSelectedDayLocked || roleData?.doesRoleVote === false}
                    />
                    {roleData?.doesRoleVote === false ? (
                        <PoppinsText varient='subtext'>This role doesn&apos;t submit a vote.</PoppinsText>
                    ) : isSelectedDayLocked ? (
                        <PoppinsText varient='subtext'>Locked vote: {submission.value.vote || 'No vote submitted.'}</PoppinsText>
                    ) : null}
                </Column>

                <Column className='min-w-[320px] flex-1' gap={3}>
                    <MarkdownRendererInputDataProvider playerOptions={playerOptions} roleOptions={roleOptions}>
                        {roleData?.roleMessage?.trim().length ? (
                            <MarkdownRenderer
                                markdown={roleData.roleMessage}
                                state={currentActionState}
                                setState={!isSelectedDayLocked ? (nextState) => {
                                    setSubmission({
                                        ...submission.value,
                                        action: nextState,
                                        submittedActionAt: Date.now(),
                                    });
                                } : undefined}
                            />
                        ) : (
                            <PoppinsText varient='subtext'>The operator has not written your role action instructions yet.</PoppinsText>
                        )}
                    </MarkdownRendererInputDataProvider>

                    {isSelectedDayLocked ? (
                        <PoppinsText varient='subtext'>LOCKED. You&apos;re viewing the saved action state for this day.</PoppinsText>
                    ) : currentActionSummary.trim().length > 0 ? (
                        <PoppinsText varient='subtext'>Current action: {currentActionSummary}</PoppinsText>
                    ) : null}
                </Column>
            </Row>
        </Column>
    );
};

export default YourEyesOnlyPagePLAYER;
