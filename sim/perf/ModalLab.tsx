/**
 * sim/perf/ModalLab.tsx
 *
 * A lab bench containing one openable instance of every dialog/modal in the
 * app, fed with fixture data from the seeded mock db. The SimBar toggles the
 * panel; the tour clicks `modallab-open-<id>` buttons and measures mount /
 * settle / teardown for each dialog.
 *
 * Dialogs mount lazily on first open and then STAY mounted (isOpen=false),
 * mirroring the app's keep-mounted modal behavior.
 */

import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { mockDb } from '../mockDb';
import { GAME_OP, PLAYER_NAMES } from '../seedData';
import { simUi, useSimUi } from './uiState';
import { useMinimize } from 'components/ui/minimize/MinimizeContext';

// --- dialog imports ---------------------------------------------------------
import ActionEditorDialog from 'components/game/ActionEditorDialog';
import AddTagDialog from 'components/game/AddTagDialog';
import ArchivedGamesDialog from 'components/game/ArchivedGamesDialog';
import BioEditorDialog from 'components/game/BioEditorDialog';
import ChooseDayDialog from 'components/game/ChooseDayDialog';
import ColumnActionsDialog from 'components/game/ColumnActionsDialog';
import DaySelectionDialog from 'components/game/DaySelectionDialog';
import DaysPerGameDayDialog from 'components/game/DaysPerGameDayDialog';
import DeleteRoleConfirmationDialog from 'components/game/DeleteRoleConfirmationDialog';
import EditInfoDialog from 'components/game/EditInfoDialog';
import JoinedGameOptionsDialog from 'components/game/JoinedGameOptionsDialog';
import MarkdownEditorDialog from 'components/game/MarkdownEditorDialog';
import MarkdownInputBuilderDialog from 'components/game/MarkdownInputBuilderDialog';
import NewWolffspointButtonAndDialogue from 'components/game/NewWolffspointButtonAndDialogue';
import NightlyCertificationDialog from 'components/game/NightlyCertificationDialog';
import PlayerProfileDialogNEW from 'components/game/PlayerProfileDialogNEW';
import RoleAddDialog from 'components/game/RoleAddDialog';
import RoleEditDialog from 'components/game/RoleEditDialog';
import ScheduleTableUpdateDialog from 'components/game/ScheduleTableUpdateDialog';
import TagCellEditor from 'components/game/TagCellEditor';
import TownSquarePostDialog from 'components/game/TownSquarePostDialog';
import UserAddDialog from 'components/game/UserAddDialog';
import UserEditDialog from 'components/game/UserEditDialog';
import VoteEditorDialog from 'components/game/VoteEditorDialog';
import VoteEnableDialog from 'components/game/VoteEnableDialog';
import PhoneBookTocDialog from 'components/game/phoneBook/PhoneBookTocDialog';
import TableOfContentsDialog from 'components/game/ruleBook/TableOfContentsDialog';
import ImportDraftDialog from 'components/game/newspaperPageOperator/ImportDraftDialog';
import NewspaperSectionOptionsDialog from 'components/game/newspaperPageOperator/NewspaperSectionOptionsDialog';
import PlayerPreviewModal from 'components/game/markdownEditor/PlayerPreviewModal';
import MarkdownVariableDialog from 'components/game/markdownEditor/MarkdownVariableDialog';
import TownSquareImageDialog from 'components/game/townSquare/TownSquareImageDialog';
import TownSquareLinkDialog from 'components/game/townSquare/TownSquareLinkDialog';
import TownSquareMoreOptionsDialog from 'components/game/townSquare/TownSquareMoreOptionsDialog';
import ConfirmDialog from 'components/ui/dialog/ConfirmDialog';
import ImageUploadDialog from 'components/ui/dialog/ImageUploadDialog';
import SaveHistoryDialog from 'components/ui/dialog/SaveHistoryDialog';
import UnsavedChangesDialog from 'components/ui/dialog/UnsavedChangesDialog';
import ViewOnlyPreviewModal from 'components/ui/dialog/ViewOnlyPreviewModal';
import DeleteGameConfirmationDialog from 'components/dialog/DeleteGameConfirmationDialog';

