import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer, {
  MarkdownRendererInputDataProvider,
} from '../ui/markdown/MarkdownRenderer';
import ChainWraper from './ChainWraper';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useSharedVariableValue } from '../../../hooks/useSharedVariableValue';
import { useValue } from '../../../hooks/useData';
import { PlannedUpdate, PlayerNightSubmission } from '../../../types/multiplayer';
import { DEFAULT_VOTE_MESSAGE, RoleTableItem } from '../../../types/roleTable';
import { UserTableItem, UserTableTitle } from '../../../types/playerTable';
import {
  inspectMarkdownVoteInput,
  planMarkdownScriptUpdates,
} from '../../../utils/runMarkdownScriptsWithUpdates';
import {
  buildScheduledDate,
  defaultGameSchedule,
  formatContextualDateLabel,
  formatCountdown,
  formatRelativeDuration,
  formatTimeLabel,
  getCurrentPlayableDayIndex,
  getDayEndDate,
  getDayReleaseDate,
  getGameScopedKey,
  getPlayerActionSummary,
  normalizeVoteTargets,
  isDayContentReleased,
  isNightWindowOpen,
  normalizeGameSchedule,
  normalizePlayerActionState,
  parseStoredDayDates,
} from '../../../utils/multiplayer';

interface YourEyesOnlyDayContentPLAYERProps {
  gameId: string;
  currentEmail: string;
  currentUserId: string;
  dayIndex: number;
}

