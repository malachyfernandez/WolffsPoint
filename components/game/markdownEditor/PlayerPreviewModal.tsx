import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import FontText from '../../ui/text/FontText';
import AppDropdown from '../../ui/forms/AppDropdown';
import ShadowScrollView from '../../ui/ShadowScrollView';
import MarkdownRenderer, {
  MarkdownRendererInputDataProvider,
} from '../../ui/markdown/MarkdownRenderer';
import ChainWraper from '../ChainWraper';
import { useFindValues, useList, useValue } from 'hooks/useData';
import { UserTableItem, UserTableTitle } from 'types/playerTable';
import { DEFAULT_VOTE_MESSAGE, RoleTableItem } from 'types/roleTable';
import { PlayerNightSubmission } from 'types/multiplayer';
import type { ScriptSourceData } from '../../../script/runtime/sources';
import {
  buildScheduledDate,
  defaultGameSchedule,
  formatCountdown,
  formatTimeLabel,
  getCurrentPlayableDayIndex,
  getDayEndDate,
  getDayRangeLabel,
  getGameScopedKey,
  isDayContentReleased,
  isNightWindowOpen,
  normalizeGameSchedule,
  normalizePlayerActionState,
  normalizeVoteTargets,
  parseStoredDayDates,
  resolveGameTimeZone,
} from 'utils/multiplayer';
import CloseButton from '../../ui/dialog/CloseButton';

interface PlayerPreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  /** Role-scoped preview (opened from the role message editor): the player
   *  dropdown is limited to players with this role. */
  roleName?: string;
  /** Row-scoped preview (opened from a player row in the operator tables):
   *  preselects this player and lets the operator switch between all players. */
  playerEmail?: string;
  /** Day the preview opens on. Defaults to the game's selected day index. */
  initialDayIndex?: number;
}

/**
 * Modal that lets an operator preview the "your eyes only" page as a specific
 * player. Uses client-side state only — nothing is saved to Convex.
 */