// --- fixtures ---------------------------------------------------------------

const GAME_ID = GAME_OP;
const noop = () => {};

const roster = (): any[] =>
  mockDb.runQuery('user_lists:get', { key: 'userTable', itemId: GAME_ID })?.value ?? [];

const roleTable = (): any[] =>
  mockDb.runQuery('user_lists:get', { key: 'roleTable', itemId: GAME_ID })?.value ?? [];

const ruleBook = (): any =>
  mockDb.runQuery('user_vars:get', { key: `ruleBook-${GAME_ID}` })?.value ?? {};

const townSquarePost = (): any | null => {
  const res = mockDb.runQuery('user_lists_get:search', {
    key: `townSquarePosts-${GAME_ID}`,
    returnTop: 1,
  });
  const rec = Array.isArray(res) ? res[0] : res?.[0];
  return rec?.value ?? null;
};

const sampleProfile = {
  gameId: GAME_ID,
  email: 'amara.vale@wolfspoint.test',
  userId: 'user_player_01',
  inGameName: PLAYER_NAMES[0],
  profileImageUrl: '',
  phoneNumber: '555-0100',
  instagram: '@amara',
  discord: 'amara#1000',
  otherContact: '',
  bioMarkdown: `**${PLAYER_NAMES[0]}** — a fixture profile used by the perf lab.\n\nLorem ipsum dolor sit amet.`,
  claimedAt: Date.now() - 86400000,
};

const longMarkdown = Array.from(
  { length: 20 },
  (_, i) =>
    `## Section ${i + 1}\n\nThe council gathered at dawn. Whispers of the night's events spread ` +
    `through the village like fog over the marsh. Evidence was scarce but suspicion was not.\n\n` +
    `- Observation ${i + 1}a: tracks near the well\n- Observation ${i + 1}b: a torn cloak clasp\n`
).join('\n\n');

const sampleUsers = () => roster().slice(0, 6);

const submissionsByEmail = () =>
  Object.fromEntries(
    roster()
      .slice(0, 6)
      .map((u: any) => [
        u.email,
        {
          gameId: GAME_ID,
          gameDayId: `${GAME_ID}-day-1`,
          dayIndex: 1,
          playerEmail: u.email,
          playerUserId: u.userId,
          vote: roster()[1]?.email ?? '',
          voteInputs: { Vote: roster()[1]?.email ?? '' },
          voteMultiplier: 1,
          action: { Action: 'Watch the granary' },
          submittedVoteAt: Date.now() - 3600_000,
          submittedActionAt: Date.now() - 3500_000,
        },
      ])
  );

const sampleSavedEntries = [
  { id: 'se-1', savedAt: Date.now() - 7200_000, preview: 'Earlier draft — intro only', value: '# Intro\n\nDraft text.' },
  { id: 'se-2', savedAt: Date.now() - 3600_000, preview: 'Mid revision — added sections', value: '# Mid\n\nMore text.' },
  { id: 'se-3', savedAt: Date.now() - 600_000, preview: 'Latest revision', value: '# Latest\n\nFinal text.' },
];

const sampleDraft = {
  columns: [],
  sections: [
    {
      id: 'draft-sec-1',
      titleFont: 'playfairDisplay',
      dividerStyle: 'diamond',
      columns: ['# Draft headline\n\nImported content preview.\n\n' + longMarkdown.slice(0, 800)],
    },
  ],
};

// --- registry ----------------------------------------------------------------

interface LabEntry {
  id: string;
  label: string;
  /** Render the dialog; `open`/`close` are wired to lab state. */
  render: (open: boolean, close: () => void, minimize: (title: string) => void) => React.ReactNode;
}

