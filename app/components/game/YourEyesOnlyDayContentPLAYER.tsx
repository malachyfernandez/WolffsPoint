import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppDropdown from '../ui/forms/AppDropdown';
import MarkdownRenderer, {
  MarkdownRendererInputDataProvider,
} from '../ui/markdown/MarkdownRenderer';
import ChainWraper from './ChainWraper';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import { useSharedVariableValue } from '../../../hooks/useSharedVariableValue';
import { useValue } from '../../../hooks/useData';
import { PlayerNightSubmission } from '../../../types/multiplayer';
import { RoleTableItem } from '../../../types/roleTable';
import { UserTableItem, UserTableTitle } from '../../../types/playerTable';
import { planMarkdownScriptUpdates } from '../../../utils/runMarkdownScriptsWithUpdates';
import { PlannedUpdate } from '../../../types/multiplayer';
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
  const scheduleRecord = useSharedVariableValue({
    key: getGameScopedKey('gameSchedule', gameId),
    defaultValue: defaultGameSchedule,
    userIds: operatorUserIds,
  });
  const [now, setNow] = useState(() => new Date());

  const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
  const currentDayIndex = useMemo(() => getCurrentPlayableDayIndex(dayDates), [dayDates]);
  const schedule = normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule);
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
    morningMessagesList,
  ]);

  // Persist planned updates into the submission whenever they change
  useEffect(() => {
    const current = submission.value.plannedUpdates ?? [];
    const newJson = JSON.stringify(plannedUpdates);
    const curJson = JSON.stringify(current);
    if (newJson !== curJson && (plannedUpdates.length > 0 || current.length > 0)) {
      setSubmission({
        ...submission.value,
        plannedUpdates: plannedUpdates.length > 0 ? plannedUpdates : undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannedUpdates]);

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
                  <AppDropdown
                    options={voteOptions}
                    value={isSkipVote ? '' : submission.value.vote}
                    onValueChange={(value) => {
                      if (isVoteLocked || roleData?.doesRoleVote === false || isSkipVote) {
                        return;
                      }

                      setSubmission({
                        ...submission.value,
                        vote: value,
                        submittedVoteAt: Date.now(),
                      });
                    }}
                    placeholder={
                      roleData?.doesRoleVote === false
                        ? 'This role does not vote'
                        : isSkipVote
                          ? 'Vote skipped'
                          : 'Choose a player'
                    }
                    triggerClassName="rounded-2xl border border-border/15 bg-none px-4 py-4"
                    contentClassName="border border-border/15"
                    disabled={isVoteLocked || roleData?.doesRoleVote === false || isSkipVote}
                  />
                  {canVote && (
                    <Pressable
                      onPress={() => {
                        if (isSkipVote) {
                          setSubmission({
                            ...submission.value,
                            vote: '',
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
              ) : !!submission.value.vote ? (
                <FontText variant="subtext">Saved vote: {submission.value.vote}</FontText>
              ) : roleData?.doesRoleVote === false ? (
                <FontText variant="subtext">This role doesn&apos;t submit a vote.</FontText>
              ) : isVoteLocked ? (
                <FontText variant="subtext">
                  Saved vote: {submission.value.vote || 'No vote submitted.'}
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
              {plannedUpdateSummaries.length > 0 && (
                <Column className="gap-1 pt-1">
                  <FontText variant="subtext" className="text-xs opacity-70">
                    Will update on certify:
                  </FontText>
                  {plannedUpdateSummaries.map((summary, i) => (
                    <FontText key={i} variant="subtext" className="text-xs">
                      • {summary}
                    </FontText>
                  ))}
                </Column>
              )}
            </>
          )}
        </Column>
      </Row>
    </Column>
  );
};

export default YourEyesOnlyDayContentPLAYER;