const PlayerPreviewModal = ({
  isOpen,
  onOpenChange,
  gameId,
  roleName = '',
  playerEmail,
  initialDayIndex,
}: PlayerPreviewModalProps) => {
  const [selectedPlayerEmail, setSelectedPlayerEmail] = useState<string | undefined>();
  const [emulatedVoteState, setEmulatedVoteState] = useState<Record<string, string | undefined>>(
    {}
  );
  // Emulated action state — client-side only, never saved
  const [emulatedActionState, setEmulatedActionState] = useState<
    Record<string, string | undefined>
  >({});
  const [isSkipVote, setIsSkipVote] = useState(false);

  const [userTable] = useList<UserTableItem[]>('userTable', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
  });
  const [roleTable] = useList<RoleTableItem[]>('roleTable', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
  });
  const [userTableTitle] = useList<UserTableTitle>('userTableTitle', gameId, {
    privacy: 'PUBLIC',
  });
  const [dayDatesArray] = useList<string[]>('dayDatesArray', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
  });
  const [numberOfRealDaysPerInGameDay] = useList<number>('numberOfRealDaysPerInGameDay', gameId, {
    privacy: 'PUBLIC',
    defaultValue: 2,
  });
  const [selectedDayIndex] = useList<number>('selectedDayIndex', gameId, {
    privacy: 'PUBLIC',
    defaultValue: 0,
  });
  const [skipVotingDays] = useList<number[]>('skipVotingDays', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
  });
  const [skipActionsDays] = useList<number[]>('skipActionsDays', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
  });
  const [defaultVoteMessage] = useList<string>('voteMessageDefault', gameId, {
    privacy: 'PUBLIC',
    defaultValue: DEFAULT_VOTE_MESSAGE,
  });
  const [morningMessagesRecord] = useList<Record<string, string[]>>('morningMessagesList', gameId, {
    privacy: 'PUBLIC',
    defaultValue: {},
  });
  const [scheduleRecord] = useValue(getGameScopedKey('gameSchedule', gameId), {
    defaultValue: defaultGameSchedule,
  });

  const players = useMemo(() => userTable?.value ?? [], [userTable?.value]);
  const roles = useMemo(() => roleTable?.value ?? [], [roleTable?.value]);
  const morningMessagesList = useMemo(
    () => morningMessagesRecord?.value ?? {},
    [morningMessagesRecord?.value]
  );

  const isPlayerScopedPreview = playerEmail !== undefined;

  // Filter players to only those with the matching role
  const rolePlayers = useMemo(
    () =>
      players.filter(
        (player) => player.role.trim().toLowerCase() === roleName.trim().toLowerCase()
      ),
    [players, roleName]
  );
  // Row-scoped previews can switch between every player; role-scoped previews
  // stay limited to players that have the role.
  const previewablePlayers = isPlayerScopedPreview ? players : rolePlayers;

  // The preview is decoupled from the real clock — it opens on the requested
  // day and every day created in the table is navigable.
  const [previewDayIndex, setPreviewDayIndex] = useState(0);
  const dayDates = useMemo(() => dayDatesArray?.value ?? [], [dayDatesArray?.value]);
  const parsedDayDates = useMemo(() => parseStoredDayDates(dayDates), [dayDates]);
  const daySpan = numberOfRealDaysPerInGameDay?.value ?? 2;
  const maxDayIndex = Math.max(parsedDayDates.length - 1, 0);
  const schedule = useMemo(
    () => normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule),
    [scheduleRecord.value]
  );
  const voteDeadlineTime =
    schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00';
  const actionDeadlineTime =
    schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00';

  // === Player emulation ===
  // The preview "believes" it is the selected game day: an emulated `now` is
  // placed just after wake-up on that day's start date (in the game's
  // timezone), so release gating, deadline windows, locks, and the countdown
  // all evaluate exactly as they would for the player on that day — regardless
  // of the real clock.
  const gameTimeZone = useMemo(() => resolveGameTimeZone(schedule), [schedule]);
  const emulatedNow = useMemo(() => {
    const dayStart = parsedDayDates[previewDayIndex];
    if (!dayStart) return new Date();
    return new Date(
      buildScheduledDate(dayStart, schedule.wakeUpTime, gameTimeZone).getTime() + 60_000
    );
  }, [parsedDayDates, previewDayIndex, schedule.wakeUpTime, gameTimeZone]);
  const emulatedCurrentDayIndex = useMemo(
    () => getCurrentPlayableDayIndex(parsedDayDates, emulatedNow, gameTimeZone),
    [parsedDayDates, emulatedNow, gameTimeZone]
  );
  const selectedDayEndDate = useMemo(
    () => getDayEndDate(parsedDayDates, previewDayIndex, daySpan),
    [parsedDayDates, previewDayIndex, daySpan]
  );
  const voteDeadlineBaseDate = useMemo(
    () =>
      new Date(
        selectedDayEndDate.getTime() - (schedule.voteDayOffset ?? 0) * 24 * 60 * 60 * 1000
      ),
    [selectedDayEndDate, schedule.voteDayOffset]
  );
  const actionDeadlineBaseDate = useMemo(
    () =>
      new Date(
        selectedDayEndDate.getTime() - (schedule.actionDayOffset ?? 0) * 24 * 60 * 60 * 1000
      ),
    [selectedDayEndDate, schedule.actionDayOffset]
  );
  const voteDeadline = useMemo(
    () => buildScheduledDate(voteDeadlineBaseDate, voteDeadlineTime, gameTimeZone),
    [voteDeadlineBaseDate, voteDeadlineTime, gameTimeZone]
  );
  const actionDeadline = useMemo(
    () => buildScheduledDate(actionDeadlineBaseDate, actionDeadlineTime, gameTimeZone),
    [actionDeadlineBaseDate, actionDeadlineTime, gameTimeZone]
  );
  const isVoteLocked =
    previewDayIndex < emulatedCurrentDayIndex ||
    !isNightWindowOpen(voteDeadlineBaseDate, voteDeadlineTime, emulatedNow, gameTimeZone);
  const isActionLocked =
    previewDayIndex < emulatedCurrentDayIndex ||
    !isNightWindowOpen(actionDeadlineBaseDate, actionDeadlineTime, emulatedNow, gameTimeZone);
  const isVotingSkipped = (skipVotingDays?.value ?? []).includes(previewDayIndex);
  const isActionsSkipped = (skipActionsDays?.value ?? []).includes(previewDayIndex);
  const bothSkipped = isVotingSkipped && isActionsSkipped;
  const isVotePrimary = bothSkipped
    ? false
    : isVotingSkipped
      ? false
      : isActionsSkipped
        ? true
        : voteDeadline.getTime() <= actionDeadline.getTime();
  const primaryDeadline = isVotePrimary ? voteDeadline : actionDeadline;
  const primaryLocked = isVotePrimary ? isVoteLocked : isActionLocked;
  const primaryLabel = isVotePrimary ? 'VOTE' : 'ACTION';
  const primaryTimeLabel = isVotePrimary ? voteDeadlineTime : actionDeadlineTime;
  const primaryCountdown = primaryLocked ? 'LOCKED' : formatCountdown(primaryDeadline, emulatedNow);
  const secondarySkipped = isVotePrimary ? isActionsSkipped : isVotingSkipped;
  const secondaryTimeLabel = isVotePrimary ? actionDeadlineTime : voteDeadlineTime;
  const secondaryLabel = isVotePrimary ? 'Actions' : 'Voting';

  // The previewed player's real submission for the selected day seeds the
  // emulated input state — scripts that branch on Inputs (and the inputs
  // themselves) reflect what that player actually submitted.
  const submissionKey = getGameScopedKey(
    `playerNightSubmission-day-${previewDayIndex}`,
    gameId
  );
  const submissionRecords = useFindValues<PlayerNightSubmission>(submissionKey, {
    returnTop: 200,
  });
  const selectedSubmission = useMemo(
    () =>
      (submissionRecords ?? []).find(
        (record: any) =>
          record.value?.playerEmail?.trim()?.toLowerCase() ===
          selectedPlayerEmail?.trim()?.toLowerCase()
      )?.value,
    [submissionRecords, selectedPlayerEmail]
  );

  const selectedDayRangeLabel = useMemo(
    () => getDayRangeLabel(parsedDayDates, previewDayIndex, daySpan),
    [parsedDayDates, previewDayIndex, daySpan]
  );
  const previousDayLabel = useMemo(
    () =>
      previewDayIndex > 0 ? getDayRangeLabel(parsedDayDates, previewDayIndex - 1, daySpan) : '',
    [parsedDayDates, previewDayIndex, daySpan]
  );
  const nextDayLabel = useMemo(
    () =>
      previewDayIndex < maxDayIndex
        ? getDayRangeLabel(parsedDayDates, previewDayIndex + 1, daySpan)
        : '',
    [parsedDayDates, previewDayIndex, maxDayIndex, daySpan]
  );

  useEffect(() => {
    if (!isOpen) return;
    const requested = initialDayIndex ?? selectedDayIndex?.value ?? 0;
    setPreviewDayIndex(Math.min(Math.max(requested, 0), Math.max(parsedDayDates.length - 1, 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keep the previewed day inside the table's created days as they load in.
  useEffect(() => {
    setPreviewDayIndex((current) => Math.min(Math.max(current, 0), maxDayIndex));
  }, [maxDayIndex]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!isOpen) return;
    setSelectedPlayerEmail((currentEmail) => {
      // A fresh row-scoped open always previews the row that was clicked —
      // the previous selection may linger if the dialog was closed through a
      // path that skipped the reset (e.g. the X button).
      if (justOpened && isPlayerScopedPreview) {
        const requestedPlayer = players.find(
          (player) => player.email.toLowerCase() === playerEmail.toLowerCase()
        );
        if (requestedPlayer) return requestedPlayer.email;
      }
      const currentPlayerStillExists = previewablePlayers.some(
        (player) => player.email.toLowerCase() === currentEmail?.toLowerCase()
      );
      if (currentPlayerStillExists) return currentEmail;
      if (isPlayerScopedPreview) {
        const requestedPlayer = players.find(
          (player) => player.email.toLowerCase() === playerEmail.toLowerCase()
        );
        if (requestedPlayer) return requestedPlayer.email;
      }
      return (
        previewablePlayers.find((player) => player.playerData.livingState === 'alive') ??
        previewablePlayers[0]
      )?.email;
    });
  }, [isOpen, previewablePlayers, isPlayerScopedPreview, playerEmail, players]);

  // Seed the emulated input state from the player's real submission once per
  // (player, day) — waits for submission records to load so it doesn't clobber
  // real data with an empty seed. Operator edits after seeding are kept.
  const seededForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      seededForRef.current = null;
      return;
    }
    const seedKey = `${selectedPlayerEmail ?? ''}:${previewDayIndex}`;
    if (seededForRef.current === seedKey || submissionRecords === undefined) return;
    seededForRef.current = seedKey;
    setEmulatedActionState(normalizePlayerActionState(selectedSubmission?.action));
    const targets = normalizeVoteTargets(selectedSubmission?.vote);
    setEmulatedVoteState(
      selectedSubmission?.voteInputs ??
        (targets.length === 0 || targets[0] === 'SKIP_VOTE'
          ? {}
          : { Vote: targets.length === 1 ? targets[0] : JSON.stringify(targets) })
    );
    setIsSkipVote(selectedSubmission?.vote === 'SKIP_VOTE');
  }, [isOpen, selectedPlayerEmail, previewDayIndex, submissionRecords, selectedSubmission]);

  const playerDropdownOptions = useMemo(
    () =>
      previewablePlayers.map((player) => ({
        value: player.email,
        label: `${player.realName}${player.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
      })),
    [previewablePlayers]
  );

  const selectedPlayer = useMemo(
    () =>
      previewablePlayers.find(
        (player) => player.email.toLowerCase() === selectedPlayerEmail?.toLowerCase()
      ),
    [previewablePlayers, selectedPlayerEmail]
  );

  // In row-scoped previews the role comes from whichever player is selected.
  const effectiveRoleName = isPlayerScopedPreview ? (selectedPlayer?.role ?? '') : roleName;
  const roleData = useMemo(
    () =>
      roles.find(
        (role) => role.role.trim().toLowerCase() === effectiveRoleName.trim().toLowerCase()
      ),
    [effectiveRoleName, roles]
  );

  // The "Last Night" card mirrors YourEyesOnlyDayContentPLAYER: on game day D
  // the player sees the message the operator wrote during night D - 1,
  // released at wake-up — evaluated against the emulated clock.
  const previewMorningMessage = useMemo(() => {
    if (!selectedPlayer || previewDayIndex <= 0) return '';
    if (
      !isDayContentReleased(
        parsedDayDates,
        previewDayIndex - 1,
        schedule.wakeUpTime,
        emulatedNow,
        gameTimeZone
      )
    ) {
      return '';
    }
    return morningMessagesList[selectedPlayer.email.toLowerCase()]?.[previewDayIndex - 1] ?? '';
  }, [
    morningMessagesList,
    previewDayIndex,
    selectedPlayer,
    parsedDayDates,
    schedule.wakeUpTime,
    emulatedNow,
    gameTimeZone,
  ]);
  const voteMessage = roleData?.voteMessage?.trim()
    ? roleData.voteMessage
    : defaultVoteMessage?.value || DEFAULT_VOTE_MESSAGE;

  // Build player options for the MarkdownRendererInputDataProvider (all players, not just role)
  const previewPlayerOptions = useMemo(
    () =>
      players.map((player) => ({
        value: player.realName,
        label: `${player.realName}${player.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
        meta: { livingState: player.playerData.livingState },
      })),
    [players]
  );

  // Build role options (visible roles only, like the player view)
  const previewRoleOptions = useMemo(
    () =>
      roles
        .filter((role) => role.role.trim().length > 0 && role.isVisible !== false)
        .map((role) => ({ value: role.role, label: role.role })),
    [roles]
  );

  // Build player-perspective script sources for the selected game day
  const previewSources = useMemo<ScriptSourceData | undefined>(() => {
    if (!selectedPlayer) return undefined;
    return {
      capability: 'player',
      players,
      roles,
      currentUserId: selectedPlayer.userId,
      currentEmail: selectedPlayer.email,
      currentDay: previewDayIndex,
      dayDates,
      schedule,
      userTableTitle: userTableTitle?.value,
      morningMessagesList,
    };
  }, [
    previewDayIndex,
    dayDates,
    players,
    roles,
    schedule,
    selectedPlayer,
    userTableTitle?.value,
    morningMessagesList,
  ]);

  const actionSummary = Object.values(emulatedActionState)
    .filter((value): value is string => Boolean(value))
    .join(', ');
  const voteSummary = Object.values(emulatedVoteState)
    .filter((value): value is string => Boolean(value))
    .join(', ');

  const handleOpenChange = (open: boolean) => {
    if (!open) setSelectedPlayerEmail(undefined);
    onOpenChange(open);
  };

  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="h-[90vh]">
          <CloseButton onPress={() => handleOpenChange(false)} />
          <DialogHeader
            text="Preview As Player"
            subtext={
              isPlayerScopedPreview
                ? `Player: ${selectedPlayer?.realName || playerEmail || 'Unknown'}`
                : `Role: ${roleName || 'Unnamed role'}`
            }
          />

          <Column className="min-h-0 flex-1 gap-3 pt-3">
            {previewablePlayers.length === 0 ? (
              <View className="border-subtle-border bg-text/5 rounded-lg border p-4">
                {isPlayerScopedPreview ? (
                  <FontText variant="subtext" className="text-center">
                    There are no players in this game to preview.
                  </FontText>
                ) : (
                  <>
                    <FontText variant="subtext" className="text-center">
                      No players are assigned to the role &quot;{roleName || 'Unnamed role'}&quot;.
                    </FontText>
                    <FontText variant="subtext" className="mt-1 text-center">
                      Assign a player to this role to preview their view.
                    </FontText>
                  </>
                )}
              </View>
            ) : (
              <>
                {/* Player selector — filtered by role */}
                <Row className="items-center gap-2">
                  <FontText variant="subtext" className="whitespace-nowrap text-xs">
                    View as:
                  </FontText>
                  <AppDropdown
                    options={playerDropdownOptions}
                    value={selectedPlayerEmail}
                    onValueChange={setSelectedPlayerEmail}
                    placeholder="Select a player"
                    triggerClassName="rounded-lg border border-border/15 bg-none px-3 py-2 flex-1"
                    contentClassName="border border-border/15"
                    isInDialog
                  />
                </Row>

                {/* Preview area */}
                {selectedPlayer && previewSources && (
                  <ShadowScrollView className="flex-1" scrollViewClassName="flex-1 px-4 py-4">
                    <MarkdownRendererInputDataProvider
                      playerOptions={previewPlayerOptions}
                      roleOptions={previewRoleOptions}
                      scriptSources={previewSources}>
                      <Column className="min-h-[760px] flex-1 gap-7 pb-8">
                        {roleData?.aboutRole?.trim().length ? (
                          <MarkdownRenderer
                            markdown={roleData.aboutRole}
                            textAlign="center"
                            viewHeightImages={30}
                            isInDialog
                          />
                        ) : (
                          <Column className="items-center gap-4 py-6">
                            <FontText variant="subtext">
                              The operator has not written this role&apos;s about section yet.
                            </FontText>
                          </Column>
                        )}

                        <Column className="border-border/15 gap-5 border-y py-5">
                          <Row className="items-start justify-between gap-4">
                            <Pressable
                              onPress={() =>
                                setPreviewDayIndex((current) => Math.max(0, current - 1))
                              }
                              disabled={previewDayIndex <= 0}
                              className={`w-20 items-center ${previewDayIndex <= 0 ? 'opacity-30' : ''}`}>
                              <ChevronLeft size={28} color="rgb(46, 41, 37)" />
                              <FontText variant="subtext" className="text-center text-xs">
                                {previousDayLabel || ' '}
                              </FontText>
                            </Pressable>

                            <Column className="flex-1 items-center gap-1 pt-1">
                              <FontText weight="medium" className="text-center">
                                {selectedDayRangeLabel || 'Current game day'}
                              </FontText>
                              <FontText variant="subtext" className="text-center text-xs">
                                Day {previewDayIndex + 1}
                              </FontText>
                            </Column>

                            <Pressable
                              onPress={() =>
                                setPreviewDayIndex((current) => Math.min(maxDayIndex, current + 1))
                              }
                              disabled={previewDayIndex >= maxDayIndex}
                              className={`w-20 items-center ${previewDayIndex >= maxDayIndex ? 'opacity-30' : ''}`}>
                              <ChevronRight size={28} color="rgb(46, 41, 37)" />
                              <FontText variant="subtext" className="text-center text-xs">
                                {nextDayLabel || ' '}
                              </FontText>
                            </Pressable>
                          </Row>

                          <Column className="gap-5">
                            <Column className="bg-text/5 m-auto w-full max-w-lg items-center gap-2 rounded p-4">
                              {previewMorningMessage.trim() ? (
                                <>
                                  <FontText variant="cardHeader" className="text-center">
                                    Last Night:
                                  </FontText>
                                  <MarkdownRenderer
                                    markdown={previewMorningMessage}
                                    isInDialog
                                    state={emulatedActionState}
                                    setState={setEmulatedActionState}
                                    className="w-full"
                                    textAlign="center"
                                    viewHeightImages={20}
                                  />
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
                                    {primaryLabel === 'VOTE' ? 'Voting' : 'Actions'} due at{' '}
                                    {formatTimeLabel(primaryTimeLabel)}.
                                  </FontText>
                                  <FontText variant="subtext">
                                    {secondarySkipped
                                      ? `${secondaryLabel} skipped this day`
                                      : `${secondaryLabel} due at ${formatTimeLabel(secondaryTimeLabel)}.`}
                                  </FontText>
                                </>
                              )}
                            </Column>

                            <Row className="items-start gap-4" style={{ flexWrap: 'wrap' }}>
                              <Column className="min-w-[300px] flex-1">
                                {isVotingSkipped ? (
                                  <Column className="gap-3">
                                    <FontText
                                      weight="medium"
                                      className="text-sm uppercase tracking-[0.24em] opacity-60">
                                      Vote
                                    </FontText>
                                    <FontText variant="subtext">
                                      Voting is skipped for this day.
                                    </FontText>
                                  </Column>
                                ) : (
                                  <>
                                    <ChainWraper
                                      className=""
                                      isDisabled={
                                        isVoteLocked || roleData?.doesRoleVote === false
                                      }>
                                      <Column className="gap-3">
                                        <FontText
                                          weight="medium"
                                          className="text-sm uppercase tracking-[0.24em] opacity-60">
                                          Vote
                                        </FontText>
                                        <MarkdownRenderer
                                          markdown={voteMessage}
                                          isInDialog
                                          state={emulatedVoteState}
                                          setState={
                                            isVoteLocked ||
                                            roleData?.doesRoleVote === false ||
                                            isSkipVote
                                              ? undefined
                                              : setEmulatedVoteState
                                          }
                                        />
                                        {!isVoteLocked && roleData?.doesRoleVote !== false && (
                                          <Pressable
                                            onPress={() => setIsSkipVote((value) => !value)}>
                                            <Row className="items-center gap-2">
                                              <View
                                                className={`h-5 w-5 items-center justify-center rounded border ${isSkipVote ? 'bg-text border-text' : 'border-border bg-background'}`}>
                                                {isSkipVote && (
                                                  <FontText
                                                    weight="bold"
                                                    color="white"
                                                    className="text-xs">
                                                    ✓
                                                  </FontText>
                                                )}
                                              </View>
                                              <FontText
                                                weight="medium"
                                                className={isSkipVote ? '' : 'opacity-70'}>
                                                Skip Vote
                                              </FontText>
                                            </Row>
                                          </Pressable>
                                        )}
                                      </Column>
                                    </ChainWraper>
                                    {isSkipVote ? (
                                      <FontText variant="subtext">
                                        You have skipped your vote.
                                      </FontText>
                                    ) : voteSummary ? (
                                      <FontText variant="subtext">
                                        {isVoteLocked ? 'Saved vote' : 'Current vote'}: {voteSummary}
                                      </FontText>
                                    ) : roleData?.doesRoleVote === false ? (
                                      <FontText variant="subtext">
                                        This role doesn&apos;t submit a vote.
                                      </FontText>
                                    ) : isVoteLocked ? (
                                      <FontText variant="subtext">No vote submitted.</FontText>
                                    ) : null}
                                  </>
                                )}
                              </Column>

                              <Column className="min-w-[300px] flex-1">
                                {isActionsSkipped ? (
                                  <Column className="gap-3">
                                    <FontText
                                      weight="medium"
                                      className="text-sm uppercase tracking-[0.24em] opacity-60">
                                      Action
                                    </FontText>
                                    <FontText variant="subtext">
                                      Actions are skipped for this day.
                                    </FontText>
                                  </Column>
                                ) : (
                                  <>
                                    <ChainWraper
                                      className="min-w-[300px] flex-1"
                                      isDisabled={isActionLocked}>
                                      <Column className="gap-3">
                                        <FontText
                                          weight="medium"
                                          className="text-sm uppercase tracking-[0.24em] opacity-60">
                                          Action
                                        </FontText>
                                        {roleData?.roleMessage?.trim().length ? (
                                          <MarkdownRenderer
                                            markdown={roleData.roleMessage}
                                            isInDialog
                                            state={emulatedActionState}
                                            setState={
                                              isActionLocked ? undefined : setEmulatedActionState
                                            }
                                          />
                                        ) : (
                                          <FontText variant="subtext">
                                            You do not have any action set for your role.
                                          </FontText>
                                        )}
                                      </Column>
                                    </ChainWraper>
                                    {isActionLocked ? (
                                      actionSummary ? (
                                        <FontText variant="subtext">
                                          Saved action: {actionSummary}
                                        </FontText>
                                      ) : (
                                        <FontText variant="subtext">
                                          The action window has closed for this day.
                                        </FontText>
                                      )
                                    ) : actionSummary ? (
                                      <FontText variant="subtext">
                                        Current action: {actionSummary}
                                      </FontText>
                                    ) : null}
                                  </>
                                )}
                              </Column>
                            </Row>
                          </Column>
                        </Column>
                      </Column>
                    </MarkdownRendererInputDataProvider>
                  </ShadowScrollView>
                )}
              </>
            )}

            <Row className="justify-end gap-4 pt-2">
              <AppButton variant="outline" className="w-28" onPress={() => handleOpenChange(false)}>
                <FontText weight="medium">Close</FontText>
              </AppButton>
            </Row>
          </Column>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default PlayerPreviewModal;
