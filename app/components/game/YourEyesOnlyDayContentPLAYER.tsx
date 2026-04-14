import React, { useEffect, useMemo, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppDropdown from '../ui/forms/AppDropdown';
import MarkdownRenderer, { MarkdownRendererInputDataProvider } from '../ui/markdown/MarkdownRenderer';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { PlayerNightSubmission } from '../../../types/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { UserTableItem } from '../../../types/playerTable';
import { buildScheduledDate, defaultGameSchedule, formatCountdown, formatRelativeDuration, formatTimeLabel, getCurrentPlayableDayIndex, getDayEndDate, getDayReleaseDate, getGameScopedKey, getPlayerActionSummary, isDayContentReleased, isNightWindowOpen, normalizeGameSchedule, normalizePlayerActionState, parseStoredDayDates } from '../../../utils/multiplayer';

interface YourEyesOnlyDayContentPLAYERProps {
    gameId: string;
    currentEmail: string;
    currentUserId: string;
    dayIndex: number;
}

const YourEyesOnlyDayContentPLAYER = ({ gameId, currentEmail, currentUserId, dayIndex }: YourEyesOnlyDayContentPLAYERProps) => {
    const { value: userTable } = useSharedListValue<UserTableItem[]>({ key: 'userTable', itemId: gameId, defaultValue: [] });
    const { value: morningMessagesList } = useSharedListValue<Record<string, string[]>>({ key: 'morningMessagesList', itemId: gameId, defaultValue: {} });
    const { value: dayDateStrings } = useSharedListValue<string[]>({ key: 'dayDatesArray', itemId: gameId, defaultValue: [] });
    const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({ key: 'numberOfRealDaysPerInGameDay', itemId: gameId, defaultValue: 2 });
    const roleTable = useSharedListValue<RoleTableItem[]>({ key: 'roleTable', itemId: gameId, defaultValue: [] });
    const scheduleRecords = useUserVariableGet({ key: getGameScopedKey('gameSchedule', gameId), returnTop: 1 });
    const [now, setNow] = useState(() => new Date());

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const schedule = normalizeGameSchedule(scheduleRecords?.[0]?.value ?? defaultGameSchedule);
    const selectedDayEndDate = useMemo(() => getDayEndDate(dayDates, dayIndex, numberOfRealDaysPerInGameDay), [dayDates, dayIndex, numberOfRealDaysPerInGameDay]);
    const selectedMorningDayIndex = dayIndex - 1;
    const selectedMorningReleaseDate = useMemo(() => selectedMorningDayIndex >= 0 ? getDayReleaseDate(dayDates, selectedMorningDayIndex, schedule.wakeUpTime) : null, [dayDates, schedule.wakeUpTime, selectedMorningDayIndex]);
    const hasSelectedMorning = selectedMorningDayIndex >= 0 && isDayContentReleased(dayDates, selectedMorningDayIndex, schedule.wakeUpTime, now);
    const matchingPlayer = useMemo(() => userTable.find((user) => user.email === currentEmail), [currentEmail, userTable]);
    const roleData = roleTable.value.find((roleItem) => roleItem.role === matchingPlayer?.role);
    const voteDeadlineTime = schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00';
    const actionDeadlineTime = schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00';

    useEffect(() => {
        const intervalId = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(intervalId);
    }, []);

    const [submission, setSubmission] = useUserVariable<PlayerNightSubmission>({
        key: getGameScopedKey(`playerNightSubmission-day-${dayIndex}`, gameId),
        defaultValue: {
            gameId,
            gameDayId: `${gameId}-day-${dayIndex}`,
            dayIndex,
            playerEmail: currentEmail,
            playerUserId: currentUserId,
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
    const isVoteLocked = dayIndex < currentDayIndex || !isNightWindowOpen(selectedDayEndDate, voteDeadlineTime, now);
    const isActionLocked = dayIndex < currentDayIndex || !isNightWindowOpen(selectedDayEndDate, actionDeadlineTime, now);
    const currentMorningMessage = hasSelectedMorning ? morningMessagesList[currentEmail]?.[selectedMorningDayIndex] ?? '' : '';
    const currentActionState = useMemo(() => normalizePlayerActionState(submission.value.action), [submission.value.action]);
    const currentActionSummary = useMemo(() => getPlayerActionSummary(submission.value.action), [submission.value.action]);
    const voteDeadline = useMemo(() => buildScheduledDate(selectedDayEndDate, voteDeadlineTime), [selectedDayEndDate, voteDeadlineTime]);
    const actionDeadline = useMemo(() => buildScheduledDate(selectedDayEndDate, actionDeadlineTime), [actionDeadlineTime, selectedDayEndDate]);
    const voteCountdown = isVoteLocked ? 'LOCKED' : formatCountdown(voteDeadline, now);
    const actionDueIn = formatRelativeDuration(actionDeadline, now);

    return (
        <Column gap={5}>
            <Column className='items-center w-full m-auto rounded max-w-lg p-4 bg-text/5' gap={2}>
                {(selectedMorningDayIndex >= 0 && hasSelectedMorning && currentMorningMessage) ? (
                    <>
                        <PoppinsText varient='cardHeader' className='text-center'>Last Night:</PoppinsText>
                        <PoppinsText weight='medium' className='text-center leading-8'>
                            {selectedMorningDayIndex < 0
                                ? 'no updates from last night'
                                : hasSelectedMorning
                                    ? (currentMorningMessage || '')
                                    : selectedMorningReleaseDate
                                        ? `Unlocks at ${formatTimeLabel(schedule.wakeUpTime)}.`
                                        : `Unlocks at ${formatTimeLabel(schedule.wakeUpTime)}.`}
                        </PoppinsText>
                    </>
                ) : (
                    <PoppinsText varient='cardHeader' className='text-center'>No updates from last night</PoppinsText>
                )}
            </Column>

            <Column className='items-center' gap={1}>
                <PoppinsText weight='bold' className='text-lg tracking-[0.45em]'>VOTE</PoppinsText>
                <PoppinsText weight='bold' className='text-5xl leading-14'>{voteCountdown}</PoppinsText>
                <PoppinsText varient='subtext'>Voting due at {formatTimeLabel(voteDeadlineTime)}.</PoppinsText>
                <PoppinsText varient='subtext'>
                    {isActionLocked
                        ? 'The action window has closed for this day.'
                        : `Actions due ${actionDeadline.getTime() > now.getTime() ? `in ${actionDueIn}` : 'now'}.`}
                </PoppinsText>
            </Column>

            <Row className='items-start gap-6' style={{ flexWrap: 'wrap' }}>
                <Column className='min-w-[240px] flex-1' gap={3}>
                    <PoppinsText weight='medium' className='text-sm tracking-[0.24em] uppercase opacity-60'>Vote</PoppinsText>
                    <AppDropdown
                        options={voteOptions}
                        value={submission.value.vote}
                        onValueChange={(value) => {
                            if (isVoteLocked || roleData?.doesRoleVote === false) {
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
                        disabled={isVoteLocked || roleData?.doesRoleVote === false}
                    />
                    {roleData?.doesRoleVote === false ? (
                        <PoppinsText varient='subtext'>This role doesn&apos;t submit a vote.</PoppinsText>
                    ) : isVoteLocked ? (
                        <PoppinsText varient='subtext'>Saved vote: {submission.value.vote || 'No vote submitted.'}</PoppinsText>
                    ) : null}
                </Column>

                <Column className='min-w-[320px] flex-1' gap={3}>
                    <PoppinsText varient='subtext'>Action deadline: {formatTimeLabel(actionDeadlineTime)}.</PoppinsText>
                    <MarkdownRendererInputDataProvider playerOptions={playerOptions} roleOptions={roleOptions}>
                        {roleData?.roleMessage?.trim().length ? (
                            <MarkdownRenderer
                                markdown={roleData.roleMessage}
                                state={currentActionState}
                                setState={!isActionLocked ? (nextState) => {
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

                    {isActionLocked ? (
                        <PoppinsText varient='subtext'>The action window has closed for this day.</PoppinsText>
                    ) : currentActionSummary.trim().length > 0 ? (
                        <PoppinsText varient='subtext'>Current action: {currentActionSummary}</PoppinsText>
                    ) : null}
                </Column>
            </Row>
        </Column>
    );
};

export default YourEyesOnlyDayContentPLAYER;
