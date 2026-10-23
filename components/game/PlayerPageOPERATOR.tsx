import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { useList, useFindValues, useValue } from 'hooks/useData';
import Column from '../layout/Column';
import PlayerTable from './PlayerTable';
import { UserTableItem } from 'types/playerTable';
import Row from '../layout/Row';
import ShadowScrollView from '../ui/ShadowScrollView';
import { View } from 'react-native';
import { useContentWidth } from 'hooks/useContentWidth';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import PlayerAddUserSection from './PlayerAddUserSection';
import ComprehensiveDaySelector from '../ui/daySelector/ComprehensiveDaySelector';
import DaysTable from './DaysTable';
import LoadingContainer from '../ui/loading/LoadingContainer';
import { MultiSelectProvider, useMultiSelect } from './multiSelect/MultiSelectContext';
import MultiSelectToolbar from './multiSelect/MultiSelectToolbar';
import TableFreezeControls from './TableFreezeControls';
import TableRowPreview from './TableRowPreview';
import { usePlayerDataFreeze } from 'hooks/useTableFreeze';
import NightlyCertificationDialog from './NightlyCertificationDialog';
import {
  getGameScopedKey,
  hasPlayerActionContent,
  hasVoteContent,
  parseStoredDayDates,
} from 'utils/multiplayer';
import { deepEqual } from 'utils/deepEqual';
import { PlayerNightSubmission } from 'types/multiplayer';
import { getNewserAssignmentKey, NewserAssignment } from 'utils/newspaperControl';
import { type TagTriggerEnv } from 'hooks/useTagTriggers';
import { useScriptFilesReader } from 'hooks/useScriptFiles';
import { CellHighlightContext } from './CellHighlight';
import { normalizePlayerPageState } from './playerTableNormalization';
import type { UserTableColumnVisibility } from 'types/playerTable';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { simListItemId, simRecordKey, simScopeItemId, useSim } from '../../contexts/SimContext';
import { encodeUserValue } from '../../hooks/userValueSerialization';
import { useToast } from '../../contexts/ToastContext';
import {
  planLiveCertification,
  type LiveCertificationInput,
  type LiveChoices,
  type LiveConflict,
} from '../../utils/liveCertification';
import CertificationReviewDialog from './CertificationReviewDialog';
import { useUndoRedo } from '../../hooks/useUndoRedo';

interface PlayerPageOPERATORProps {
  currentUserId: string;
  gameId: string;
}

const PlayerPageOPERATOR = ({ currentUserId, gameId }: PlayerPageOPERATORProps) => {
  return (
    <MultiSelectProvider>
      <PlayerPageContent currentUserId={currentUserId} gameId={gameId} />
    </MultiSelectProvider>
  );
};

