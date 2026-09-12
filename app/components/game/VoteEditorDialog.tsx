import React, { useEffect, useState, useMemo } from 'react';
import { View } from 'react-native';
import FontTextInput from '../ui/forms/FontTextInput';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import CloseButton from '../ui/dialog/CloseButton';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import SaveHistoryPill from '../ui/dialog/SaveHistoryPill';
import SaveHistoryDialog from '../ui/dialog/SaveHistoryDialog';
import ViewOnlyPreviewModal from '../ui/dialog/ViewOnlyPreviewModal';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import DisableableButton from '../ui/buttons/DisableableButton';
import { UserTableItem } from '../../../types/playerTable';
import { MarkdownInputState, VoteValue } from '../../../types/multiplayer';
import { normalizeVoteTargets } from '../../../utils/multiplayer';
import { useSaveHistory, SavedEntry } from '../../../hooks/useSaveHistory';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from '../../../contexts/KeyboardShortcutHintContext';
const formatInputValue = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch {
    return value;
  }
  return value;
};

interface VoteEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialVote?: VoteValue;
  initialVoteMultiplier?: number;
  voteInputs?: MarkdownInputState;
  voteInputKey?: string;
  onSubmit: (vote: VoteValue, voteMultiplier: number) => void;
  dialogSubtext?: string;
  users: UserTableItem[];
  /** Scoped key for save history storage. If omitted, save history is disabled. */
  historyKey?: string;
}

export const resolveVoteEmailToName = (vote: VoteValue, users: UserTableItem[]): string => {
  const targets = normalizeVoteTargets(vote);
  if (targets.length === 0) return 'No vote';
  if (targets.length === 1 && targets[0] === 'SKIP_VOTE') return 'Skipped Vote';
  return targets
    .map((target) => {
      const user = users.find((item) => item.email.toLowerCase() === target.toLowerCase());
      return user?.realName || target;
    })
    .join(', ');
};