function useLabEntries(): LabEntry[] {
  const entries: LabEntry[] = [
    {
      id: 'markdown-editor',
      label: 'MarkdownEditorDialog (heavy editor)',
      render: (open, close, minimize) => (
        <MarkdownEditorDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          title="Edit Day Notes"
          initialMarkdown={longMarkdown}
          onSubmit={noop}
          gameId={GAME_ID}
          showInputs
          showScript
          showVariables
          historyKey="sim-markdownEditor-lab"
          onMinimize={() => minimize('Edit Day Notes')}
        />
      ),
    },
    {
      id: 'town-square-post',
      label: 'TownSquarePostDialog',
      render: (open, close) => (
        <TownSquarePostDialog
          gameId={GAME_ID}
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          post={townSquarePost()}
          currentProfile={sampleProfile as any}
        />
      ),
    },
    {
      id: 'player-profile',
      label: 'PlayerProfileDialogNEW',
      render: (open, close) => (
        <PlayerProfileDialogNEW
          initialValue={sampleProfile as any}
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          onSave={noop}
          title="Player Profile"
        />
      ),
    },
    {
      id: 'user-edit',
      label: 'UserEditDialog',
      render: (open, close) => (
        <UserEditDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          userIndex={0}
          currentRealName={PLAYER_NAMES[0]}
          currentEmail={sampleProfile.email}
          currentRole="Villager"
          onPress={noop}
          gameId={GAME_ID}
          onDelete={noop}
        />
      ),
    },
    {
      id: 'user-add',
      label: 'UserAddDialog',
      render: (open, close) => (
        <UserAddDialog isOpen={open} onOpenChange={(o) => (o ? undefined : close())} gameId={GAME_ID} />
      ),
    },
    {
      id: 'role-edit',
      label: 'RoleEditDialog',
      render: (open, close) => (
        <RoleEditDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          roleIndex={0}
          role={roleTable()[0] ?? ({} as any)}
          onSetRoleName={noop}
          onSetDoesRoleVote={noop}
          onSetHiddenFromRulebook={noop}
        />
      ),
    },
    {
      id: 'role-add',
      label: 'RoleAddDialog',
      render: (open, close) => (
        <RoleAddDialog isOpen={open} onOpenChange={(o) => (o ? undefined : close())} onAddRole={noop} />
      ),
    },
    {
      id: 'vote-editor',
      label: 'VoteEditorDialog',
      render: (open, close) => (
        <VoteEditorDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          title="Edit Vote"
          onSubmit={noop}
          users={sampleUsers() as any}
        />
      ),
    },
    {
      id: 'vote-enable',
      label: 'VoteEnableDialog',
      render: (open, close) => (
        <VoteEnableDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          roleName="Villager"
          doesRoleVote={false}
          onSetDoesRoleVote={noop}
          onContinueToEditor={close}
        />
      ),
    },
    {
      id: 'action-editor',
      label: 'ActionEditorDialog',
      render: (open, close) => (
        <ActionEditorDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          title="Edit Action"
          onSubmit={noop}
        />
      ),
    },
    {
      id: 'bio-editor',
      label: 'BioEditorDialog',
      render: (open, close) => (
        <BioEditorDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          title="Edit Bio"
          initialMarkdown={sampleProfile.bioMarkdown}
          onSubmit={noop}
          profile={sampleProfile as any}
          displayName={PLAYER_NAMES[0]}
          initials="AV"
        />
      ),
    },
    {
      id: 'tag-cell-editor',
      label: 'TagCellEditor',
      render: (open, close) => (
        <TagCellEditor
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          gameId={GAME_ID}
          value={'[/TAG: "Suspicious"/] notes'}
          onChange={noop}
          cellContext={{ playerIndex: 0, dayIndex: 1, column: 'Suspicion' } as any}
        />
      ),
    },
    {
      id: 'add-tag',
      label: 'AddTagDialog',
      render: (open, close) => (
        <AddTagDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          onAdd={noop}
          existingNames={['Infected', 'Protected', 'Suspicious']}
          gameId={GAME_ID}
        />
      ),
    },
    {
      id: 'add-tag-edit',
      label: 'AddTagDialog (edit mode + trigger script)',
      render: (open, close) => (
        <AddTagDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          onAdd={noop}
          editTag={{ name: 'Suspicious', color: '#f59e0b' }}
          onEdit={noop}
          onDelete={noop}
          gameId={GAME_ID}
        />
      ),
    },
    {
      id: 'choose-day',
      label: 'ChooseDayDialog',
      render: (open, close) => (
        <ChooseDayDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          gameId={GAME_ID}
          onSubmitDaysValue={noop}
        />
      ),
    },
    {
      id: 'day-selection',
      label: 'DaySelectionDialog',
      render: (open, close) => (
        <DaySelectionDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          index={1}
          dayDate={new Date()}
          onPress={noop}
          previousDate={new Date(Date.now() - 86400000)}
          followingDate={new Date(Date.now() + 86400000)}
          replaceDayDate={noop}
        />
      ),
    },
    {
      id: 'days-per-game-day',
      label: 'DaysPerGameDayDialog',
      render: (open, close) => (
        <DaysPerGameDayDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          currentValue={1}
          onPress={noop}
          setNumberOfRealDaysPerInGameDay={noop}
        />
      ),
    },
    {
      id: 'delete-role-confirm',
      label: 'DeleteRoleConfirmationDialog',
      render: (open, close) => (
        <DeleteRoleConfirmationDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          onConfirm={noop}
          itemType="role"
          itemName="Villager"
        />
      ),
    },
    {
      id: 'edit-info',
      label: 'EditInfoDialog',
      render: (open, close) => (
        <EditInfoDialog
          isOpen={open}
          onClose={close}
          customUserInfo={{ name: 'Sim User', photoUrl: '' } as any}
          setCustomUserInfo={noop}
          clerkData={{ name: 'Sim User', email: 'sim.operator@wolfspoint.test' }}
        />
      ),
    },
    {
      id: 'joined-game-options',
      label: 'JoinedGameOptionsDialog',
      render: (open, close) => (
        <JoinedGameOptionsDialog
          gameId="SIMPLY567"
          gameName="Simulation Game SIMP"
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          onArchive={noop}
        />
      ),
    },
    {
      id: 'archived-games',
      label: 'ArchivedGamesDialog',
      render: (open, close) => (
        <ArchivedGamesDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          setActiveGameId={noop}
          archivedGames={{ value: ['SIMPLY567'] } as any}
          setArchivedGames={noop}
        />
      ),
    },
    {
      id: 'markdown-input-builder',
      label: 'MarkdownInputBuilderDialog',
      render: (open, close) => (
        <MarkdownInputBuilderDialog
          isOpen={open}
          onInsert={noop}
          onOpenChange={(o) => (o ? undefined : close())}
          selectedText="target player"
        />
      ),
    },
    {
      id: 'markdown-variable',
      label: 'MarkdownVariableDialog',
      render: (open, close) => (
        <MarkdownVariableDialog isOpen={open} onOpenChange={(o) => (o ? undefined : close())} onInsert={noop} />
      ),
    },
    {
      id: 'nightly-certification',
      label: 'NightlyCertificationDialog',
      render: (open, close) => (
        <NightlyCertificationDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          users={sampleUsers() as any}
          submissionsByEmail={submissionsByEmail() as any}
          onCertifyVotes={noop}
          onCertifyActions={noop}
        />
      ),
    },
    {
      id: 'schedule-table-update',
      label: 'ScheduleTableUpdateDialog',
      render: (open, close) => (
        <ScheduleTableUpdateDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          onSchedule={async () => {}}
        />
      ),
    },
    {
      id: 'column-actions',
      label: 'ColumnActionsDialog',
      render: (open, close) => (
        <ColumnActionsDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          title="Suspicion"
          selectedSize={'medium' as any}
          onSelectSize={noop}
          onDelete={noop}
          showInNightly
          onToggleShowInNightly={noop}
        />
      ),
    },
    {
      id: 'phonebook-toc',
      label: 'PhoneBookTocDialog',
      render: (open, close) => (
        <PhoneBookTocDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          gameId={GAME_ID}
          anchorPrefix="sim-anchor-"
          players={sampleUsers().map((u: any) => ({ userId: u.userId }))}
          titleEntry={{ label: 'Your Profile', anchorId: 'sim-anchor-self' }}
        />
      ),
    },
    {
      id: 'rulebook-toc',
      label: 'TableOfContentsDialog (rulebook)',
      render: (open, close) => (
        <TableOfContentsDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          markdown={ruleBook().content ?? longMarkdown}
          headingIdPrefix="sim-rulebook-"
          roles={roleTable() as any}
          ruleBookTitle={ruleBook().ruleBookTitle ?? 'Book of WolffsPoint'}
          roleDescriptionsTitle={ruleBook().roleDescriptionsTitle ?? 'Roles in play'}
        />
      ),
    },
    {
      id: 'import-draft',
      label: 'ImportDraftDialog',
      render: (open, close) => (
        <ImportDraftDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          draft={sampleDraft as any}
          isLoading={false}
          sourceLabel="Newser"
          realGameId={GAME_ID}
          onConfirmImport={close}
        />
      ),
    },
    {
      id: 'newspaper-section-options',
      label: 'NewspaperSectionOptionsDialog',
      render: (open, close) => (
        <NewspaperSectionOptionsDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          sectionNumber={1}
          titleFont={'playfairDisplay' as any}
          dividerStyle={'diamond' as any}
          onTitleFontChange={noop}
          onDividerStyleChange={noop}
          onDelete={noop}
          canDelete
        />
      ),
    },
    {
      id: 'player-preview',
      label: 'PlayerPreviewModal',
      render: (open, close) => (
        <PlayerPreviewModal
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          gameId={GAME_ID}
          roleName="Villager"
        />
      ),
    },
    {
      id: 'townsquare-image',
      label: 'TownSquareImageDialog',
      render: (open, close) => (
        <TownSquareImageDialog isOpen={open} onInsert={noop} onOpenChange={(o) => (o ? undefined : close())} />
      ),
    },
    {
      id: 'townsquare-link',
      label: 'TownSquareLinkDialog',
      render: (open, close) => (
        <TownSquareLinkDialog
          isOpen={open}
          onInsert={noop}
          onOpenChange={(o) => (o ? undefined : close())}
          selectedText="the granary"
        />
      ),
    },
    {
      id: 'townsquare-more',
      label: 'TownSquareMoreOptionsDialog',
      render: (open, close) => (
        <TownSquareMoreOptionsDialog isOpen={open} onSelectAction={noop} onOpenChange={(o) => (o ? undefined : close())} />
      ),
    },
    {
      id: 'confirm',
      label: 'ConfirmDialog',
      render: (open, close) => (
        <ConfirmDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          onConfirm={close}
          title="Confirm action"
          message="Are you sure you want to do this?"
          danger
        />
      ),
    },
    {
      id: 'image-upload',
      label: 'ImageUploadDialog',
      render: (open, close) => (
        <ImageUploadDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          onImageSelect={noop}
          title="Upload image"
        />
      ),
    },
    {
      id: 'save-history',
      label: 'SaveHistoryDialog',
      render: (open, close) => (
        <SaveHistoryDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          history={sampleSavedEntries as any}
          maxSaves={5}
          onSelectEntry={noop}
          onClearHistory={noop}
        />
      ),
    },
    {
      id: 'unsaved-changes',
      label: 'UnsavedChangesDialog',
      render: (open, close) => (
        <UnsavedChangesDialog isOpen={open} onOpenChange={(o) => (o ? undefined : close())} onSave={close} onDiscard={close} />
      ),
    },
    {
      id: 'view-only-preview',
      label: 'ViewOnlyPreviewModal',
      render: (open, close) => (
        <ViewOnlyPreviewModal
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          title="Saved entry"
          entry={sampleSavedEntries[0] as any}
          onReplace={close}>
          <View style={{ padding: 12 }}>
            <Text style={{ color: '#333' }}>Saved preview content</Text>
          </View>
        </ViewOnlyPreviewModal>
      ),
    },
    {
      id: 'delete-game-confirm',
      label: 'DeleteGameConfirmationDialog',
      render: (open, close) => (
        <DeleteGameConfirmationDialog
          isOpen={open}
          onOpenChange={(o) => (o ? undefined : close())}
          onConfirm={close}
        />
      ),
    },
  ];

  return entries;
}