const PlayerPageContent = ({ currentUserId, gameId }: PlayerPageOPERATORProps) => {
  const { selectionMode } = useMultiSelect();
  const [isCertificationDialogOpen, setIsCertificationDialogOpen] = useState(false);
  const width = useContentWidth();
  const sim = useSim();
  const { showToast } = useToast();
  const { executeCommand } = useUndoRedo();
  const commitCertification = useMutation(api.user_lists.commitCellCertification);
  const [certificationBusy, setCertificationBusy] = useState(false);
  const [certificationReview, setCertificationReview] = useState<{
    input: LiveCertificationInput;
    conflicts: LiveConflict[];
    targets: any[];
    submissions: { id: string; modified: number; value: PlayerNightSubmission }[];
    submissionKey: string;
  } | null>(null);

  const [userTable] = useList<UserTableItem[]>('userTable', gameId);
  const freezeController = usePlayerDataFreeze(gameId);
  const [isFreezeControlsWrapped, setIsFreezeControlsWrapped] = useState(false);

  const users = useMemo(
    () => userTable.scheduledUpdate?.value ?? userTable.value ?? [],
    [userTable.scheduledUpdate?.value, userTable.value]
  );

  // Get day dates for PlayerTable
  const [dayDatesArray] = useList<string[]>('dayDatesArray', gameId);

  // Convert stored MM/DD/YYYY strings back to real Date objects for UI use
  const fixedDayDatesArray = parseStoredDayDates(dayDatesArray.value);

  const [isPlayerTableBeingEdited, setIsPlayerTableBeingEdited] = useState(false);
  const [isDaysTableBeingEdited, setIsDaysTableBeingEdited] = useState(false);
  const [isPlayerTableColumnsReady, setIsPlayerTableColumnsReady] = useState(false);
  const [isDaysTableColumnsReady, setIsDaysTableColumnsReady] = useState(false);

  // Get selected day index for DaysTable
  const [selectedDayIndex, setSelectedDayIndex] = useList<number>('selectedDayIndex', gameId);

  // Files-tab "go to cell" requests land here; a morning chip needs the
  // matching day shown before its cell can flash. Ref avoids re-firing when
  // the user changes the day while a request is still live.
  const highlightReq = useContext(CellHighlightContext);
  const selectedDayRef = useRef(selectedDayIndex.value);
  selectedDayRef.current = selectedDayIndex.value;
  useEffect(() => {
    if (
      (highlightReq?.cellKind === 'morningMessage' || highlightReq?.cellKind === 'tableCell') &&
      highlightReq.day !== undefined &&
      selectedDayRef.current !== highlightReq.day - 1
    ) {
      setSelectedDayIndex(highlightReq.day - 1);
    }
  }, [highlightReq, setSelectedDayIndex]);

  // Table titles (for resolving column names in UpdateCell)
  const [userTableTitle] = useList<{
    extraUserColumns: string[];
    extraDayColumns: string[];
  }>('userTableTitle', gameId, { privacy: 'PUBLIC' });
  const userTableTitleValue = userTableTitle.scheduledUpdate?.value ?? userTableTitle.value;
  const [userTableColumnVisibility] = useList<UserTableColumnVisibility>(
    'userTableColumnVisibility',
    gameId
  );
  const columnVisibilityValue =
    userTableColumnVisibility.scheduledUpdate?.value ?? userTableColumnVisibility.value;

  // Tag triggers (for firing OnTagAdded/OnTagRemoved during certify).
  // Legacy record holds name→script for tags that haven't been migrated to
  // `tags/` files; file-backed tags resolve through the files index first.
  const [tagTriggersRecord] = useValue<Record<string, string>>(
    getGameScopedKey('tagTriggers', gameId),
    { defaultValue: {}, privacy: 'PUBLIC' }
  );
  const tagTriggers = useMemo(() => tagTriggersRecord?.value ?? {}, [tagTriggersRecord?.value]);
  const {
    index: scriptFilesIndex,
    doc: scriptFilesDoc,
    isLoading: filesLoading,
  } = useScriptFilesReader(gameId);
  const tagTriggerEnv = useMemo<TagTriggerEnv>(
    () => ({ index: scriptFilesIndex, legacyTriggers: tagTriggers, strict: true }),
    [scriptFilesIndex, tagTriggers]
  );

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

  const submissionKey = getGameScopedKey(
    `playerNightSubmission-day-${selectedDayIndex.value}`,
    gameId
  );
  const actualSubmissionKey = sim.mode === 'off' ? submissionKey : simRecordKey(sim, submissionKey);
  const submissionRecords = useQuery(api.user_lists.certificationSubmissions, {
    key: actualSubmissionKey,
    simulated: sim.mode !== 'off',
  });

  const submissionEntries = (submissionRecords ?? [])
    .filter((record: any) => {
      const email = record.value?.playerEmail;
      return email?.trim()?.length > 0;
    })
    .map((record: any) => [record.value.playerEmail.toLowerCase(), record.value]);

  const submissionsByEmail = Object.fromEntries(submissionEntries) as Record<
    string,
    PlayerNightSubmission
  >;

  // Newser assignment (used for the same player-count exclusions as the phone book)
  const newserAssignmentRecords = useFindValues<NewserAssignment>(getNewserAssignmentKey(gameId), {
    returnTop: 1,
  });
  const newserAssignment = newserAssignmentRecords?.[0]?.value;
  const newserEmail = newserAssignment?.email?.trim()?.toLowerCase() ?? '';
  const newserUserId = newserAssignment?.userId?.trim() ?? '';

  // Countable players = userTable rows minus the newser and the operator
  // (same logic as the phone book's alive count).
  const countablePlayers = users.filter((u) => {
    const email = u.email?.trim()?.toLowerCase();
    if (newserEmail && email === newserEmail) return false;
    if (newserUserId && u.userId === newserUserId) return false;
    if (u.userId === currentUserId) return false;
    return true;
  });
  const alivePlayers = countablePlayers.filter((u) => u.playerData?.livingState === 'alive');

  const voteCount = alivePlayers.filter((user) =>
    hasVoteContent(submissionsByEmail[user.email.toLowerCase()]?.vote)
  ).length;
  const actionCount = alivePlayers.filter((user) =>
    hasPlayerActionContent(submissionsByEmail[user.email.toLowerCase()]?.action)
  ).length;

  // Track when all data is loaded before showing table with fade-in
  const isSyncing =
    userTable?.state?.isSyncing ||
    selectedDayIndex?.state?.isSyncing ||
    dayDatesArray?.state?.isSyncing ||
    morningMessagesList?.state?.isSyncing ||
    userTableTitle.state.isSyncing ||
    tagTriggersRecord.state.isSyncing ||
    filesLoading ||
    submissionRecords === undefined ||
    newserAssignmentRecords === undefined;
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  useEffect(() => {
    if (!isSyncing && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [isSyncing, hasInitiallyLoaded]);

  // Keep a morning-message row per user × day so cells never write out of range
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

  const saveCertification = async (
    review: NonNullable<typeof certificationReview>,
    choices: LiveChoices
  ) => {
    if (certificationBusy) return;
    setCertificationBusy(true);
    try {
      const result = planLiveCertification(review.input, choices);
      if (result.conflicts.some((conflict) => !choices[conflict.id])) {
        setCertificationReview({ ...review, conflicts: result.conflicts });
        showToast(
          'These choices affect another operator change. Review the additional item before saving.'
        );
        return;
      }
      const targets = review.targets
        .map((target) => ({
          ...target,
          next:
            target.output === 'users'
              ? result.users
              : target.output === 'titles'
                ? review.input.titles
                : target.output === 'mornings'
                  ? result.mornings
                  : undefined,
        }))
        .map(({ output, ...target }) => target);
      const transaction = encodeUserValue({
        targets,
        submissions: review.submissions,
        submissionKey: review.submissionKey,
        simulated: sim.mode !== 'off',
      });
      await commitCertification(transaction);
      const undoTransaction = {
        ...transaction,
        targets: transaction.targets.map((target) =>
          target.next === undefined
            ? target
            : {
                ...target,
                expected: target.next,
                next: target.expected,
              }
        ),
      };
      let initial = true;
      const applyHistory = async (payload: typeof transaction) => {
        try {
          await commitCertification(payload);
        } catch (error) {
          showToast(
            error instanceof Error ? error.message : 'The table changed; undo was not applied.'
          );
        }
      };
      executeCommand({
        action: () => {
          if (initial) initial = false;
          else void applyHistory(transaction);
        },
        undoAction: () => {
          void applyHistory(undoTransaction);
        },
        description: `Certify ${review.input.type}`,
      });
      setCertificationReview(null);
      showToast('Certification saved.');
    } catch (error) {
      setCertificationReview(null);
      showToast(
        error instanceof Error ? error.message : 'Certification failed. Nothing was saved.'
      );
    } finally {
      setCertificationBusy(false);
    }
  };

  const buildCertificationInput = (type: 'votes' | 'actions'): LiveCertificationInput => {
    const normalized = normalizePlayerPageState({
      users,
      titles: userTableTitleValue,
      visibility: columnVisibilityValue,
      targetDayCount: fixedDayDatesArray.length,
    });
    return {
      namespace: sim.mode === 'off' ? `live:${gameId}` : `sim:${sim.realGameId}`,
      users: normalized.users,
      titles: normalized.titles,
      mornings: morningMessagesValue,
      submissions: submissionsByEmail,
      day: selectedDayIndex.value,
      type,
      runId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      env: tagTriggerEnv,
    };
  };

  // Conflict count for the certify split-button's resolve screen. Null when
  // the planner can't run (busy/syncing) - the screen still offers choices.
  const countCertificationConflicts = (type: 'votes' | 'actions'): number | null => {
    if (certificationBusy || isSyncing || filesLoading || submissionRecords === undefined)
      return null;
    try {
      return planLiveCertification(buildCertificationInput(type)).conflicts.length;
    } catch {
      return null;
    }
  };

  const certifySubmissions = (type: 'votes' | 'actions', autoResolve?: 'keep' | 'replace') => {
    if (certificationBusy || isSyncing || filesLoading || submissionRecords === undefined) return;
    try {
      const input = buildCertificationInput(type);
      const preview = planLiveCertification(input);
      const listTarget = (key: string, record: any, fallback: any, output?: string) => ({
        targetType: 'list',
        key: sim.mode === 'off' ? key : simRecordKey(sim, key),
        itemId: sim.mode === 'off' ? gameId : simListItemId(sim, gameId),
        expected: record.scheduledUpdate?.value ?? record.value ?? fallback,
        defaultValue: fallback,
        pending: !!record.scheduledUpdate,
        output,
      });
      const variableTarget = (key: string, value: any) =>
        sim.mode === 'off'
          ? { targetType: 'variable', key, expected: value, defaultValue: value, pending: false }
          : {
              targetType: 'list',
              key: simRecordKey(sim, key),
              itemId: simScopeItemId(sim),
              expected: value,
              defaultValue: value,
              pending: false,
            };
      const review = {
        input,
        conflicts: preview.conflicts,
        submissionKey: actualSubmissionKey,
        submissions: submissionRecords.map((row) => ({
          id: String(row._id),
          modified: row.lastModified,
          value: row.value,
        })),
        targets: [
          listTarget('userTable', userTable, [], 'users'),
          listTarget(
            'userTableTitle',
            userTableTitle,
            { extraUserColumns: [], extraDayColumns: [] },
            'titles'
          ),
          listTarget('morningMessagesList', morningMessagesList, {}, 'mornings'),
          listTarget('dayDatesArray', dayDatesArray, []),
          variableTarget(getGameScopedKey('tagTriggers', gameId), tagTriggers),
          variableTarget(getGameScopedKey('scriptFiles', gameId), scriptFilesDoc),
        ],
      };
      if (preview.conflicts.length) {
        if (!autoResolve) {
          setCertificationReview(review);
          return;
        }
        // Auto-resolve: pick the same side for every conflict, re-planning
        // until stable - a first-pass choice can reveal secondary conflicts
        // that get the same treatment.
        const choices: LiveChoices = {};
        for (let pass = 0; pass < 25; pass++) {
          const result = planLiveCertification(input, choices);
          const missing = result.conflicts.filter((conflict) => !choices[conflict.id]);
          if (!missing.length) break;
          missing.forEach((conflict) => (choices[conflict.id] = autoResolve));
        }
        void saveCertification(review, choices);
      } else {
        void saveCertification(review, {});
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to plan certification.');
    }
  };

  const areAllColumnsReady =
    users.length === 0 || (isPlayerTableColumnsReady && isDaysTableColumnsReady);
  const showInlineReviewButton = width >= 440;

  return (
    <LoadingContainer
      dependencies={[
        userTable,
        selectedDayIndex,
        dayDatesArray,
        hasInitiallyLoaded,
        areAllColumnsReady,
      ]}
      loadingText="Loading players"
      className="min-h-190">
      {users.length > 0 ? (
        <Column className={`gap-4 py-3 ${width >= 640 ? 'px-4' : ''}`}>
          {showInlineReviewButton ? (
            <Row className="mb-4 items-center justify-between gap-4">
              <Column className="flex-1 gap-0">
                <FontText weight="medium">Player submissions</FontText>
                <FontText variant="subtext">
                  {voteCount}/{alivePlayers.length} voted, {actionCount}/{alivePlayers.length}{' '}
                  submitted actions
                </FontText>
                <FontText variant="subtext">
                  {alivePlayers.length}/{countablePlayers.length} players alive
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
                  {voteCount}/{alivePlayers.length} voted, {actionCount}/{alivePlayers.length}{' '}
                  submitted actions
                </FontText>
                <FontText variant="subtext">
                  {alivePlayers.length}/{countablePlayers.length} players alive
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

          <TableRowPreview gameId={gameId}>
            <ShadowScrollView
              direction="horizontal"
              className="mr-1 pt-1"
              scrollViewClassName="px-1 py-5"
              horizontal>
              <Row className="gap-4">
                <Column className="gap-1">
                  <Row className="h-6 gap-4">{/* spacer to align with days table */}</Row>
                  <Row className={`gap-4 ${isPlayerTableBeingEdited ? 'z-50' : ''}`.trim()}>
                    <PlayerTable
                      gameId={gameId}
                      isBeingEdited={isPlayerTableBeingEdited}
                      setIsBeingEdited={setIsPlayerTableBeingEdited}
                      dayDatesArray={fixedDayDatesArray}
                      onColumnsReady={setIsPlayerTableColumnsReady}
                    />
                  </Row>
                </Column>
                <Column className="gap-1">
                  <Row className="h-6 gap-4">
                    <View
                      className="w-full"
                      style={{
                        opacity: selectionMode ? 0.4 : 1,
                        pointerEvents: selectionMode ? 'none' : 'auto',
                      }}>
                      <ComprehensiveDaySelector gameId={gameId} showAddButton={true} />
                    </View>
                  </Row>
                  <Row className={`${isDaysTableBeingEdited ? 'z-10 ' : ''}gap-4 w-min max-w-min`}>
                    <DaysTable
                      gameId={gameId}
                      dayNumber={selectedDayIndex.value}
                      dayCount={fixedDayDatesArray.length}
                      isBeingEdited={isDaysTableBeingEdited}
                      setIsBeingEdited={setIsDaysTableBeingEdited}
                      morningMessagesList={morningMessagesValue}
                      updateMorningMessage={updateMorningMessage}
                      bulkUpdateMorningMessages={bulkUpdateMorningMessages}
                      onColumnsReady={setIsDaysTableColumnsReady}
                    />
                  </Row>
                </Column>
              </Row>
            </ShadowScrollView>
          </TableRowPreview>
          <PlayerAddUserSection
            gameId={gameId}
            onRightContentWrapChange={setIsFreezeControlsWrapped}
            rightContent={
              <TableFreezeControls
                controller={freezeController}
                fullWidth={isFreezeControlsWrapped}
              />
            }
          />

          {certificationReview && (
            <CertificationReviewDialog
              gameId={gameId}
              conflicts={certificationReview.conflicts}
              busy={certificationBusy}
              onCancel={() => setCertificationReview(null)}
              onConfirm={(choices) => void saveCertification(certificationReview, choices)}
            />
          )}
          <NightlyCertificationDialog
            disabled={!!isSyncing || certificationBusy}
            isOpen={isCertificationDialogOpen}
            onOpenChange={setIsCertificationDialogOpen}
            users={users}
            submissionsByEmail={submissionsByEmail}
            onCertifyVotes={(autoResolve) => certifySubmissions('votes', autoResolve)}
            onCertifyActions={(autoResolve) => certifySubmissions('actions', autoResolve)}
            onCountConflicts={countCertificationConflicts}
          />
        </Column>
      ) : (
        // <FontText>Hellow</FontText>
        <Column className={`py-3 ${width >= 640 ? 'px-4' : ''}`}>
          <PlayerAddUserSection gameId={gameId} removeBottomSpace />
        </Column>
      )}
    </LoadingContainer>
  );
};

export default PlayerPageOPERATOR;
