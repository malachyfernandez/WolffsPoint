import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import FontTextInput from '../ui/forms/FontTextInput';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import SaveHistoryPill from '../ui/dialog/SaveHistoryPill';
import SaveHistoryDialog from '../ui/dialog/SaveHistoryDialog';
import ViewOnlyPreviewModal from '../ui/dialog/ViewOnlyPreviewModal';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import DisableableButton from '../ui/buttons/DisableableButton';
import ActionPills from './ActionPills';
import ShadowScrollView from '../ui/ShadowScrollView';
import { useSaveHistory, SavedEntry } from '../../../hooks/useSaveHistory';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from '../../../contexts/KeyboardShortcutHintContext';

interface ActionEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialAction?: string;
  onSubmit: (action: string) => void;
  dialogSubtext?: string;
  /** Scoped key for save history storage. If omitted, save history is disabled. */
  historyKey?: string;
}

const ActionEditorDialog = ({
  isOpen,
  onOpenChange,
  title,
  initialAction = '',
  onSubmit,
  dialogSubtext,
  historyKey,
}: ActionEditorDialogProps) => {
  const { history, addSave, clearHistory, maxSaves } = useSaveHistory(historyKey ?? null);
  const { setHint } = useKeyboardShortcutHint();
  const [draftAction, setDraftAction] = useState(initialAction);
  const [editingStartAction, setEditingStartAction] = useState(initialAction);
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<SavedEntry | null>(null);
  const [hasEverBeenEnabled, setHasEverBeenEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftAction(initialAction);
      setEditingStartAction(initialAction);
      setIsHistoryOpen(false);
      setPreviewEntry(null);
      setHasEverBeenEnabled(false);
    }
  }, [initialAction, isOpen]);

  const hasUnsavedChanges = draftAction.trim() !== (editingStartAction?.trim() || '');

  useEffect(() => {
    if (hasUnsavedChanges) setHasEverBeenEnabled(true);
  }, [hasUnsavedChanges]);

  const doneEnabled = hasUnsavedChanges || hasEverBeenEnabled;

  const handleSubmit = () => {
    onSubmit(draftAction.trim());
    onOpenChange(false);
  };

  // Save without closing — persists via onSubmit and adds to history
  const handleSave = () => {
    if (!hasUnsavedChanges) return;
    onSubmit(draftAction.trim());
    setEditingStartAction(draftAction.trim());
    if (historyKey) {
      addSave(draftAction.trim(), draftAction.trim().slice(0, 200));
    }
  };

  // Replace current draft with a saved entry from history
  const handleReplaceFromHistory = (entry: SavedEntry) => {
    setDraftAction(entry.value as string);
    setPreviewEntry(null);
    setIsHistoryOpen(false);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      setDraftAction(initialAction);
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
    setDraftAction(initialAction);
    onOpenChange(false);
  };

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
          <ConvexDialog.Content className="max-w-lg p-1" isSwipeable={false}>
            <Pressable
              onPress={handleAttemptClose}
              onHoverIn={() => setHint(['esc'])}
              onHoverOut={() => setHint(null)}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full">
              <X size={18} color="rgb(246, 238, 219)" />
            </Pressable>
            {historyKey && (
              <SaveHistoryPill
                hasUnsavedChanges={hasUnsavedChanges}
                isInvalid={false}
                onSave={handleSave}
                onOpenHistory={() => setIsHistoryOpen(true)}
              />
            )}
            <DialogHeader text={title} subtext={dialogSubtext} />

            <Column className="gap-4 p-0 pt-4 sm:p-5">
              {/* Text Input for editing */}
              <Column className="gap-1">
                <FontText weight="medium" className="text-sm opacity-70">
                  Action Text
                </FontText>
                <FontTextInput
                  value={draftAction}
                  onChangeText={setDraftAction}
                  placeholder="e.g., Kill: Ty Pace • Weapon: Piano"
                  multiline
                  numberOfLines={3}
                  variant="styled"
                  className="p-2"
                  style={{ fontFamily: 'Poppins-Regular' }}
                />
                <FontText className="text-xs opacity-50">
                  Use • to separate multiple actions. Use : to separate label from value.
                </FontText>
              </Column>

              {/* Live Preview */}
              <Column className="flex-1 gap-1">
                <FontText weight="medium" className="text-sm opacity-70">
                  Preview
                </FontText>
                <View className="bg-background border-border min-h-[80px] flex-1 rounded-lg border-2 p-3">
                  <ShadowScrollView className="h-full">
                    <ActionPills actionText={draftAction} />
                  </ShadowScrollView>
                </View>
              </Column>

              {/* Action Buttons */}
              <Row className="justify-end gap-4 pt-2">
                <AppButton variant="outline" onPress={handleCancel} className="w-22 h-12 sm:w-32">
                  <FontText>Cancel</FontText>
                </AppButton>
                <DisableableButton
                  isEnabled={doneEnabled}
                  enabledText="Done"
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
            title="Preview Saved Action"
            subtext={previewEntry ? new Date(previewEntry.savedAt).toLocaleString() : undefined}
            entry={previewEntry}
            onReplace={handleReplaceFromHistory}
          >
            {previewEntry && (
              <ScrollView className="flex-1" contentContainerClassName="p-4">
                <ActionPills actionText={(previewEntry.value as string) ?? ''} />
              </ScrollView>
            )}
          </ViewOnlyPreviewModal>
        </>
      )}
    </>
  );
};

export default ActionEditorDialog;