// --- panel -------------------------------------------------------------------

export default function ModalLab() {
  const ui = useSimUi();
  const entries = useLabEntries();
  const { minimize: ctxMinimize } = useMinimize();
  const minimizeFor = (id: string) => (title: string) => {
    ctxMinimize({
      title,
      domClone: document.createElement('div'),
      originalWidth: 400,
      originalHeight: 300,
      onRestore: () => simUi.set({ openModalId: id }),
    });
  };
  // Dialogs mount lazily on first open then stay mounted (isOpen=false),
  // mirroring the app's minimize-persistence behavior.
  const [everOpened, setEverOpened] = React.useState<Set<string>>(() => new Set());

  const openId = ui.openModalId;
  const open = (id: string) => {
    setEverOpened((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    simUi.set({ openModalId: id });
  };
  const close = () => simUi.closeModal();

  if (!ui.labOpen) {
    return (
      <>
        {entries
          .filter((e) => everOpened.has(e.id))
          .map((e) => (
            <React.Fragment key={e.id}>{e.render(false, close, minimizeFor(e.id))}</React.Fragment>
          ))}
      </>
    );
  }

  return (
    <>
      {entries
        .filter((e) => everOpened.has(e.id))
        .map((e) => (
          <React.Fragment key={e.id}>{e.render(e.id === openId, close, minimizeFor(e.id))}</React.Fragment>
        ))}

      {/* lab panel */}
      <View
        // @ts-expect-error web-only fixed positioning
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 340,
          zIndex: 99990,
          backgroundColor: '#17151c',
          borderRightWidth: 1,
          borderRightColor: '#3a3644',
        }}>
        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#3a3644' }}>
          <Text style={{ color: '#efe8d5', fontSize: 16, fontWeight: '700' }}>Modal Lab</Text>
          <Text style={{ color: '#9a93a5', fontSize: 11, marginTop: 2 }}>
            {entries.length} dialogs · mounted: {everOpened.size}
          </Text>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {entries.map((e) => (
            <Pressable
              key={e.id}
              testID={`modallab-open-${e.id}`}
              onPress={() => open(e.id)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#26222e',
                backgroundColor: e.id === openId ? '#332d42' : 'transparent',
              }}>
              <Text style={{ color: '#ded6c4', fontSize: 13 }}>{e.label}</Text>
              <Text style={{ color: '#7d7488', fontSize: 10 }}>{e.id}{everOpened.has(e.id) ? ' · mounted' : ''}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          testID="modallab-close-panel"
          onPress={() => {
            close();
            simUi.set({ labOpen: false });
          }}
          style={{ padding: 12, borderTopWidth: 1, borderTopColor: '#3a3644' }}>
          <Text style={{ color: '#efe8d5', fontSize: 13, textAlign: 'center' }}>Close panel</Text>
        </Pressable>
      </View>
    </>
  );
}
