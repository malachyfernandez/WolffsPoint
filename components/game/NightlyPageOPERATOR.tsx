import React, { useState, useEffect, useMemo } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import FontText from '../ui/text/FontText';
import LoadingContainer from '../ui/loading/LoadingContainer';
import { useList, useFindValues, useValue } from 'hooks/useData';
import Column from '../layout/Column';
import NightlyPlayerTable from './NightlyPlayerTable';
import NightlyDaysTable from './NightlyDaysTable';
import { UserTableItem } from 'types/playerTable';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import ShadowScrollView from '../ui/ShadowScrollView';
import { View, useWindowDimensions } from 'react-native';
import ComprehensiveDaySelector from '../ui/daySelector/ComprehensiveDaySelector';
import { MultiSelectProvider, useMultiSelect } from './multiSelect/MultiSelectContext';
import MultiSelectToolbar from './multiSelect/MultiSelectToolbar';
import NightlyCertificationDialog from './NightlyCertificationDialog';
import {
  getGameScopedKey,
  hasPlayerActionContent,
  hasVoteContent,
} from 'utils/multiplayer';
import { deepEqual } from 'utils/deepEqual';
import { PlayerNightSubmission, PlannedUpdate } from 'types/multiplayer';
import {
  executePlannedUpdates,
  executeMorningMessagePlannedUpdates,
} from 'utils/executePlannedUpdates';
import { fireTagTriggersForNetChanges } from 'hooks/useTagTriggers';
import TableFreezeControls from './TableFreezeControls';
import { usePlayerDataFreeze } from 'hooks/useTableFreeze';
interface NightlyPageOPERATORProps {
  currentUserId: string;
  gameId: string;
}

const NightlyPageOPERATOR = (props: NightlyPageOPERATORProps) => {
  return (
    <MultiSelectProvider>
      <NightlyPageContent {...props} />
    </MultiSelectProvider>
  );
};

