import React, { useState, useEffect } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import { useList, useFindValues } from 'hooks/useData';
import Column from '../layout/Column';
import NightlyPlayerTable from './NightlyPlayerTable';
import NightlyDaysTable from './NightlyDaysTable';
import { UserTableItem } from 'types/playerTable';
import { RoleTableItem } from 'types/roleTable';
import AppButton from '../ui/buttons/AppButton';
import Row from '../layout/Row';
import ShadowScrollView from '../ui/ShadowScrollView';
import { View, useWindowDimensions } from 'react-native';
import ComprehensiveDaySelector from '../ui/daySelector/ComprehensiveDaySelector';
import NightlyCertificationDialog from './NightlyCertificationDialog';
import { getGameScopedKey, hasPlayerActionContent } from '../../../utils/multiplayer';
import { PlayerNightSubmission, PlannedUpdate } from '../../../types/multiplayer';
import { executePlannedUpdates } from '../../../utils/executePlannedUpdates';
import { fireTagTriggersForNetChanges } from '../../../hooks/useTagTriggers';
import { useValue } from 'hooks/useData';
interface NightlyPageOPERATORProps {
  currentUserId: string;
  gameId: string;
}

const NightlyPageOPERATOR = ({
  currentUserId: _currentUserId,
  gameId,
}: NightlyPageOPERATORProps) => {
  const [isCertificationDialogOpen, setIsCertificationDialogOpen] = useState(false);
  const { width } = useWindowDimensions();

  // Shared user table (same as players tab)
  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', gameId, {
    privacy: 'PUBLIC',
  });

  const users = userTable?.value ?? [];

  // Table titles (for resolving column names in UpdateCell)
  const [userTableTitle] = useList<{ extraUserColumns: string[]; extraDayColumns: string[] }>(
    'userTableTitle',
    gameId,
    { privacy: 'PUBLIC' }
  );

  // Role table (for role message scripts that may contain UpdateCell blocks)
  const [roleTable] = useList<RoleTableItem[]>('roleTable', gameId, { privacy: 'PUBLIC' });

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

  const currentDayIndex = selectedDayIndex.value;
  const voteCount = users.filter(
    (user) => (user.days[currentDayIndex]?.vote ?? '').trim().length > 0
  ).length;
  const actionCount = users.filter((user) =>
    hasPlayerActionContent(user.days[currentDayIndex]?.action)
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
      const currentMessages = morningMessagesList.value || {};

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

      if (JSON.stringify(updatedMessages) !== JSON.stringify(currentMessages)) {
        setMorningMessagesList(updatedMessages);
      }
    }
  }, [fixedDayDatesArray.length, users.length, morningMessagesList.state.isSyncing]);

  const [doSync, setDoSync] = useState(false);
  const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);
  const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
  const [daysTableWidth, setDaysTableWidth] = useState(320); // default width
  const [isPlayerTableColumnsReady, setIsPlayerTableColumnsReady] = useState(false);
  const [isDaysTableColumnsReady, setIsDaysTableColumnsReady] = useState(false);

  const updateMorningMessage = (dayIndex: number, userIndex: number, value: string) => {
    const user = users[userIndex];
    if (!user) return;

    const currentMessages = morningMessagesList.value || {};
    const updatedMessages = { ...currentMessages };

    if (!updatedMessages[user.email.toLowerCase()]) {
      updatedMessages[user.email.toLowerCase()] = new Array(fixedDayDatesArray.length).fill('');
    }

    const userMessages = [...updatedMessages[user.email.toLowerCase()]];
    userMessages[dayIndex] = value;
    updatedMessages[user.email.toLowerCase()] = userMessages;

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

  const certifySubmissions = () => {
    const certifiedUsers = users.map((user) => {
      const submission = submissionsByEmail[user.email.toLowerCase()];

      const nextDays = [...(user.days ?? [])];

      while (nextDays.length <= selectedDayIndex.value) {
        nextDays.push({});
      }

      if (submission) {
        nextDays[selectedDayIndex.value] = {
          ...nextDays[selectedDayIndex.value],
          vote: submission.vote,
          action: submission.action,
        };
      }

      return {
        ...user,
        days: nextDays,
      };
    });

    // Execute planned updates that were computed at input time (stored in each
    // player's submission). Each planned update contains a partially-evaluated
    // expression that is evaluated against the current cell value at certify
    // time, allowing append/remove operations from multiple players to compose
    // correctly rather than overwriting each other.
    const titles = userTableTitle?.value ?? { extraUserColumns: [], extraDayColumns: [] };
    const allPlannedUpdates: PlannedUpdate[] = [];

    for (const user of certifiedUsers) {
      const submission = submissionsByEmail[user.email.toLowerCase()];
      if (!submission?.plannedUpdates) continue;
      allPlannedUpdates.push(...submission.plannedUpdates);
    }

    let finalUsers = certifiedUsers;
    if (allPlannedUpdates.length > 0) {
      const beforePlannedUpdates = certifiedUsers;
      finalUsers = executePlannedUpdates(certifiedUsers, allPlannedUpdates, titles);
      // Fire tag triggers for any net tag changes caused by the planned updates
      // (e.g. cellContents.append(tag("Detected")) adds a tag → OnTagAdded runs)
      if (Object.keys(tagTriggers).length > 0) {
        finalUsers = fireTagTriggersForNetChanges(
          beforePlannedUpdates,
          finalUsers,
          tagTriggers,
          titles
        );
      }
    }

    setUserTable(finalUsers);
    setDoSync(true);
  };

  const areAllColumnsReady =
    users.length === 0 || (isPlayerTableColumnsReady && isDaysTableColumnsReady);
  // Only show loading on initial load, not when syncing after
  const showLoading = !hasInitiallyLoaded || !areAllColumnsReady;
  const showInlineReviewButton = width >= 440;

  return (
    <>
      {showLoading && (
        <Column className="min-h-[760px] items-center justify-center gap-4">
          <LoadingText text="Loading nightly data" />
        </Column>
      )}
      <Column className={`min-h-[760px] gap-4 py-3 sm:px-4 ${showLoading ? 'opacity-0' : ''}`}>
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
                    <View style={{ width: daysTableWidth }}>
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
                        morningMessagesList={morningMessagesList.value || {}}
                        updateMorningMessage={updateMorningMessage}
                        onColumnsReady={setIsDaysTableColumnsReady}
                      />
                    </Row>
                  </Column>
                </Row>
              </ShadowScrollView>

              <NightlyCertificationDialog
                isOpen={isCertificationDialogOpen}
                onOpenChange={setIsCertificationDialogOpen}
                users={users}
                submissionsByEmail={submissionsByEmail}
                onCertify={certifySubmissions}
              />
            </Column>
          </Animated.View>
        ) : (
          <Row className="items-center justify-center gap-4">
            <FontText weight="medium" className="text-center text-gray-500">
              No players available. Add players in the Players tab first.
            </FontText>
          </Row>
        )}
      </Column>
    </>
  );
};

export default NightlyPageOPERATOR;
