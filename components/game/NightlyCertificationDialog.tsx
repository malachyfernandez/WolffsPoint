import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import AppButton from '../ui/buttons/AppButton';
import { PlayerNightSubmission } from 'types/multiplayer';
import { UserTableItem } from 'types/playerTable';
import { getPlayerActionSummary, normalizeVoteTargets } from 'utils/multiplayer';
import ActionPills from './ActionPills';
import { ResolvedVoteName } from './VoteEditorDialog';
import CloseButton from '../ui/dialog/CloseButton';

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

type CertifyType = 'votes' | 'actions';
type AutoResolve = 'keep' | 'replace';

interface NightlyCertificationDialogProps {
  disabled?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserTableItem[];
  submissionsByEmail: Record<string, PlayerNightSubmission>;
  onCertifyVotes: (autoResolve?: AutoResolve) => void;
  onCertifyActions: (autoResolve?: AutoResolve) => void;
  /** First-pass conflict count for the resolve screen; null when unknown. */
  onCountConflicts?: (type: CertifyType) => number | null;
}

const NightlyCertificationDialog = ({
  isOpen,
  onOpenChange,
  users,
  submissionsByEmail,
  onCertifyVotes,
  onCertifyActions,
  onCountConflicts,
  disabled = false,
}: NightlyCertificationDialogProps) => {
  const [resolveMenu, setResolveMenu] = useState<{
    type: CertifyType;
    count: number | null;
  } | null>(null);

  const openResolveMenu = (type: CertifyType) =>
    setResolveMenu({ type, count: onCountConflicts?.(type) ?? null });

  const confirmResolve = (choice: AutoResolve) => {
    if (!resolveMenu) return;
    if (resolveMenu.type === 'votes') onCertifyVotes(choice);
    else onCertifyActions(choice);
    setResolveMenu(null);
    onOpenChange(false);
  };

  const certifySplit = (
    type: CertifyType,
    shortLabel: string,
    label: string,
    onCertify: (autoResolve?: AutoResolve) => void
  ) => (
    <Row className="gap-0.5">
      <Pressable
        accessibilityLabel={label}
        onPress={() => {
          onCertify();
          onOpenChange(false);
        }}
        disabled={disabled}
        className={`bg-text h-12 items-center justify-center overflow-hidden px-3 hover:brightness-150 active:brightness-50 sm:px-6 ${disabled ? 'opacity-50' : ''}`}
        style={{ borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>
        <FontText weight="medium" color="white" className="sm:hidden">
          {shortLabel}
        </FontText>
        <FontText weight="medium" color="white" className="hidden sm:block">
          {label}
        </FontText>
      </Pressable>
      <Pressable
        accessibilityLabel={`${label}: resolve conflicts`}
        onPress={() => openResolveMenu(type)}
        disabled={disabled}
        className={`bg-text h-12 items-center justify-center overflow-hidden px-2.5 hover:brightness-150 active:brightness-50 ${disabled ? 'opacity-50' : ''}`}
        style={{ borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>
        <ChevronDown size={16} color="rgb(255, 255, 255)" />
      </Pressable>
    </Row>
  );
  return (
    <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <ConvexDialog.Trigger asChild>
        <View />
      </ConvexDialog.Trigger>
      <ConvexDialog.Portal>
        <ConvexDialog.Overlay />
        <ConvexDialog.Content className="h-[85vh] max-w-5xl p-1">
          <CloseButton onPress={() => onOpenChange(false)} />
          <DialogHeader
            text="Nightly submissions"
            subtext="Review what each player submitted before you certify it into the operator table."
          />
          <ScrollView className="pb-4 pt-2 sm:p-4">
            <Column className="gap-3">
              {users.map((user) => {
                const submission = submissionsByEmail[user.email.toLowerCase()];
                const hasVote = normalizeVoteTargets(submission?.vote).length > 0;
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
                        <FontText>
                          {hasVote ? (
                            <ResolvedVoteName vote={submission!.vote} users={users} />
                          ) : (
                            '-'
                          )}
                        </FontText>
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
                            <FontText className="opacity-50">-</FontText>
                          )}
                        </Column>
                      </Column>
                      <Column className="min-w-[240px] flex-1 gap-2">
                        <FontText weight="medium">Action</FontText>
                        {actionSummary ? (
                          <ActionPills actionText={actionSummary} />
                        ) : (
                          <FontText className="opacity-50">-</FontText>
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
                            <FontText className="opacity-50">-</FontText>
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
            {certifySplit('votes', 'Add Votes', 'Add Votes To Table', onCertifyVotes)}
            {certifySplit('actions', 'Add Actions', 'Add Actions To Table', onCertifyActions)}
          </Row>
        </ConvexDialog.Content>
      </ConvexDialog.Portal>
      {/* Arrow half: resolve every conflict one way without the per-item
          review screen. */}
      <ConvexDialog.Root
        isOpen={resolveMenu !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setResolveMenu(null);
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-sm p-4">
            <CloseButton onPress={() => setResolveMenu(null)} />
            <DialogHeader
              text={`Resolve conflicts — ${resolveMenu?.type === 'votes' ? 'votes' : 'actions'}`}
              subtext={
                resolveMenu === null || resolveMenu.count === null
                  ? 'Pick which side wins any conflicts this certification runs into.'
                  : resolveMenu.count === 0
                    ? 'No conflicts detected — this certifies the same as the main button.'
                    : `${resolveMenu.count} conflict${
                        resolveMenu.count === 1 ? ' clashes' : 's clash'
                      } with existing table content. Pick one side for all of them.`
              }
            />
            <Column className="gap-2 pt-3">
              <AppButton
                variant="outline"
                className="w-full px-3"
                disabled={disabled}
                onPress={() => confirmResolve('keep')}>
                <FontText weight="medium">Keep all current values</FontText>
              </AppButton>
              <AppButton
                variant="black"
                className="w-full px-3"
                disabled={disabled}
                onPress={() => confirmResolve('replace')}>
                <FontText weight="medium" color="white">
                  Use all new results
                </FontText>
              </AppButton>
              <AppButton
                variant="outline"
                className="w-full px-3"
                onPress={() => setResolveMenu(null)}>
                <FontText weight="medium">Cancel</FontText>
              </AppButton>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </ConvexDialog.Root>
  );
};

export default NightlyCertificationDialog;
