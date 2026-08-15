import React from 'react';
import { ScrollView, View } from 'react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import { PlayerNightSubmission } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import { getPlayerActionSummary } from '../../../utils/multiplayer';
import ActionPills from './ActionPills';
import { resolveVoteEmailToName } from './VoteEditorDialog';

const formatPlannedUpdate = (
  update: NonNullable<PlayerNightSubmission['plannedUpdates']>[number],
  users: UserTableItem[]
): string => {
  const playerName =
    update.playerIndex !== null && update.playerIndex < users.length
      ? users[update.playerIndex].realName || users[update.playerIndex].email
      : 'All players';
  const dayLabel = update.dayIndex !== null ? `Day ${update.dayIndex + 1}, ` : '';
  return `${playerName} → ${dayLabel}${update.column}: ${update.value}`;
};

interface NightlyCertificationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserTableItem[];
  submissionsByEmail: Record<string, PlayerNightSubmission>;
  onCertify: () => void;
}

const NightlyCertificationDialog = ({
  isOpen,
  onOpenChange,
  users,
  submissionsByEmail,
  onCertify,
}: NightlyCertificationDialogProps) => {
  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Trigger asChild>
        <View />
      </ConvexDialog.Trigger>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="h-[85vh] max-w-5xl p-1">
          <ConvexDialog.Close
            iconProps={{ color: 'rgb(246, 238, 219)' }}
            className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full"
          />
          <DialogHeader
            text="Nightly submissions"
            subtext="Review what each player submitted before you certify it into the operator table."
          />
          <ScrollView className="pb-4 pt-2 sm:p-4">
            <Column className="gap-2">
              <Row className="border-subtle-border gap-4 border-b pb-2">
                <FontText weight="medium" className="flex-1">
                  Player
                </FontText>
                <FontText weight="medium" className="flex-1">
                  Vote
                </FontText>
                <FontText weight="medium" className="flex-1">
                  Action
                </FontText>
                <FontText weight="medium" className="flex-1">
                  Cell Updates
                </FontText>
              </Row>
              {users.map((user) => {
                const submission = submissionsByEmail[user.email.toLowerCase()];
                const rawVote = submission?.vote ?? '';
                const resolvedVote = resolveVoteEmailToName(rawVote, users);
                const actionSummary = getPlayerActionSummary(submission?.action);
                const plannedUpdates = submission?.plannedUpdates ?? [];

                return (
                  <Row
                    key={user.email}
                    className="border-subtle-border items-start gap-4 border-b py-2">
                    <Column className="flex-1 gap-0">
                      <FontText weight="medium" className="overflow-hidden text-nowrap">
                        {user.realName || <FontText className="opacity-50">No Name</FontText>}
                      </FontText>
                      <FontText variant="subtext" className="overflow-hidden text-nowrap">
                        {user.role || <FontText className="opacity-50">No role</FontText>}
                      </FontText>
                    </Column>
                    <FontText weight="medium" className="flex-1">
                      {submission?.vote?.trim() ? resolvedVote : '—'}
                    </FontText>
                    <Column className="flex-1 items-center justify-center">
                      {actionSummary ? (
                        <ActionPills actionText={actionSummary} />
                      ) : (
                        <FontText className="opacity-50">—</FontText>
                      )}
                    </Column>
                    <Column className="flex-1 gap-0.5">
                      {plannedUpdates.length > 0 ? (
                        plannedUpdates.map((update, i) => (
                          <FontText key={i} variant="subtext" className="text-xs">
                            • {formatPlannedUpdate(update, users)}
                          </FontText>
                        ))
                      ) : (
                        <FontText className="opacity-50">—</FontText>
                      )}
                    </Column>
                  </Row>
                );
              })}
            </Column>
          </ScrollView>
          <Row className="flex-wrap justify-end gap-4 pb-4 sm:px-4">
            <AppButton variant="outline" className="w-20" onPress={() => onOpenChange(false)}>
              <FontText weight="medium">Close</FontText>
            </AppButton>
            <AppButton
              variant="black"
              className="w-36"
              onPress={() => {
                onCertify();
                onOpenChange(false);
              }}>
              <FontText weight="medium" color="white">
                Add To Table
              </FontText>
            </AppButton>
          </Row>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default NightlyCertificationDialog;
