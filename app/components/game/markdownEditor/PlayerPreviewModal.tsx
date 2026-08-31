import React, { useEffect, useMemo, useState } from 'react';
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
import { useList, useValue } from '../../../../hooks/useData';
import { UserTableItem, UserTableTitle } from '../../../../types/playerTable';
import { DEFAULT_VOTE_MESSAGE, RoleTableItem } from '../../../../types/roleTable';
import type { ScriptSourceData } from '../../../script/runtime/sources';
import {
  defaultGameSchedule,
  formatTimeLabel,
  getContextualDayRangeLabel,
  getGameScopedKey,
  normalizeGameSchedule,
  parseStoredDayDates,
} from '../../../../utils/multiplayer';

interface PlayerPreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  roleName: string;
}

/**
 * Modal that lets an operator preview a role message as a specific player.
 * Uses client-side state only — nothing is saved to Convex.
 */
const PlayerPreviewModal = ({
  isOpen,
  onOpenChange,
  gameId,
  roleName,
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
  const [defaultVoteMessage] = useList<string>('voteMessageDefault', gameId, {
    privacy: 'PUBLIC',
    defaultValue: DEFAULT_VOTE_MESSAGE,
  });
  const [scheduleRecord] = useValue(getGameScopedKey('gameSchedule', gameId), {
    defaultValue: defaultGameSchedule,
  });

  const players = useMemo(() => userTable?.value ?? [], [userTable?.value]);
  const roles = useMemo(() => roleTable?.value ?? [], [roleTable?.value]);

  // Filter players to only those with the matching role
  const rolePlayers = useMemo(
    () =>
      players.filter(
        (player) => player.role.trim().toLowerCase() === roleName.trim().toLowerCase()
      ),
    [players, roleName]
  );
  const currentDay = selectedDayIndex?.value ?? 0;
  const dayDates = useMemo(() => dayDatesArray?.value ?? [], [dayDatesArray?.value]);
  const schedule = useMemo(
    () => normalizeGameSchedule(scheduleRecord.value ?? defaultGameSchedule),
    [scheduleRecord.value]
  );
  const voteDeadlineTime =
    schedule.voteDeadlineTime ?? defaultGameSchedule.voteDeadlineTime ?? '22:00';
  const actionDeadlineTime =
    schedule.actionDeadlineTime ?? defaultGameSchedule.actionDeadlineTime ?? '22:00';
  const selectedDayRangeLabel = useMemo(
    () =>
      getContextualDayRangeLabel(
        parseStoredDayDates(dayDates),
        currentDay,
        numberOfRealDaysPerInGameDay?.value ?? 2
      ),
    [currentDay, dayDates, numberOfRealDaysPerInGameDay?.value]
  );

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPlayerEmail((currentEmail) => {
      const currentPlayerStillExists = rolePlayers.some(
        (player) => player.email.toLowerCase() === currentEmail?.toLowerCase()
      );
      if (currentPlayerStillExists) return currentEmail;
      return (
        rolePlayers.find((player) => player.playerData.livingState === 'alive') ?? rolePlayers[0]
      )?.email;
    });
  }, [isOpen, rolePlayers]);

  useEffect(() => {
    if (!isOpen) return;
    setEmulatedVoteState({});
    setEmulatedActionState({});
    setIsSkipVote(false);
  }, [isOpen, selectedPlayerEmail]);

  const playerDropdownOptions = useMemo(
    () =>
      rolePlayers.map((player) => ({
        value: player.email,
        label: `${player.realName}${player.playerData.livingState === 'dead' ? ' (dead)' : ''}`,
      })),
    [rolePlayers]
  );

  const selectedPlayer = useMemo(
    () =>
      rolePlayers.find(
        (player) => player.email.toLowerCase() === selectedPlayerEmail?.toLowerCase()
      ),
    [rolePlayers, selectedPlayerEmail]
  );

  const roleData = useMemo(
    () => roles.find((role) => role.role.trim().toLowerCase() === roleName.trim().toLowerCase()),
    [roleName, roles]
  );
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
      currentDay,
      dayDates,
      schedule,
      userTableTitle: userTableTitle?.value,
      morningMessagesList: {},
    };
  }, [currentDay, dayDates, players, roles, schedule, selectedPlayer, userTableTitle?.value]);

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
          <ConvexDialog.Close
            iconProps={{ color: 'rgb(246, 238, 219)' }}
            className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
          />
          <DialogHeader text="Preview As Player" subtext={`Role: ${roleName || 'Unnamed role'}`} />

          <Column className="min-h-0 flex-1 gap-3 pt-3">
            {rolePlayers.length === 0 ? (
              <View className="border-subtle-border bg-text/5 rounded-lg border p-4">
                <FontText variant="subtext" className="text-center">
                  No players are assigned to the role &quot;{roleName || 'Unnamed role'}&quot;.
                </FontText>
                <FontText variant="subtext" className="mt-1 text-center">
                  Assign a player to this role to preview their view.
                </FontText>
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
                            <Pressable disabled className="w-20 items-center opacity-30">
                              <ChevronLeft size={28} color="rgb(46, 41, 37)" />
                              <FontText variant="subtext" className="text-center text-xs">
                                {' '}
                              </FontText>
                            </Pressable>

                            <Column className="flex-1 items-center gap-1 pt-1">
                              <FontText weight="medium" className="text-center">
                                {selectedDayRangeLabel || 'Current game day'}
                              </FontText>
                              <FontText variant="subtext" className="text-center text-xs">
                                Day {currentDay + 1}
                              </FontText>
                            </Column>

                            <Pressable disabled className="w-20 items-center opacity-30">
                              <ChevronRight size={28} color="rgb(46, 41, 37)" />
                              <FontText variant="subtext" className="text-center text-xs">
                                {' '}
                              </FontText>
                            </Pressable>
                          </Row>

                          <Column className="gap-5">
                            <Column className="bg-text/5 m-auto w-full max-w-lg items-center gap-2 rounded p-4">
                              <FontText variant="cardHeader" className="text-center">
                                Morning messages are not part of this preview.
                              </FontText>
                            </Column>

                            <Column className="items-center gap-1">
                              <FontText weight="bold" className="text-lg tracking-[0.45em]">
                                VOTE
                              </FontText>
                              <FontText weight="bold" className="leading-14 text-5xl">
                                --:--:--
                              </FontText>
                              <FontText variant="subtext">
                                Voting due at {formatTimeLabel(voteDeadlineTime)}.
                              </FontText>
                              <FontText variant="subtext">
                                Actions due at {formatTimeLabel(actionDeadlineTime)}.
                              </FontText>
                            </Column>

                            <Row className="items-start gap-4" style={{ flexWrap: 'wrap' }}>
                              <Column className="min-w-[300px] flex-1">
                                <ChainWraper
                                  className=""
                                  isDisabled={roleData?.doesRoleVote === false}>
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
                                        roleData?.doesRoleVote === false || isSkipVote
                                          ? undefined
                                          : setEmulatedVoteState
                                      }
                                    />
                                    {roleData?.doesRoleVote !== false && (
                                      <Pressable onPress={() => setIsSkipVote((value) => !value)}>
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
                                  <FontText variant="subtext">You have skipped your vote.</FontText>
                                ) : voteSummary ? (
                                  <FontText variant="subtext">Current vote: {voteSummary}</FontText>
                                ) : roleData?.doesRoleVote === false ? (
                                  <FontText variant="subtext">
                                    This role doesn&apos;t submit a vote.
                                  </FontText>
                                ) : null}
                              </Column>

                              <Column className="min-w-[300px] flex-1">
                                <ChainWraper className="min-w-[300px] flex-1" isDisabled={false}>
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
                                        setState={setEmulatedActionState}
                                      />
                                    ) : (
                                      <FontText variant="subtext">
                                        You do not have any action set for your role.
                                      </FontText>
                                    )}
                                  </Column>
                                </ChainWraper>
                                {actionSummary ? (
                                  <FontText variant="subtext">
                                    Current action: {actionSummary}
                                  </FontText>
                                ) : null}
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
