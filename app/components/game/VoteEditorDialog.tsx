import React, { useEffect, useState, useMemo } from 'react';
import { View } from 'react-native';
import FontTextInput from '../ui/forms/FontTextInput';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../ui/dialog/UnsavedChangesDialog';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import DisableableButton from '../ui/buttons/DisableableButton';
import { UserTableItem } from '../../../types/playerTable';
interface VoteEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialVote?: string;
  initialVoteMultiplier?: number;
  onSubmit: (vote: string, voteMultiplier: number) => void;
  dialogSubtext?: string;
  users: UserTableItem[];
}

export const resolveVoteEmailToName = (voteEmail: string, users: UserTableItem[]): string => {
  if (!voteEmail.trim()) {
    return 'No vote';
  }

  const trimmedEmail = voteEmail.trim();
  if (trimmedEmail === 'SKIP_VOTE') {
    return 'Skipped Vote';
  }

  const targetUser = users.find((u) => u.email.toLowerCase() === trimmedEmail.toLowerCase());

  return targetUser?.realName || voteEmail;
};

const VoteEditorDialog = ({
  isOpen,
  onOpenChange,
  title,
  initialVote = '',
  initialVoteMultiplier = 1,
  onSubmit,
  dialogSubtext,
  users,
}: VoteEditorDialogProps) => {
  const [draftVote, setDraftVote] = useState(initialVote);
  const [editingStartVote, setEditingStartVote] = useState(initialVote);
  const [draftMultiplier, setDraftMultiplier] = useState(String(initialVoteMultiplier));
  const [editingStartMultiplier, setEditingStartMultiplier] = useState(
    String(initialVoteMultiplier)
  );
  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftVote(initialVote);
      setEditingStartVote(initialVote);
      setDraftMultiplier(String(initialVoteMultiplier));
      setEditingStartMultiplier(String(initialVoteMultiplier));
    }
  }, [initialVote, initialVoteMultiplier, isOpen]);

  const parsedMultiplier = parseInt(draftMultiplier, 10);
  const safeMultiplier = isNaN(parsedMultiplier) ? 1 : parsedMultiplier;

  const hasUnsavedChanges =
    draftVote.trim() !== (editingStartVote?.trim() || '') ||
    String(safeMultiplier) !== editingStartMultiplier;

  const resolvedName = useMemo(() => {
    return resolveVoteEmailToName(draftVote, users);
  }, [draftVote, users]);

  const handleSubmit = () => {
    onSubmit(draftVote.trim(), safeMultiplier);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      setDraftVote(initialVote);
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
    setDraftVote(initialVote);
    setDraftMultiplier(String(initialVoteMultiplier));
    onOpenChange(false);
  };

  const handleCancelLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
  };

  const handleMultiplierChange = (text: string) => {
    // Allow optional leading - and digits only
    const cleaned = text.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '');
    setDraftMultiplier(cleaned);
  };

  return (
    <>
      <ConvexDialog.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md p-1" isSwipeable={!hasUnsavedChanges}>
            <ConvexDialog.Close
              iconProps={{ color: 'rgb(246, 238, 219)' }}
              className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
              onPress={handleAttemptClose}
            />
            <DialogHeader text={title} subtext={dialogSubtext} />

            <Column className="gap-4 p-0 pt-4 sm:p-5">
              {/* Email Input */}
              <Column className="gap-1">
                <FontText weight="medium" className="text-sm opacity-70">
                  Player Email
                </FontText>
                <FontTextInput
                  value={draftVote}
                  onChangeText={setDraftVote}
                  placeholder="Enter player email..."
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

              {/* Action Buttons */}
              <Row className="justify-end gap-4 pt-2">
                <AppButton variant="outline" onPress={handleCancel} className="h-12 w-24 sm:w-32">
                  <FontText>Cancel</FontText>
                </AppButton>
                <DisableableButton
                  isEnabled={hasUnsavedChanges}
                  enabledText="Save"
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
        onStay={handleCancelLeave}
        onLeave={handleConfirmLeave}
      />
    </>
  );
};

export default VoteEditorDialog;
