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
import { getPlayerActionSummary, normalizeVoteTargets } from '../../../utils/multiplayer';
import ActionPills from './ActionPills';
import { resolveVoteEmailToName } from './VoteEditorDialog';

const formatInputValue = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch {
    return value;
  }
  return value;
};

const formatPlannedUpdate = (
  update: NonNullable<PlayerNightSubmission['plannedUpdates']>[number],
  users: UserTableItem[]
): string => {
  const playerName =
    update.playerIndex !== null && update.playerIndex < users.length
      ? users[update.playerIndex].realName || users[update.playerIndex].email
      : 'All players';
  const dayLabel = update.dayIndex !== null ? `Day ${update.dayIndex + 1}, ` : '';
  return `${playerName} → ${dayLabel}${update.column}: ${update.updateExpression}`;
};

interface NightlyCertificationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserTableItem[];
  submissionsByEmail: Record<string, PlayerNightSubmission>;
  onCertifyVotes: () => void;
  onCertifyActions: () => void;
}

const NightlyCertificationDialog = ({
  isOpen,
  onOpenChange,
  users,
  submissionsByEmail,
  onCertifyVotes,
  onCertifyActions,
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
            <Column className="gap-3">
              {users.map((user) => {
                const submission = submissionsByEmail[user.email.toLowerCase()];
                const resolvedVote = normalizeVoteTargets(submission?.vote)
                  .map((vote) => resolveVoteEmailToName(vote, users))
                  .join(', ');
                const actionSummary = getPlayerActionSummary(submission?.action);
                const voteUpdates = submission?.votePlannedUpdates ?? [];
                const actionUpdates = submission?.plannedUpdates ?? [];
                const supplementalVoteInputs = Object.entries(submission?.voteInputs ?? {}).filter(
                  ([key, value]) => key !== submission?.voteInputKey && value?.trim()
                );

                return (
                  <Column
                    key={user.email}
                    className="border-subtle-border gap-3 rounded-lg border p-3">
                    <Column className="gap-0">
                      <FontText weight="medium">
                        {user.realName || <FontText className="opacity-50">No Name</FontText>}
                      </FontText>
                      <FontText variant="subtext">
                        {user.role || <FontText className="opacity-50">No role</FontText>}
                      </FontText>
                    </Column>
                    <Row className="items-start gap-4" style={{ flexWrap: 'wrap' }}>
                      <Column className="min-w-[240px] flex-1 gap-2">
                        <FontText weight="medium">Vote</FontText>
                        <FontText>{resolvedVote || '—'}</FontText>
                        {submission?.voteMultiplier !== undefined &&
                          submission.voteMultiplier !== 1 && (
                            <FontText variant="subtext">
                              {submission.voteMultiplier}x weight
                            </FontText>
                          )}
                        {supplementalVoteInputs.map(([label, value]) => (
                          <FontText key={label} variant="subtext">
                            {label}: {formatInputValue(value || '')}
                          </FontText>
                        ))}
                        <Column className="gap-0.5">
                          <FontText variant="subtext">Vote cell updates</FontText>
                          {voteUpdates.length > 0 ? (
                            voteUpdates.map((update, index) => (
                              <FontText key={index} variant="subtext" className="text-xs">
                                • {formatPlannedUpdate(update, users)}
                              </FontText>
                            ))
                          ) : (
                            <FontText className="opacity-50">—</FontText>
                          )}
                        </Column>
                      </Column>
                      <Column className="min-w-[240px] flex-1 gap-2">
                        <FontText weight="medium">Action</FontText>
                        {actionSummary ? (
                          <ActionPills actionText={actionSummary} />
                        ) : (
                          <FontText className="opacity-50">—</FontText>
                        )}
                        <Column className="gap-0.5">
                          <FontText variant="subtext">Action cell updates</FontText>
                          {actionUpdates.length > 0 ? (
                            actionUpdates.map((update, index) => (
                              <FontText key={index} variant="subtext" className="text-xs">
                                • {formatPlannedUpdate(update, users)}
                              </FontText>
                            ))
                          ) : (
                            <FontText className="opacity-50">—</FontText>
                          )}
                        </Column>
                      </Column>
                    </Row>
                  </Column>
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
              className="px-6 py-2"
              onPress={() => {
                onCertifyVotes();
                onOpenChange(false);
              }}>
              <FontText weight="medium" color="white">
                Add Votes To Table
              </FontText>
            </AppButton>
            <AppButton
              variant="black"
              className="px-6 py-2"
              onPress={() => {
                onCertifyActions();
                onOpenChange(false);
              }}>
              <FontText weight="medium" color="white">
                Add Actions To Table
              </FontText>
            </AppButton>
          </Row>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
    </ConvexDialog.Root>
  );
};

export default NightlyCertificationDialog;