const VoteEditorDialog = ({
  isOpen,
  onOpenChange,
  title,
  initialVote = '',
  initialVoteMultiplier = 1,
  voteInputs,
  voteInputKey,
  onSubmit,
  dialogSubtext,
  users,
  historyKey,
}: VoteEditorDialogProps) => {
  const initialVoteText = normalizeVoteTargets(initialVote).join(', ');
  const [draftVote, setDraftVote] = useState(initialVoteText);
  const [editingStartVote, setEditingStartVote] = useState(initialVoteText);
  const [draftMultiplier, setDraftMultiplier] = useState(String(initialVoteMultiplier));
  const [editingStartMultiplier, setEditingStartMultiplier] = useState(
    String(initialVoteMultiplier)
  );
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<SavedEntry | null>(null);
  const [hasEverBeenEnabled, setHasEverBeenEnabled] = useState(false);

  const { history, addSave, clearHistory, maxSaves } = useSaveHistory(historyKey ?? null);
  const { setHint } = useKeyboardShortcutHint();

  useEffect(() => {
    if (isOpen) {
      setDraftVote(initialVoteText);
      setEditingStartVote(initialVoteText);
      setDraftMultiplier(String(initialVoteMultiplier));
      setEditingStartMultiplier(String(initialVoteMultiplier));
      setIsLeaveConfirmDialogOpen(false);
      setIsHistoryOpen(false);
      setPreviewEntry(null);
      setHasEverBeenEnabled(false);
    }
  }, [initialVoteMultiplier, initialVoteText, isOpen]);

  const parsedMultiplier = parseInt(draftMultiplier, 10);
  const safeMultiplier = isNaN(parsedMultiplier) ? 1 : parsedMultiplier;

  const hasUnsavedChanges =
    draftVote.trim() !== (editingStartVote?.trim() || '') ||
    String(safeMultiplier) !== editingStartMultiplier;

  useEffect(() => {
    if (hasUnsavedChanges) {
      setHasEverBeenEnabled(true);
    }
  }, [hasUnsavedChanges]);

  const resolvedName = useMemo(() => {
    return resolveVoteEmailToName(draftVote, users);
  }, [draftVote, users]);
  const supplementalInputs = Object.entries(voteInputs ?? {}).filter(
    ([key, value]) => key !== voteInputKey && value?.trim()
  );

  const handleSubmit = () => {
    const targets = draftVote
      .split(',')
      .map((target) => target.trim())
      .filter(Boolean);
    onSubmit(targets.length > 1 ? targets : targets[0] || '', safeMultiplier);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      setDraftVote(initialVoteText);
      setDraftMultiplier(String(initialVoteMultiplier));
      onOpenChange(false);
    }
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
    setDraftVote(initialVoteText);
    setDraftMultiplier(String(initialVoteMultiplier));
    onOpenChange(false);
  };

  const handleMultiplierChange = (text: string) => {
    // Allow optional leading - and digits only
    const cleaned = text.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');
    setDraftMultiplier(cleaned);
  };

  // Sticky-enabled: once Done becomes enabled, it stays enabled (until dialog closes)
  const doneEnabled = (hasUnsavedChanges || hasEverBeenEnabled);

  // Save without closing — persists via onSubmit and adds to history
  const handleSave = () => {
    if (!hasUnsavedChanges) return;
    const targets = draftVote
      .split(',')
      .map((target) => target.trim())
      .filter(Boolean);
    const voteValue = targets.length > 1 ? targets : targets[0] || '';
    onSubmit(voteValue, safeMultiplier);
    setEditingStartVote(draftVote.trim());
    setEditingStartMultiplier(String(safeMultiplier));

    if (historyKey) {
      const preview = `Vote: ${resolveVoteEmailToName(voteValue, users)} (${safeMultiplier}x)`;
      addSave({ vote: voteValue, multiplier: safeMultiplier }, preview);
    }
  };

  // Replace current draft with a saved entry from history
  const handleReplaceFromHistory = (entry: SavedEntry) => {
    const savedValue = entry.value as { vote: VoteValue; multiplier: number };
    const voteText = normalizeVoteTargets(savedValue.vote).join(', ');
    setDraftVote(voteText);
    setDraftMultiplier(String(savedValue.multiplier));
    setPreviewEntry(null);
    setIsHistoryOpen(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: handleSave,
    onClose: handleAttemptClose,
    enabled: isOpen && !isHistoryOpen && !previewEntry,
  });

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md p-1" isSwipeable={false}>
            <CloseButton onPress={handleAttemptClose} />
            {historyKey && (
              <SaveHistoryPill
                hasUnsavedChanges={hasUnsavedChanges}
                onSave={handleSave}
                onOpenHistory={() => setIsHistoryOpen(true)}
              />
            )}
            <DialogHeader text={title} subtext={dialogSubtext} />

            <Column className="gap-4 p-0 pt-4 sm:p-5">
              {/* Email Input */}
              <Column className="gap-1">
                <FontText weight="medium" className="text-sm opacity-70">
                  Vote target emails
                </FontText>
                <FontTextInput
                  value={draftVote}
                  onChangeText={setDraftVote}
                  placeholder="Enter one or more emails, separated by commas..."
                  variant="styled"
                  className="p-2"
                  style={{ fontFamily: 'Poppins-Regular' }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </Column>

              {/* Live Preview */}
              <Column className="gap-1">
                <FontText weight="medium" className="text-sm opacity-70">
                  Resolved Name
                </FontText>
                <View className="bg-text border-border rounded-lg border-2 p-3">
                  <FontText color="white" weight="medium" className="text-center">
                    {resolvedName}
                  </FontText>
                </View>
              </Column>

              {/* Vote Multiplier */}
              <Column className="gap-1">
                <FontText weight="medium" className="text-sm opacity-70">
                  Vote Multiplier
                </FontText>
                <Row className="items-center gap-3">
                  <FontTextInput
                    value={draftMultiplier}
                    onChangeText={handleMultiplierChange}
                    placeholder="1"
                    variant="styled"
                    className="w-24 p-2"
                    style={{ fontFamily: 'Poppins-Regular' }}
                    keyboardType="numeric"
                  />
                  <FontText variant="subtext" className="text-sm">
                    {safeMultiplier === 1
                      ? 'Standard vote (1x)'
                      : safeMultiplier === -1
                        ? 'Thief-style negative vote (-1x)'
                        : `${safeMultiplier}x vote weight`}
                  </FontText>
                </Row>
              </Column>

              {supplementalInputs.length > 0 && (
                <Column className="gap-2">
                  <FontText weight="medium" className="text-sm opacity-70">
                    Supplemental vote responses
                  </FontText>
                  <Column className="bg-text/5 gap-2 rounded-lg p-3">
                    {supplementalInputs.map(([label, value]) => (
                      <Row key={label} className="items-start justify-between gap-3">
                        <FontText weight="medium" className="flex-1">
                          {label}
                        </FontText>
                        <FontText className="flex-1 text-right">
                          {formatInputValue(value || '')}
                        </FontText>
                      </Row>
                    ))}
                  </Column>
                </Column>
              )}

              {/* Action Buttons */}
              <Row className="justify-end gap-4 pt-2">
                <AppButton variant="outline" onPress={handleCancel} className="h-12 w-24 sm:w-32"
                  onHoverIn={() => setHint(['esc'])}
                  onHoverOut={() => setHint(null)}>
                  <FontText>Cancel</FontText>
                </AppButton>
                <DisableableButton
                  isEnabled={doneEnabled}
                  enabledText="Done"
                  className="w-24 sm:w-32"
                  disabledText="No changes"
                  onPress={handleSubmit}
                  enabledVariant="filled"
                />
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmDialogOpen}
        onOpenChange={setIsLeaveConfirmDialogOpen}
        onSave={handleSubmit}
        onDiscard={handleConfirmLeave}
      />

      {historyKey && (
        <>
          <SaveHistoryDialog
            isOpen={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            history={history}
            maxSaves={maxSaves}
            onSelectEntry={(entry) => setPreviewEntry(entry)}
            onClearHistory={clearHistory}
          />
          <ViewOnlyPreviewModal
            isOpen={previewEntry !== null}
            onOpenChange={(open) => { if (!open) setPreviewEntry(null); }}
            title="Preview Saved Vote"
            subtext={previewEntry ? new Date(previewEntry.savedAt).toLocaleString() : undefined}
            entry={previewEntry}
            onReplace={handleReplaceFromHistory}
          >
            {previewEntry && (
              <Column className="gap-4 p-4">
                <FontText weight="medium" className="text-sm opacity-70">Vote targets</FontText>
                <FontText>{normalizeVoteTargets((previewEntry.value as { vote: VoteValue }).vote).join(', ') || 'No vote'}</FontText>
                <FontText weight="medium" className="text-sm opacity-70">Resolved name</FontText>
                <FontText>{resolveVoteEmailToName((previewEntry.value as { vote: VoteValue }).vote, users)}</FontText>
                <FontText weight="medium" className="text-sm opacity-70">Multiplier</FontText>
                <FontText>{(previewEntry.value as { multiplier: number }).multiplier}x</FontText>
              </Column>
            )}
          </ViewOnlyPreviewModal>
        </>
      )}
    </>
  );
};

export default VoteEditorDialog;
