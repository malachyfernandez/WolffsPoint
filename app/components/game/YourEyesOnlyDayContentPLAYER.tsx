import React, { useEffect, useMemo, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppDropdown from '../ui/forms/AppDropdown';
import MarkdownRenderer, { MarkdownRendererInputDataProvider } from '../ui/markdown/MarkdownRenderer';
import ChainWraper from './ChainWraper';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useSharedVariableValue } from '../../../hooks/useSharedVariableValue';
import { useValue } from '../../../hooks/useData';
import { PlayerNightSubmission } from '../../../types/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { UserTableItem } from '../../../types/playerTable';
import { buildScheduledDate, defaultGameSchedule, formatContextualDateLabel, formatCountdown, formatRelativeDuration, formatTimeLabel, getCurrentPlayableDayIndex, getDayEndDate, getDayReleaseDate, getGameScopedKey, getPlayerActionSummary, isDayContentReleased, isNightWindowOpen, normalizeGameSchedule, normalizePlayerActionState, parseStoredDayDates } from '../../../utils/multiplayer';

interface YourEyesOnlyDayContentPLAYERProps {
    gameId: string;
    currentEmail: string;
    currentUserId: string;
    dayIndex: number;
}

const YourEyesOnlyDayContentPLAYER = ({ gameId, currentEmail, currentUserId, dayIndex }: YourEyesOnlyDayContentPLAYERProps) => {
    const { operatorUserId } = useGameOperatorUserId(gameId);
    const operatorUserIds = operatorUserId ? [operatorUserId] : [];
    const { value: userTable } = useSharedListValue<UserTableItem[]>({ key: 'userTable', itemId: gameId, defaultValue: [], userIds: operatorUserIds });
    const { value: morningMessagesList } = useSharedListValue<Record<string, string[]>>({ key: 'morningMessagesList', itemId: gameId, defaultValue: {}, userIds: operatorUserIds });
    const { value: dayDateStrings } = useSharedListValue<string[]>({ key: 'dayDatesArray', itemId: gameId, defaultValue: [], userIds: operatorUserIds });
    const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({ key: 'numberOfRealDaysPerInGameDay', itemId: gameId, defaultValue: 2, userIds: operatorUserIds });
    const roleTable = useSharedListValue<RoleTableItem[]>({ key: 'roleTable', itemId: gameId, defaultValue: [], userIds: operatorUserIds });
    const scheduleRecord = useSharedVariableValue({ key: getGameScopedKey('gameSchedule', gameId), defaultValue: defaultGameSchedule, userIds: operatorUserIds });
    const [now, setNow] = useState(() => new Date());

    const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
    const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
    const schedule = normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule);
    const selectedDayEndDate = useMemo(() => getDayEndDate(dayDates, dayIndex, numberOfRealDaysPerInGameDay), [dayDates, dayIndex, numberOfRealDaysPerInGameDay]);
    const selectedMorningDayIndex = dayIndex - 1;
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

    const [submission, setSubmission] = useValue<PlayerNightSubmission>(getGameScopedKey(`playerNightSubmission-day-${dayIndex}`, gameId), {
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

    // Determine which deadline comes first
    const isVoteFirst = voteDeadline.getTime() <= actionDeadline.getTime();
    const isVotePrimary = isVoteFirst && !(isVoteLocked && !isActionLocked); // Single selector for UI control - can be extended with extra criteria
    const primaryDeadline = isVotePrimary ? voteDeadline : actionDeadline;
    const primaryCountdown = (isVotePrimary ? isVoteLocked : isActionLocked) ? 'LOCKED' : formatCountdown(primaryDeadline, now);
    const primaryLabel = isVotePrimary ? 'VOTE' : 'ACTION';
    const primaryTimeLabel = isVotePrimary ? voteDeadlineTime : actionDeadlineTime;
    const secondaryDeadline = isVotePrimary ? actionDeadline : voteDeadline;
    const secondaryTimeLabel = isVotePrimary ? actionDeadlineTime : voteDeadlineTime;
    const secondaryIsLocked = isVotePrimary ? isActionLocked : isVoteLocked;
    const secondaryLabel = isVotePrimary ? 'Actions' : 'Voting';
    const primaryDateLabel = formatContextualDateLabel(primaryDeadline, undefined, now, 'lower');
    const secondaryDateLabel = formatContextualDateLabel(secondaryDeadline, undefined, now, 'lower');

    return (
        <Column className='gap-5'>
            <Column className='gap-2 items-center w-full m-auto rounded max-w-lg p-4 bg-text/5'>
                {(selectedMorningDayIndex >= 0 && hasSelectedMorning && currentMorningMessage) ? (
                    <>
                        <FontText variant='cardHeader' className='text-center'>Last Night:</FontText>
                        <MarkdownRenderer
                            markdown={currentMorningMessage}
                            textAlign='center'
                            viewHeightImages={20}
                        />
                    </>
                ) : (
                    <FontText variant='cardHeader' className='text-center'>No updates from last night</FontText>
                )}
            </Column>

            <Column className='gap-1 items-center'>
                <FontText weight='bold' className='text-lg tracking-[0.45em]'>{primaryLabel}</FontText>
                <FontText weight='bold' className='text-5xl leading-14'>{primaryCountdown}</FontText>
                <FontText variant='subtext'>
                    {primaryLabel === 'VOTE'
                        ? `Voting due ${primaryDateLabel} at ${formatTimeLabel(primaryTimeLabel)}.`
                        : `Actions due ${primaryDateLabel} at ${formatTimeLabel(primaryTimeLabel)}.`}
                </FontText>
                <FontText variant='subtext'>
                    {secondaryIsLocked
                        ? `${secondaryLabel} due ${secondaryDateLabel} at ${formatTimeLabel(secondaryTimeLabel)}.`
                        : `${secondaryLabel} due in ${formatRelativeDuration(secondaryDeadline, now)} (${formatTimeLabel(secondaryTimeLabel)}).`}
                </FontText>
            </Column>

            <Row className='gap-4 items-start' style={{ flexWrap: 'wrap' }}>
                <Column className='min-w-[300px] flex-1'>
                    <ChainWraper className='' isDisabled={(isVoteLocked && roleData?.doesRoleVote !== false) || roleData?.doesRoleVote == false}>
                        <Column className='gap-3'>
                            <FontText weight='medium' className='text-sm tracking-[0.24em] uppercase opacity-60'>Vote</FontText>
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

                        </Column>
                    </ChainWraper>
                    {!!submission.value.vote ? (
                        <FontText variant='subtext'>Saved vote: {submission.value.vote}</FontText>
                    ) : roleData?.doesRoleVote === false ? (
                        <FontText variant='subtext'>This role doesn&apos;t submit a vote.</FontText>
                    ) : isVoteLocked ? (
                        <FontText variant='subtext'>Saved vote: {submission.value.vote || 'No vote submitted.'}</FontText>
                    ) : null}
                </Column>
                <Column className='min-w-[300px] flex-1'>
                    <ChainWraper className='min-w-[300px] flex-1' isDisabled={isActionLocked}>
                        <Column className='gap-3'>
                            <FontText weight='medium' className='text-sm tracking-[0.24em] uppercase opacity-60'>Action</FontText>
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
                                    <FontText variant='subtext'>The operator has not written your role action instructions yet.</FontText>
                                )}
                            </MarkdownRendererInputDataProvider>


                        </Column>

                    </ChainWraper>
                    {isActionLocked ? (
                        currentActionSummary.trim().length > 0 ? (
                            <FontText variant='subtext'>Saved action: {currentActionSummary}</FontText>
                        ) : (
                            <FontText variant='subtext'>The action window has closed for this day.</FontText>
                        )
                    ) : currentActionSummary.trim().length > 0 ? (
                        <FontText variant='subtext'>Current action: {currentActionSummary}</FontText>
                    ) : null}
                </Column>
            </Row>
        </Column>
    );
};

export default YourEyesOnlyDayContentPLAYER;
