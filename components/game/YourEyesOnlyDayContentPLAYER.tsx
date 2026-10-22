import { useEffect, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer, {
  MarkdownRendererInputDataProvider,
} from '../ui/markdown/MarkdownRenderer';
import ChainWraper from './ChainWraper';
import { useGameOperatorUserId } from 'hooks/useGameOperatorUserId';
import { useNow } from 'hooks/useNow';
import { useScriptFilesReader } from 'hooks/useScriptFiles';
import { useSharedListValue } from 'hooks/useSharedListValue';
import { useSharedVariableValue } from 'hooks/useSharedVariableValue';
import { useValue } from 'hooks/useData';
import { PlannedUpdate, PlayerNightSubmission } from 'types/multiplayer';
import { DEFAULT_VOTE_MESSAGE, RoleTableItem } from 'types/roleTable';
import { UserTableItem, UserTableTitle } from 'types/playerTable';
import {
  inspectMarkdownVoteInput,
  planMarkdownScriptUpdates,
} from 'utils/runMarkdownScriptsWithUpdates';
import {
  defaultGameSchedule,
  formatContextualDateLabel,
  formatCountdown,
  formatInstantTimeLabel,
  formatRelativeDuration,
  getCurrentPlayableDayIndex,
  getDayDeadlineInstant,
  getDayEndDate,
  getGameScopedKey,
  getPlayerActionSummary,
  normalizeVoteTargets,
  isDayContentReleased,
  isDayDeadlineOpen,
  normalizeGameSchedule,
  normalizePlayerActionState,
  parseStoredDayDates,
  resolveGameTimeZone,
} from 'utils/multiplayer';
import { getZonedDayToken } from 'utils/timezone';
import { deepEqual } from 'utils/deepEqual';
import { nowMs } from 'utils/simNow';

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
  // File-mode cells: resolve File(...) lists into flat markdown here, at the
  // render seam, so everything downstream sees one mega-script.
  const { resolve: resolveCellText, index: scriptFilesIndex } = useScriptFilesReader(
    gameId,
    operatorUserIds
  );
  const now = useNow(1000);

  const dayDates = useMemo(() => parseStoredDayDates(dayDateStrings), [dayDateStrings]);
  const schedule = useMemo(
    () => normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule),
    [scheduleRecord.value]
  );
  const gameTimeZone = resolveGameTimeZone(schedule);
  const currentDayIndex = useMemo(
    () => getCurrentPlayableDayIndex(dayDates, now, gameTimeZone),
    [dayDates, gameTimeZone, now]
  );
  const selectedDayEndDate = useMemo(
    () => getDayEndDate(dayDates, dayIndex, numberOfRealDaysPerInGameDay),
    [dayDates, dayIndex, numberOfRealDaysPerInGameDay]
  );
  const selectedMorningDayIndex = dayIndex - 1;
  const hasSelectedMorning =
    selectedMorningDayIndex >= 0 &&
    isDayContentReleased(
      dayDates,
      selectedMorningDayIndex,
      schedule.wakeUpTime,
      now,
      gameTimeZone,
      schedule,
      numberOfRealDaysPerInGameDay
    );
  const matchingPlayer = useMemo(
    () =>
      userTable.find(
        (user) => user.email.trim().toLowerCase() === currentEmail.trim().toLowerCase()
      ),
    [currentEmail, userTable]
  );
  const roleData = roleTable.value.find((roleItem) => roleItem.role === matchingPlayer?.role);
  const resolvedRoleMessage = useMemo(
    () => resolveCellText(roleData?.roleMessage ?? ''),
    [roleData?.roleMessage, resolveCellText]
  );
  const resolvedMorningMessagesList = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(morningMessagesList).map(([email, msgs]) => [
          email,
          msgs.map(resolveCellText),
        ])
      ),
    [morningMessagesList, resolveCellText]
  );
  const voteMessage = useMemo(
    () =>
      resolveCellText(
        roleData?.voteMessage?.trim()
          ? roleData.voteMessage
          : defaultVoteMessage || DEFAULT_VOTE_MESSAGE
      ),
    [roleData?.voteMessage, defaultVoteMessage, resolveCellText]
  );
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
  const isVoteLocked =
    dayIndex < currentDayIndex ||
    !isDayDeadlineOpen(selectedDayEndDate, schedule, 'vote', now, gameTimeZone);
  const isActionLocked =
    dayIndex < currentDayIndex ||
    !isDayDeadlineOpen(selectedDayEndDate, schedule, 'action', now, gameTimeZone);
  const isVotingSkipped = (skipVotingDays ?? []).includes(dayIndex);
  const isActionsSkipped = (skipActionsDays ?? []).includes(dayIndex);
  const isSkipVote = submission.value.vote === 'SKIP_VOTE';
  const canVote = !isVoteLocked && roleData?.doesRoleVote !== false;
  // The morning message the player sees today (written by the operator during
  // the previous night). This is shown in the Action section with interactive
  // inputs that feed into the same submission state as the role message.
  const currentMorningMessage = hasSelectedMorning
    ? (resolvedMorningMessagesList[currentEmail.toLowerCase()]?.[selectedMorningDayIndex] ?? '')
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
  // message script at input time. This runs the scripts in "planning mode",
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
      morningMessagesList: resolvedMorningMessagesList,
      filesIndex: scriptFilesIndex,
    };
    const allPlanned: PlannedUpdate[] = [];
    // Role message script
    if (resolvedRoleMessage.trim()) {
      const { plannedUpdates, issues } = planMarkdownScriptUpdates(
        resolvedRoleMessage,
        actionState,
        scriptSourceData,
        userTable,
        titles,
        resolvedMorningMessagesList,
        scriptFilesIndex
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
        resolvedMorningMessagesList,
        scriptFilesIndex
      );
      if (issues.length > 0) console.warn('Morning message script issues:', issues);
      allPlanned.push(...plannedUpdates);
    }
    return allPlanned;
  }, [
    resolvedRoleMessage,
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
    resolvedMorningMessagesList,
    scriptFilesIndex,
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
        morningMessagesList: resolvedMorningMessagesList,
        filesIndex: scriptFilesIndex,
      },
      userTable,
      userTableTitle,
      resolvedMorningMessagesList,
      scriptFilesIndex
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
    resolvedMorningMessagesList,
    roleTable.value,
    scriptFilesIndex,
    userTable,
    userTableTitle,
    voteMessage,
  ]);

  // Persist planned updates into the submission whenever they change.
  // NOTE: use deepEqual (not JSON.stringify) because Convex re-sorts object
  // keys alphabetically on round-trip, so string comparison would never match
  // and the effect would write forever (infinite user_vars:set loop).
  useEffect(() => {
    const currentActionUpdates = submission.value.plannedUpdates ?? [];
    const currentVoteUpdates = submission.value.votePlannedUpdates ?? [];
    const actionDiff = !deepEqual(plannedUpdates, currentActionUpdates);
    const voteDiff = !deepEqual(votePlannedUpdates, currentVoteUpdates);
    if (actionDiff || voteDiff) {
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
    () => getDayDeadlineInstant(selectedDayEndDate, schedule, 'vote', gameTimeZone),
    [selectedDayEndDate, schedule, gameTimeZone]
  );
  const actionDeadline = useMemo(
    () => getDayDeadlineInstant(selectedDayEndDate, schedule, 'action', gameTimeZone),
    [selectedDayEndDate, schedule, gameTimeZone]
  );

  // Determine which deadline comes first
  const isVoteFirst = voteDeadline.getTime() <= actionDeadline.getTime();
  const bothSkipped = isVotingSkipped && isActionsSkipped;
  // A skipped deadline can never be primary. If both are skipped, neither is
  // primary and the countdown renders as SKIPPED. If only one is skipped, the
  // other deadline stays primary for the whole day (no switch-over).
  const isVotePrimary = bothSkipped
    ? false
    : isVotingSkipped
      ? false
      : isActionsSkipped
        ? true
        : isVoteFirst && !(isVoteLocked && !isActionLocked);
  const primaryDeadline = isVotePrimary ? voteDeadline : actionDeadline;
  const primaryCountdown = bothSkipped
    ? 'SKIPPED'
    : (isVotePrimary ? isVoteLocked : isActionLocked)
      ? 'LOCKED'
      : formatCountdown(primaryDeadline, now);
  const primaryLabel = isVotePrimary ? 'VOTE' : 'ACTION';
  const primaryTimeLabel = formatInstantTimeLabel(primaryDeadline, gameTimeZone);
  const secondaryDeadline = isVotePrimary ? actionDeadline : voteDeadline;
  const secondaryTimeLabel = formatInstantTimeLabel(secondaryDeadline, gameTimeZone);
  const secondaryIsLocked = isVotePrimary ? isActionLocked : isVoteLocked;
  const secondaryLabel = isVotePrimary ? 'Actions' : 'Voting';
  const secondarySkipped = isVotePrimary ? isActionsSkipped : isVotingSkipped;
  // Deadlines are real instants: convert to the game-zone calendar day so
  // the today/tomorrow label matches what the schedule means.
  const deadlineDayToken = (instant: Date) => getZonedDayToken(instant.getTime(), gameTimeZone);
  const primaryDateLabel = formatContextualDateLabel(
    deadlineDayToken(primaryDeadline),
    undefined,
    now,
    'lower',
    gameTimeZone
  );
  const secondaryDateLabel = formatContextualDateLabel(
    deadlineDayToken(secondaryDeadline),
    undefined,
    now,
    'lower',
    gameTimeZone
  );

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
                morningMessagesList: resolvedMorningMessagesList,
                filesIndex: scriptFilesIndex,
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
                          submittedActionAt: nowMs(),
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
        {bothSkipped ? (
          <>
            <FontText weight="bold" className="leading-14 text-5xl">
              SKIPPED
            </FontText>
            <FontText variant="subtext">Voting skipped this day</FontText>
            <FontText variant="subtext">Actions skipped this day</FontText>
          </>
        ) : (
          <>
            <FontText weight="bold" className="text-lg tracking-[0.45em]">
              {primaryLabel}
            </FontText>
            <FontText weight="bold" className="leading-14 text-5xl">
              {primaryCountdown}
            </FontText>
            <FontText variant="subtext">
              {primaryLabel === 'VOTE'
                ? `Voting due ${primaryDateLabel} at ${primaryTimeLabel}.`
                : `Actions due ${primaryDateLabel} at ${primaryTimeLabel}.`}
            </FontText>
            <FontText variant="subtext">
              {secondarySkipped
                ? `${secondaryLabel} skipped this day`
                : secondaryIsLocked
                  ? `${secondaryLabel} due ${secondaryDateLabel} at ${secondaryTimeLabel}.`
                  : `${secondaryLabel} due in ${formatRelativeDuration(secondaryDeadline, now)} (${secondaryTimeLabel}).`}
            </FontText>
          </>
        )}
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
                      morningMessagesList: resolvedMorningMessagesList,
                      filesIndex: scriptFilesIndex,
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
                                morningMessagesList: resolvedMorningMessagesList,
                                filesIndex: scriptFilesIndex,
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
                                submittedVoteAt: nowMs(),
                              });
                            }
                          : undefined
                      }
                    />
                  </MarkdownRendererInputDataProvider>
                  {canVote && (
                    <Pressable
                      onPress={() => {
                        const voteInput = inspectMarkdownVoteInput(voteMessage, currentVoteState, {
                          capability: 'player',
                          players: userTable,
                          roles: roleTable.value,
                          currentUserId,
                          currentEmail,
                          currentDay: dayIndex,
                          dayDates: dayDateStrings,
                          schedule,
                          userTableTitle,
                          morningMessagesList: resolvedMorningMessagesList,
                          filesIndex: scriptFilesIndex,
                        });
                        if (isSkipVote) {
                          const targets = voteInput
                            ? normalizeVoteTargets(currentVoteState[voteInput.key])
                            : [];
                          setSubmission({
                            ...submission.value,
                            vote: targets.length > 1 ? targets : targets[0] || '',
                            voteMultiplier: voteInput?.multiplier ?? 1,
                            submittedVoteAt: nowMs(),
                          });
                        } else {
                          setSubmission({
                            ...submission.value,
                            vote: 'SKIP_VOTE',
                            voteMultiplier: voteInput?.multiplier ?? 1,
                            submittedVoteAt: nowMs(),
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
                      morningMessagesList: resolvedMorningMessagesList,
                      filesIndex: scriptFilesIndex,
                    }}>
                    {resolvedRoleMessage.trim().length ? (
                      <MarkdownRenderer
                        markdown={resolvedRoleMessage}
                        state={currentActionState}
                        setState={
                          !isActionLocked
                            ? (nextState) => {
                                setSubmission({
                                  ...submission.value,
                                  action: nextState,
                                  submittedActionAt: nowMs(),
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
