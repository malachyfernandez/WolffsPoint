import React, { useEffect, useMemo, useState } from 'react';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppDropdown from '../ui/forms/AppDropdown';
import MarkdownRenderer, { MarkdownRendererInputDataProvider } from '../ui/markdown/MarkdownRenderer';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { PlayerNightSubmission, PlayerProfile } from '../../../types/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { UserTableItem } from '../../../types/playerTable';
import { buildScheduledDate, defaultGameSchedule, formatCountdown, formatRelativeDuration, formatTimeLabel, getCurrentPlayableDayIndex, getDayEndDate, getDayRangeLabel, getDayReleaseDate, getGameScopedKey, getPlayerActionSummary, isDayContentReleased, isNightWindowOpen, normalizeGameSchedule, normalizePlayerActionState, parseStoredDayDates } from '../../../utils/multiplayer';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable } from 'react-native';

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
    const selectedMorningReleaseDate = useMemo(() => selectedMorningDayIndex >= 0 ? getDayReleaseDate(dayDates, selectedMorningDayIndex, schedule.wakeUpTime) : null, [dayDates, schedule.wakeUpTime, selectedMorningDayIndex]);
    const hasSelectedMorning = selectedMorningDayIndex >= 0 && isDayContentReleased(dayDates, selectedMorningDayIndex, schedule.wakeUpTime, now);
    const previousDayLabel = useMemo(() => selectedDayIndex > 0 ? getDayRangeLabel(dayDates, selectedDayIndex - 1, numberOfRealDaysPerInGameDay) : '', [dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]);
    const nextDayLabel = useMemo(() => selectedDayIndex < currentDayIndex ? getDayRangeLabel(dayDates, selectedDayIndex + 1, numberOfRealDaysPerInGameDay) : '', [currentDayIndex, dayDates, numberOfRealDaysPerInGameDay, selectedDayIndex]);

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
                <Row className='items-start justify-between gap-4'>
                    <Pressable
                        onPress={() => {
                            if (selectedDayIndex > 0) {
                                setSelectedDayIndex(selectedDayIndex - 1);
                            }
                        }}
                        disabled={selectedDayIndex <= 0}
                        className={`w-20 items-center ${selectedDayIndex <= 0 ? 'opacity-30' : ''}`}
                    >
                        <ChevronLeft size={28} color='rgb(46, 41, 37)' />
                        <PoppinsText varient='subtext' className='text-center text-xs'>
                            {previousDayLabel || ' '}
                        </PoppinsText>
                    </Pressable>

                    <Column className='flex-1 items-center pt-1' gap={1}>
                        <PoppinsText weight='medium' className='text-center'>
                            {selectedDayRangeLabel || 'Current game day'}
                        </PoppinsText>
                    </Column>

                    <Pressable
                        onPress={() => {
                            if (selectedDayIndex < currentDayIndex) {
                                setSelectedDayIndex(selectedDayIndex + 1);
                            }
                        }}
                        disabled={selectedDayIndex >= currentDayIndex}
                        className={`w-20 items-center ${selectedDayIndex >= currentDayIndex ? 'opacity-30' : ''}`}
                    >
                        <ChevronRight size={28} color='rgb(46, 41, 37)' />
                        <PoppinsText varient='subtext' className='text-center text-xs'>
                            {nextDayLabel || ' '}
                        </PoppinsText>
                    </Pressable>
                </Row>

                <Column className='items-center' gap={2}>
                    <PoppinsText weight='medium' className='text-center'>Morning Message</PoppinsText>
                    <PoppinsText className='text-center text-lg leading-8'>
                        {selectedMorningDayIndex < 0
                            ? 'No morning message yet.'
                            : hasSelectedMorning
                                ? (currentMorningMessage || 'No morning message yet.')
                                : selectedMorningReleaseDate
                                    ? `Unlocks at ${formatTimeLabel(schedule.wakeUpTime)}.`
                                    : `Unlocks at ${formatTimeLabel(schedule.wakeUpTime)}.`}
                    </PoppinsText>
                </Column>

                <Column className='items-center' gap={1}>
                    <PoppinsText weight='bold' className='text-lg tracking-[0.45em]'>VOTE</PoppinsText>
                    <PoppinsText weight='bold' className='text-5xl leading-[3.5rem]'>{voteCountdown}</PoppinsText>
                    <PoppinsText varient='subtext'>Voting due at {formatTimeLabel(schedule.nightlyDeadlineTime)}.</PoppinsText>
                    <PoppinsText varient='subtext'>
                        {isSelectedDayLocked
                            ? 'The action window has closed for this day.'
                            : `Actions due ${nightlyDeadline.getTime() > now.getTime() ? `in ${actionDueIn}` : 'now'}.`}
                    </PoppinsText>
                </Column>
            </Column>

            <Row className='items-start gap-6' style={{ flexWrap: 'wrap' }}>
                <Column className='min-w-[240px] flex-1' gap={3}>
                    <PoppinsText weight='medium' className='text-sm tracking-[0.24em] uppercase opacity-60'>Vote</PoppinsText>
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
                        <PoppinsText varient='subtext'>Saved vote: {submission.value.vote || 'No vote submitted.'}</PoppinsText>
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
                        <PoppinsText varient='subtext'>The action window has closed for this day.</PoppinsText>
                    ) : currentActionSummary.trim().length > 0 ? (
                        <PoppinsText varient='subtext'>Current action: {currentActionSummary}</PoppinsText>
                    ) : null}
                </Column>
            </Row>
        </Column>
    );
};

export default YourEyesOnlyPagePLAYER;