const YourEyesOnlyDayContentPLAYER = ({
  gameId,
  currentEmail,
  currentUserId,
  dayIndex,
}: YourEyesOnlyDayContentPLAYERProps) => {
  const { operatorUserId } = useGameOperatorUserId(gameId);
  const operatorUserIds = operatorUserId ? [operatorUserId] : [];
  const { value: userTable } = useSharedListValue<UserTableItem[]>({
    key: 'userTable',
    itemId: gameId,
    defaultValue: [],
    userIds: operatorUserIds,
  });
  const { value: userTableTitle } = useSharedListValue<UserTableTitle>({
    key: 'userTableTitle',
    itemId: gameId,
    defaultValue: { extraUserColumns: [], extraDayColumns: [] },
    userIds: operatorUserIds,
  });
  const { value: morningMessagesList } = useSharedListValue<Record<string, string[]>>({
    key: 'morningMessagesList',
    itemId: gameId,
    defaultValue: {},
    userIds: operatorUserIds,
  });
  const { value: dayDateStrings } = useSharedListValue<string[]>({
    key: 'dayDatesArray',
    itemId: gameId,
    defaultValue: [],
    userIds: operatorUserIds,
  });
  const { value: numberOfRealDaysPerInGameDay } = useSharedListValue<number>({
    key: 'numberOfRealDaysPerInGameDay',
    itemId: gameId,
    defaultValue: 2,
    userIds: operatorUserIds,
  });
  const { value: skipVotingDays } = useSharedListValue<number[]>({
    key: 'skipVotingDays',
    itemId: gameId,
    defaultValue: [],
    userIds: operatorUserIds,
  });
  const { value: skipActionsDays } = useSharedListValue<number[]>({
    key: 'skipActionsDays',
    itemId: gameId,
    defaultValue: [],
    userIds: operatorUserIds,
  });
  const roleTable = useSharedListValue<RoleTableItem[]>({
    key: 'roleTable',
    itemId: gameId,
    defaultValue: [],
    userIds: operatorUserIds,
  });
  const { value: defaultVoteMessage } = useSharedListValue<string>({
    key: 'voteMessageDefault',
    itemId: gameId,
    defaultValue: DEFAULT_VOTE_MESSAGE,
    userIds: operatorUserIds,
  });
  const scheduleRecord = useSharedVariableValue({
    key: getGameScopedKey('gameSchedule', gameId),
    defaultValue: defaultGameSchedule,
    userIds: operatorUserIds,
  });
  const [now, setNow] = useState(() => new Date());

  const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
  const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
  const schedule = useMemo(
    () => normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule),
    [scheduleRecord.value]
  );
  const selectedDayEndDate = useMemo(
    () => getDayEndDate(dayDates, dayIndex, numberOfRealDaysPerInGameDay),
    [dayDates, dayIndex, numberOfRealDaysPerInGameDay]
  );
  const selectedMorningDayIndex = dayIndex - 1;
  const hasSelectedMorning =
    selectedMorningDayIndex >= 0 &&
    isDayContentReleased(dayDates, selectedMorningDayIndex, schedule.wakeUpTime, now);
  const matchingPlayer = useMemo(
    () =>
      userTable.find(
        (user) => user.email.trim().toLowerCase() === currentEmail.trim().toLowerCase()
      ),
    [currentEmail, userTable]
  );
  const roleData = roleTable.value.find((roleItem) => roleItem.role === matchingPlayer?.role);
  const voteMessage = roleData?.voteMessage?.trim()
    ? roleData.voteMessage
    : defaultVoteMessage || DEFAULT_VOTE_MESSAGE;
  const voteDeadlineTime =
    schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00';
  const actionDeadlineTime =
    schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00';

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const [submission, setSubmission] = useValue<PlayerNightSubmission>(
    getGameScopedKey(`playerNightSubmission-day-${dayIndex}`, gameId),
    {
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
      privacy: 'PUBLIC',
    }
  );

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
  const actionDayOffset = schedule.actionDayOffset ?? 0;
  const voteDayOffset = schedule.voteDayOffset ?? 0;
  const actionDeadlineBaseDate = useMemo(
    () =>
      actionDayOffset > 0
        ? new Date(selectedDayEndDate.getTime() - actionDayOffset * 24 * 60 * 60 * 1000)
        : selectedDayEndDate,
    [actionDayOffset, selectedDayEndDate]
  );
  const voteDeadlineBaseDate = useMemo(
    () =>
      voteDayOffset > 0
        ? new Date(selectedDayEndDate.getTime() - voteDayOffset * 24 * 60 * 60 * 1000)
        : selectedDayEndDate,
    [voteDayOffset, selectedDayEndDate]
  );
  const isVoteLocked =
    dayIndex < currentDayIndex || !isNightWindowOpen(voteDeadlineBaseDate, voteDeadlineTime, now);
  const isActionLocked =
    dayIndex < currentDayIndex ||
    !isNightWindowOpen(actionDeadlineBaseDate, actionDeadlineTime, now);
  const isVotingSkipped = (skipVotingDays ?? []).includes(dayIndex);
  const isActionsSkipped = (skipActionsDays ?? []).includes(dayIndex);
  const isSkipVote = submission.value.vote === 'SKIP_VOTE';
  const canVote = !isVoteLocked && roleData?.doesRoleVote !== false;
  // The morning message the player sees today (written by the operator during
  // the previous night). This is shown in the Action section with interactive
  // inputs that feed into the same submission state as the role message.
  const currentMorningMessage = hasSelectedMorning
    ? (morningMessagesList[currentEmail.toLowerCase()]?.[selectedMorningDayIndex] ?? '')
    : '';
  const currentActionState = useMemo(
    () => normalizePlayerActionState(submission.value.action),
    [submission.value.action]
  );
  const currentVoteState = useMemo(() => {
    if (submission.value.voteInputs) return submission.value.voteInputs;
    const targets = normalizeVoteTargets(submission.value.vote);
    if (targets.length === 0 || targets[0] === 'SKIP_VOTE') return {};
    return { Vote: targets.length === 1 ? targets[0] : JSON.stringify(targets) };
  }, [submission.value.vote, submission.value.voteInputs]);
  const currentVoteSummary = useMemo(
    () =>
      normalizeVoteTargets(submission.value.vote)
        .map(
          (target) =>
            userTable.find((user) => user.email.toLowerCase() === target.toLowerCase())?.realName ||
            target
        )
        .join(', '),
    [submission.value.vote, userTable]
  );
  const currentActionSummary = useMemo(
    () => getPlayerActionSummary(submission.value.action),
    [submission.value.action]
  );

  // Compute planned table updates from the role message script AND the morning
  // message script at input time. This runs the scripts in "planning mode" —
  // variables (currentDay, Inputs, etc.) are resolved to their values, but
  // function calls (tag(), .append(), etc.) are kept as expression strings.
  // At certify time, these expressions are evaluated with the cell variable
  // bound to the current cell value.
  const plannedUpdates = useMemo<PlannedUpdate[]>(() => {
    if (!userTable || userTable.length === 0) return [];
    const actionState = normalizePlayerActionState(submission.value.action);
    // Only run if there's actual input state
    const hasInputs = Object.values(actionState).some((v) => v !== undefined && v !== '');
    if (!hasInputs) return [];
    const titles = userTableTitle ?? { extraUserColumns: [], extraDayColumns: [] };
    const scriptSourceData = {
      capability: 'player' as const,
      players: userTable,
      roles: roleTable.value,
      currentUserId,
      currentEmail,
      currentDay: dayIndex,
      dayDates: dayDateStrings,
      schedule,
      userTableTitle: titles,
      morningMessagesList: morningMessagesList,
    };
    const allPlanned: PlannedUpdate[] = [];
    // Role message script
    if (roleData?.roleMessage?.trim()) {
      const { plannedUpdates, issues } = planMarkdownScriptUpdates(
        roleData.roleMessage,
        actionState,
        scriptSourceData,
        userTable,
        titles,
        morningMessagesList
      );
      if (issues.length > 0) console.warn('Role message script issues:', issues);
      allPlanned.push(...plannedUpdates);
    }
    // Morning message script (same input state, same submission)
    if (currentMorningMessage.trim()) {
      const { plannedUpdates, issues } = planMarkdownScriptUpdates(
        currentMorningMessage,
        actionState,
        scriptSourceData,
        userTable,
        titles,
        morningMessagesList
      );
      if (issues.length > 0) console.warn('Morning message script issues:', issues);
      allPlanned.push(...plannedUpdates);
    }
    return allPlanned;
  }, [
    roleData?.roleMessage,
    currentMorningMessage,
    submission.value.action,
    userTable,
    userTableTitle,
    roleTable.value,
    currentUserId,
    currentEmail,
    dayIndex,
    dayDateStrings,
    schedule,
    morningMessagesList,
  ]);

  const votePlannedUpdates = useMemo<PlannedUpdate[]>(() => {
    if (isSkipVote || !userTable.length || !voteMessage.trim()) return [];
    const hasInputs = Object.values(currentVoteState).some(
      (value) => value !== undefined && value !== ''
    );
    if (!hasInputs) return [];
    const { plannedUpdates, issues } = planMarkdownScriptUpdates(
      voteMessage,
      currentVoteState,
      {
        capability: 'player',
        players: userTable,
        roles: roleTable.value,
        currentUserId,
        currentEmail,
        currentDay: dayIndex,
        dayDates: dayDateStrings,
        schedule,
        userTableTitle,
        morningMessagesList,
      },
      userTable,
      userTableTitle,
      morningMessagesList
    );
    if (issues.length > 0) console.warn('Vote message script issues:', issues);
    return plannedUpdates;
  }, [
    currentEmail,
    currentUserId,
    currentVoteState,
    dayIndex,
    dayDateStrings,
    isSkipVote,
    schedule,
    morningMessagesList,
    roleTable.value,
    userTable,
    userTableTitle,
    voteMessage,
  ]);

  // Persist planned updates into the submission whenever they change
  useEffect(() => {
    const currentActionUpdates = submission.value.plannedUpdates ?? [];
    const currentVoteUpdates = submission.value.votePlannedUpdates ?? [];
    if (
      JSON.stringify(plannedUpdates) !== JSON.stringify(currentActionUpdates) ||
      JSON.stringify(votePlannedUpdates) !== JSON.stringify(currentVoteUpdates)
    ) {
      setSubmission({
        ...submission.value,
        plannedUpdates: plannedUpdates.length > 0 ? plannedUpdates : undefined,
        votePlannedUpdates: votePlannedUpdates.length > 0 ? votePlannedUpdates : undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannedUpdates, votePlannedUpdates]);

  // Format a planned update into a readable string for display
  const plannedUpdateSummaries = useMemo(() => {
    return plannedUpdates.map((update) => {
      const playerName =
        update.playerIndex !== null && update.playerIndex < userTable.length
          ? userTable[update.playerIndex].realName || userTable[update.playerIndex].email
          : 'All players';
      const dayLabel = update.dayIndex !== null ? `Day ${update.dayIndex + 1}, ` : '';
      return `${playerName} → ${dayLabel}${update.column}: ${update.updateExpression}`;
    });
  }, [plannedUpdates, userTable]);

  const voteDeadline = useMemo(
    () => buildScheduledDate(voteDeadlineBaseDate, voteDeadlineTime),
    [voteDeadlineBaseDate, voteDeadlineTime]
  );
  const actionDeadline = useMemo(
    () => buildScheduledDate(actionDeadlineBaseDate, actionDeadlineTime),
    [actionDeadlineTime, actionDeadlineBaseDate]
  );

  // Determine which deadline comes first
  const isVoteFirst = voteDeadline.getTime() <= actionDeadline.getTime();
  const isVotePrimary = isVoteFirst && !(isVoteLocked && !isActionLocked); // Single selector for UI control - can be extended with extra criteria
  const primaryDeadline = isVotePrimary ? voteDeadline : actionDeadline;
  const primaryCountdown = (isVotePrimary ? isVoteLocked : isActionLocked)
    ? 'LOCKED'
    : formatCountdown(primaryDeadline, now);
  const primaryLabel = isVotePrimary ? 'VOTE' : 'ACTION';
  const primaryTimeLabel = isVotePrimary ? voteDeadlineTime : actionDeadlineTime;
  const secondaryDeadline = isVotePrimary ? actionDeadline : voteDeadline;
  const secondaryTimeLabel = isVotePrimary ? actionDeadlineTime : voteDeadlineTime;
  const secondaryIsLocked = isVotePrimary ? isActionLocked : isVoteLocked;
  const secondaryLabel = isVotePrimary ? 'Actions' : 'Voting';
  const primaryDateLabel = formatContextualDateLabel(primaryDeadline, undefined, now, 'lower');
  const secondaryDateLabel = formatContextualDateLabel(secondaryDeadline, undefined, now, 'lower');

  return (
    <Column className="gap-5">
      <Column className="bg-text/5 m-auto w-full max-w-lg items-center gap-2 rounded p-4">
        {selectedMorningDayIndex >= 0 && hasSelectedMorning && currentMorningMessage ? (
          <>
            <FontText variant="cardHeader" className="text-center">
              Last Night:
            </FontText>
            <MarkdownRendererInputDataProvider
              playerOptions={playerOptions}
              roleOptions={roleOptions}
              scriptSources={{
                capability: 'player',
                players: userTable,
                roles: roleTable.value,
                currentUserId,
                currentEmail,
                currentDay: dayIndex,
                dayDates: dayDateStrings,
                schedule,
                userTableTitle,
                morningMessagesList,
              }}>
              <MarkdownRenderer
                markdown={currentMorningMessage}
                state={currentActionState}
                setState={
                  !isActionLocked
                    ? (nextState) => {
                        setSubmission({
                          ...submission.value,
                          action: nextState,
                          submittedActionAt: Date.now(),
                        });
                      }
                    : undefined
                }
                className="w-full"
                textAlign="center"
                viewHeightImages={20}
              />
            </MarkdownRendererInputDataProvider>
          </>
        ) : (
          <FontText variant="cardHeader" className="text-center">
            No updates from last night
          </FontText>
        )}
      </Column>

      <Column className="items-center gap-1">
        <FontText weight="bold" className="text-lg tracking-[0.45em]">
          {primaryLabel}
        </FontText>
        <FontText weight="bold" className="leading-14 text-5xl">
          {primaryCountdown}
        </FontText>
        <FontText variant="subtext">
          {primaryLabel === 'VOTE'
            ? `Voting due ${primaryDateLabel} at ${formatTimeLabel(primaryTimeLabel)}.`
            : `Actions due ${primaryDateLabel} at ${formatTimeLabel(primaryTimeLabel)}.`}
        </FontText>
        <FontText variant="subtext">
          {secondaryIsLocked
            ? `${secondaryLabel} due ${secondaryDateLabel} at ${formatTimeLabel(secondaryTimeLabel)}.`
            : `${secondaryLabel} due in ${formatRelativeDuration(secondaryDeadline, now)} (${formatTimeLabel(secondaryTimeLabel)}).`}
        </FontText>
      </Column>

      <Row className="items-start gap-4" style={{ flexWrap: 'wrap' }}>
        <Column className="min-w-[300px] flex-1">
          {isVotingSkipped ? (
            <Column className="gap-3">
              <FontText weight="medium" className="text-sm uppercase tracking-[0.24em] opacity-60">
                Vote
              </FontText>
              <FontText variant="subtext">Voting is skipped for this day.</FontText>
            </Column>
          ) : (
            <>
              <ChainWraper
                className=""
                isDisabled={
                  (isVoteLocked && roleData?.doesRoleVote !== false) ||
                  roleData?.doesRoleVote == false
                }>
                <Column className="gap-3">
                  <FontText
                    weight="medium"
                    className="text-sm uppercase tracking-[0.24em] opacity-60">
                    Vote
                  </FontText>
                  <MarkdownRendererInputDataProvider
                    playerOptions={playerOptions}
                    roleOptions={roleOptions}
                    scriptSources={{
                      capability: 'player',
                      players: userTable,
                      roles: roleTable.value,
                      currentUserId,
                      currentEmail,
                      currentDay: dayIndex,
                      dayDates: dayDateStrings,
                      schedule,
                      userTableTitle,
                      morningMessagesList,
                    }}>
                    <MarkdownRenderer
                      markdown={voteMessage}
                      state={currentVoteState}
                      setState={
                        !isVoteLocked && roleData?.doesRoleVote !== false && !isSkipVote
                          ? (nextState) => {
                              const voteInput = inspectMarkdownVoteInput(voteMessage, nextState, {
                                capability: 'player',
                                players: userTable,
                                roles: roleTable.value,
                                currentUserId,
                                currentEmail,
                                currentDay: dayIndex,
                                dayDates: dayDateStrings,
                                schedule,
                                userTableTitle,
                                morningMessagesList,
                              });
                              const targets = voteInput
                                ? normalizeVoteTargets(nextState[voteInput.key])
                                : [];
                              setSubmission({
                                ...submission.value,
                                vote:
                                  targets.length > 1
                                    ? targets
                                    : targets.length === 1
                                      ? targets[0]
                                      : '',
                                voteInputs: nextState,
                                voteInputKey: voteInput?.key,
                                voteMultiplier: voteInput?.multiplier ?? 1,
                                submittedVoteAt: Date.now(),
                              });
                            }
                          : undefined
                      }
                    />
                  </MarkdownRendererInputDataProvider>
                  {canVote && (
                    <Pressable
                      onPress={() => {
                        if (isSkipVote) {
                          const voteInput = inspectMarkdownVoteInput(
                            voteMessage,
                            currentVoteState,
                            {
                              capability: 'player',
                              players: userTable,
                              roles: roleTable.value,
                              currentUserId,
                              currentEmail,
                              currentDay: dayIndex,
                              dayDates: dayDateStrings,
                              schedule,
                              userTableTitle,
                              morningMessagesList,
                            }
                          );
                          const targets = voteInput
                            ? normalizeVoteTargets(currentVoteState[voteInput.key])
                            : [];
                          setSubmission({
                            ...submission.value,
                            vote: targets.length > 1 ? targets : targets[0] || '',
                            voteMultiplier: voteInput?.multiplier ?? 1,
                            submittedVoteAt: Date.now(),
                          });
                        } else {
                          setSubmission({
                            ...submission.value,
                            vote: 'SKIP_VOTE',
                            submittedVoteAt: Date.now(),
                          });
                        }
                      }}
                      className="self-start">
                      <Row className="items-center gap-2">
                        <View
                          className={`h-5 w-5 items-center justify-center rounded border ${isSkipVote ? 'bg-text border-text' : 'border-border bg-background'}`}>
                          {isSkipVote && (
                            <FontText weight="bold" color="white" className="text-xs">
                              ✓
                            </FontText>
                          )}
                        </View>
                        <FontText weight="medium" className={isSkipVote ? '' : 'opacity-70'}>
                          Skip Vote
                        </FontText>
                      </Row>
                    </Pressable>
                  )}
                </Column>
              </ChainWraper>
              {isSkipVote ? (
                <FontText variant="subtext">You have skipped your vote.</FontText>
              ) : currentVoteSummary ? (
                <FontText variant="subtext">Saved vote: {currentVoteSummary}</FontText>
              ) : roleData?.doesRoleVote === false ? (
                <FontText variant="subtext">This role doesn&apos;t submit a vote.</FontText>
              ) : isVoteLocked ? (
                <FontText variant="subtext">
                  Saved vote: {currentVoteSummary || 'No vote submitted.'}
                </FontText>
              ) : null}
            </>
          )}
        </Column>
        <Column className="min-w-[300px] flex-1">
          {isActionsSkipped ? (
            <Column className="gap-3">
              <FontText weight="medium" className="text-sm uppercase tracking-[0.24em] opacity-60">
                Action
              </FontText>
              <FontText variant="subtext">Actions are skipped for this day.</FontText>
            </Column>
          ) : (
            <>
              <ChainWraper className="min-w-[300px] flex-1" isDisabled={isActionLocked}>
                <Column className="gap-3">
                  <FontText
                    weight="medium"
                    className="text-sm uppercase tracking-[0.24em] opacity-60">
                    Action
                  </FontText>
                  <MarkdownRendererInputDataProvider
                    playerOptions={playerOptions}
                    roleOptions={roleOptions}
                    scriptSources={{
                      capability: 'player',
                      players: userTable,
                      roles: roleTable.value,
                      currentUserId,
                      currentEmail,
                      currentDay: dayIndex,
                      dayDates: dayDateStrings,
                      schedule,
                      userTableTitle,
                      morningMessagesList,
                    }}>
                    {roleData?.roleMessage?.trim().length ? (
                      <MarkdownRenderer
                        markdown={roleData.roleMessage}
                        state={currentActionState}
                        setState={
                          !isActionLocked
                            ? (nextState) => {
                                setSubmission({
                                  ...submission.value,
                                  action: nextState,
                                  submittedActionAt: Date.now(),
                                });
                              }
                            : undefined
                        }
                      />
                    ) : (
                      <FontText variant="subtext">
                        You do not have any action set for your role.
                      </FontText>
                    )}
                  </MarkdownRendererInputDataProvider>
                </Column>
              </ChainWraper>
              {isActionLocked ? (
                currentActionSummary.trim().length > 0 ? (
                  <FontText variant="subtext">Saved action: {currentActionSummary}</FontText>
                ) : (
                  <FontText variant="subtext">The action window has closed for this day.</FontText>
                )
              ) : currentActionSummary.trim().length > 0 ? (
                <FontText variant="subtext">Current action: {currentActionSummary}</FontText>
              ) : null}
            </>
          )}
        </Column>
      </Row>
    </Column>
  );
};

export default YourEyesOnlyDayContentPLAYER;