const NightlyPageContent = ({
  currentUserId: _currentUserId,
  gameId,
}: NightlyPageOPERATORProps) => {
  const { selectionMode } = useMultiSelect();
  const [isCertificationDialogOpen, setIsCertificationDialogOpen] = useState(false);
  const { width } = useWindowDimensions();

  // Shared user table (same as players tab)
  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', gameId, {
    privacy: 'PUBLIC',
  });

  const freezeController = usePlayerDataFreeze(gameId);
  const users = useMemo(
    () => userTable.scheduledUpdate?.value ?? userTable.value ?? [],
    [userTable.scheduledUpdate?.value, userTable.value]
  );

  // Table titles (for resolving column names in UpdateCell)
  const [userTableTitle] = useList<{ extraUserColumns: string[]; extraDayColumns: string[] }>(
    'userTableTitle',
    gameId,
    { privacy: 'PUBLIC' }
  );

  // Tag triggers (for firing OnTagAdded/OnTagRemoved during certify)
  const [tagTriggersRecord] = useValue<Record<string, string>>(
    getGameScopedKey('tagTriggers', gameId),
    { defaultValue: {}, privacy: 'PUBLIC' }
  );
  const tagTriggers = tagTriggersRecord?.value ?? {};

  const [morningMessagesList, setMorningMessagesList] = useList<Record<string, string[]>>(
    'morningMessagesList',
    gameId,
    {
      privacy: 'PUBLIC',
      defaultValue: {},
    }
  );
  const morningMessagesValue = useMemo(
    () => morningMessagesList.scheduledUpdate?.value ?? morningMessagesList.value ?? {},
    [morningMessagesList.scheduledUpdate?.value, morningMessagesList.value]
  );
  const userTableTitleValue = userTableTitle.scheduledUpdate?.value ?? userTableTitle.value;

  // Shared selected day index (same as players tab)
  const [selectedDayIndex] = useList<number>('selectedDayIndex', gameId, {
    privacy: 'PUBLIC',
    defaultValue: 0,
  });

  const submissionKey = getGameScopedKey(
    `playerNightSubmission-day-${selectedDayIndex.value}`,
    gameId
  );
  const submissionRecords = useFindValues<PlayerNightSubmission>(submissionKey, { returnTop: 200 });

  const submissionEntries = (submissionRecords ?? [])
    .filter((record: any) => {
      const email = record.value?.playerEmail;
      const keep = email?.trim()?.length > 0;
      if (!keep) {
        // Filter out records with empty or missing playerEmail
      }
      return keep;
    })
    .map((record: any) => [record.value.playerEmail.toLowerCase(), record.value]);

  const submissionsByEmail = Object.fromEntries(submissionEntries) as Record<
    string,
    PlayerNightSubmission
  >;

  const voteCount = users.filter((user) =>
    hasVoteContent(submissionsByEmail[user.email.toLowerCase()]?.vote)
  ).length;
  const actionCount = users.filter((user) =>
    hasPlayerActionContent(submissionsByEmail[user.email.toLowerCase()]?.action)
  ).length;

  // Shared day dates array (same as players tab)
  const [dayDatesArray] = useList<string[]>('dayDatesArray', gameId, {
    privacy: 'PUBLIC',
    defaultValue: [],
  });

  // Track when all data is loaded before showing table with fade-in
  const isSyncing =
    userTable?.state?.isSyncing ||
    morningMessagesList?.state?.isSyncing ||
    selectedDayIndex?.state?.isSyncing ||
    dayDatesArray?.state?.isSyncing ||
    submissionRecords === undefined;
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  useEffect(() => {
    if (!isSyncing && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [isSyncing, hasInitiallyLoaded]);

  // Convert stored MM/DD/YYYY strings back to real Date objects for UI use
  const fixedDayDatesArray = dayDatesArray.value.map((dateStr) => {
    const [month, day, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  });

  useEffect(() => {
    if (morningMessagesList.state.isSyncing === false) {
      const currentMessages = morningMessagesValue;

      const updatedMessages = { ...currentMessages };

      users.forEach((user) => {
        if (!updatedMessages[user.email.toLowerCase()]) {
          updatedMessages[user.email.toLowerCase()] = new Array(fixedDayDatesArray.length).fill('');
        } else {
          const userMessages = [...updatedMessages[user.email.toLowerCase()]];
          while (userMessages.length < fixedDayDatesArray.length) {
            userMessages.push('');
          }
          updatedMessages[user.email.toLowerCase()] = userMessages;
        }
      });

      if (!deepEqual(updatedMessages, currentMessages)) {
        setMorningMessagesList(updatedMessages);
      }
    }
  }, [
    fixedDayDatesArray.length,
    morningMessagesList.state.isSyncing,
    morningMessagesValue,
    setMorningMessagesList,
    users,
  ]);

  const [doSync, setDoSync] = useState(false);
  const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);
  const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
  const [daysTableWidth, setDaysTableWidth] = useState(320); // default width
  const [isPlayerTableColumnsReady, setIsPlayerTableColumnsReady] = useState(false);
  const [isDaysTableColumnsReady, setIsDaysTableColumnsReady] = useState(false);

  const updateMorningMessage = (dayIndex: number, userIndex: number, value: string) => {
    const user = users[userIndex];
    if (!user) return;

    const currentMessages = morningMessagesValue;
    const updatedMessages = { ...currentMessages };

    if (!updatedMessages[user.email.toLowerCase()]) {
      updatedMessages[user.email.toLowerCase()] = new Array(fixedDayDatesArray.length).fill('');
    }

    const userMessages = [...updatedMessages[user.email.toLowerCase()]];
    userMessages[dayIndex] = value;
    updatedMessages[user.email.toLowerCase()] = userMessages;

    setMorningMessagesList(updatedMessages);
  };

  // Bulk-update morning messages in a single state write (avoids stale-state
  // overwrite when calling updateMorningMessage in a loop).
  const bulkUpdateMorningMessages = (dayIndex: number, userIndices: number[], value: string) => {
    const currentMessages = morningMessagesValue;
    const updatedMessages = { ...currentMessages };

    for (const userIndex of userIndices) {
      const user = users[userIndex];
      if (!user) continue;

      if (!updatedMessages[user.email.toLowerCase()]) {
        updatedMessages[user.email.toLowerCase()] = new Array(fixedDayDatesArray.length).fill('');
      }

      const userMessages = [...updatedMessages[user.email.toLowerCase()]];
      userMessages[dayIndex] = value;
      updatedMessages[user.email.toLowerCase()] = userMessages;
    }

    setMorningMessagesList(updatedMessages);
  };

  // Update player living state (same as players tab)
  const updatePlayerLivingState = (userIndex: number, livingState: 'alive' | 'dead') => {
    const updatedUsers = [...users];
    if (updatedUsers[userIndex]) {
      updatedUsers[userIndex].playerData.livingState = livingState;
      setUserTable(updatedUsers);
      setDoSync(true);
    }
  };

  const certifySubmissions = (type: 'votes' | 'actions') => {
    const certifiedUsers = users.map((user) => {
      const submission = submissionsByEmail[user.email.toLowerCase()];
      const nextDays = [...(user.days ?? [])];

      while (nextDays.length <= selectedDayIndex.value) {
        nextDays.push({});
      }

      if (submission) {
        nextDays[selectedDayIndex.value] = {
          ...nextDays[selectedDayIndex.value],
          ...(type === 'votes'
            ? {
                vote: submission.vote,
                voteInputs: submission.voteInputs,
                voteInputKey: submission.voteInputKey,
                voteMultiplier: submission.voteMultiplier ?? 1,
              }
            : { action: submission.action }),
        };
      }

      return { ...user, days: nextDays };
    });

    // Execute planned updates that were computed at input time (stored in each
    // player's submission). Each planned update contains a partially-evaluated
    // expression that is evaluated against the current cell value at certify
    // time, allowing append/remove operations from multiple players to compose
    // correctly rather than overwriting each other.
    const titles = userTableTitleValue ?? { extraUserColumns: [], extraDayColumns: [] };
    const allPlannedUpdates: PlannedUpdate[] = [];

    for (const user of certifiedUsers) {
      const submission = submissionsByEmail[user.email.toLowerCase()];
      const updates =
        type === 'votes' ? submission?.votePlannedUpdates : submission?.plannedUpdates;
      if (updates) allPlannedUpdates.push(...updates);
    }

    let finalUsers = certifiedUsers;
    let finalMorningMessages = morningMessagesValue;
    if (allPlannedUpdates.length > 0) {
      // Apply regular table updates (skips morningMessage updates)
      finalUsers = executePlannedUpdates(certifiedUsers, allPlannedUpdates, titles);
      // Apply morning message planned updates separately
      finalMorningMessages = executeMorningMessagePlannedUpdates(
        finalMorningMessages,
        allPlannedUpdates,
        finalUsers
      );
      // Fire tag triggers for any net tag changes caused by the planned updates
      // (e.g. cellContents.append(tag("Detected")) adds a tag → OnTagAdded runs)
      if (Object.keys(tagTriggers).length > 0) {
        const triggerResult = fireTagTriggersForNetChanges(
          certifiedUsers,
          finalUsers,
          tagTriggers,
          titles,
          finalMorningMessages
        );
        finalUsers = triggerResult.users;
        if (triggerResult.morningMessages) {
          finalMorningMessages = triggerResult.morningMessages;
        }
      }
    }

    setUserTable(finalUsers);
    if (!deepEqual(finalMorningMessages, morningMessagesValue)) {
      setMorningMessagesList(finalMorningMessages);
    }
    setDoSync(true);
  };

  const areAllColumnsReady =
    users.length === 0 || (isPlayerTableColumnsReady && isDaysTableColumnsReady);
  // Only show loading on initial load, not when syncing after
  const showInlineReviewButton = width >= 440;

  return (
    <LoadingContainer
      dependencies={[hasInitiallyLoaded, areAllColumnsReady]}
      loadingText="Loading nightly data"
      className="min-h-190">
      <Column className="min-h-190 gap-4 py-3 sm:px-4">
        {users.length > 0 ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <Column className="gap-4">
              {showInlineReviewButton ? (
                <Row className="mb-4 items-center justify-between gap-4">
                  <Column className="flex-1 gap-0">
                    <FontText weight="medium">Player submissions</FontText>
                    <FontText variant="subtext">
                      {voteCount}/{users.length} voted, {actionCount}/{users.length} submitted
                      actions
                    </FontText>
                  </Column>
                  <AppButton
                    variant="accent"
                    className="w-48"
                    onPress={() => setIsCertificationDialogOpen(true)}>
                    <FontText weight="medium" color="white">
                      Review / Certify
                    </FontText>
                  </AppButton>
                </Row>
              ) : (
                <Column className="mb-2 gap-3">
                  <Column className="gap-0">
                    <FontText weight="medium">Player submissions</FontText>
                    <FontText variant="subtext">
                      {voteCount}/{users.length} voted, {actionCount}/{users.length} submitted
                      actions
                    </FontText>
                  </Column>
                  <AppButton
                    variant="accent"
                    className="w-full"
                    onPress={() => setIsCertificationDialogOpen(true)}>
                    <FontText weight="medium" color="white">
                      Review / Certify
                    </FontText>
                  </AppButton>
                </Column>
              )}

              <MultiSelectToolbar />

              <ShadowScrollView
                direction="horizontal"
                className="mr-1 pt-1"
                scrollViewClassName="px-1 py-5"
                horizontal>
                <Row className="gap-4">
                  <Column className="gap-1">
                    <Row className="h-9 gap-4">{/* spacer to align with days table */}</Row>
                    <Row className={`gap-4 ${isPlayerTableBeingEdited ? 'z-50' : ''}`.trim()}>
                      <NightlyPlayerTable
                        gameId={gameId}
                        doSync={doSync}
                        setDoSync={setDoSync}
                        isBeingEdited={isPlayerTableBeingEdited}
                        setIsBeingEdited={setIsPlayerTableBeingEdited}
                        dayDatesArray={fixedDayDatesArray}
                        updatePlayerLivingState={updatePlayerLivingState}
                        onColumnsReady={setIsPlayerTableColumnsReady}
                      />
                    </Row>
                  </Column>
                  <Column className="gap-0">
                    <View
                      style={{
                        width: daysTableWidth,
                        opacity: selectionMode ? 0.4 : 1,
                        pointerEvents: selectionMode ? 'none' : 'auto',
                      }}>
                      <ComprehensiveDaySelector
                        gameId={gameId}
                        showAddButton={true}
                        showInitialSetupDialog={true}
                      />
                    </View>
                    <Row
                      className={`${isDaysTableBeingEdited ? 'z-10 ' : ''}gap-4 w-min max-w-min`}>
                      <NightlyDaysTable
                        gameId={gameId}
                        dayNumber={selectedDayIndex.value}
                        isBeingEdited={isDaysTableBeingEdited}
                        setIsBeingEdited={setIsDaysTableBeingEdited}
                        onLayout={(event: any) => {
                          const { width } = event.nativeEvent.layout;
                          setDaysTableWidth(width);
                        }}
                        onWidthChange={(width: number) => {
                          setDaysTableWidth(width);
                        }}
                        morningMessagesList={morningMessagesValue}
                        updateMorningMessage={updateMorningMessage}
                        bulkUpdateMorningMessages={bulkUpdateMorningMessages}
                        onColumnsReady={setIsDaysTableColumnsReady}
                      />
                    </Row>
                  </Column>
                </Row>
              </ShadowScrollView>

              <Row className="w-full justify-end px-4">
                <Column className="min-w-0 flex-1 items-end">
                  <TableFreezeControls controller={freezeController} />
                </Column>
              </Row>

              <NightlyCertificationDialog
                isOpen={isCertificationDialogOpen}
                onOpenChange={setIsCertificationDialogOpen}
                users={users}
                submissionsByEmail={submissionsByEmail}
                onCertifyVotes={() => certifySubmissions('votes')}
                onCertifyActions={() => certifySubmissions('actions')}
              />
            </Column>
          </Animated.View>
        ) : (
          <Row className="items-center justify-center gap-4">
            <FontText weight="medium" className="text-center">
              No players available. Add players in the Players tab first.
            </FontText>
          </Row>
        )}
      </Column>
    </LoadingContainer>
  );
};

export default NightlyPageOPERATOR;
