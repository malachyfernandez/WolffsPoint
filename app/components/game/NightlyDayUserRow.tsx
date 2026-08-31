import React, { useState, useMemo } from 'react';
import FontText from '../ui/text/FontText';
import InlineEditableText from '../ui/forms/InlineEditableText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import { Pressable, View } from 'react-native';
import { Pencil } from 'lucide-react-native';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import ActionEditorDialog from './ActionEditorDialog';
import VoteEditorDialog, { resolveVoteEmailToName } from './VoteEditorDialog';
import ActionPills from './ActionPills';
import TagCellDisplay from './TagCellDisplay';
import { UserTableItem } from '../../../types/playerTable';
import { getPlayerActionSummary } from '../../../utils/multiplayer';
import { useList } from 'hooks/useData';

interface NightlyDayUserRowProps {
  user: UserTableItem;
  index: number;
  isLast: boolean;
  dayNumber: number;
  setVoteValue?: (userIndex: number, newValue: string, voteMultiplier: number) => void;
  setActionValue?: (userIndex: number, newValue: string) => void;
  updateMorningMessage: (dayIndex: number, userIndex: number, value: string) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  isEditing?: boolean;
  morningMessagesList: Record<string, string[]>;
  columnWidths: {
    vote: number;
    action: number;
    morningMessage: number;
  };
  users: UserTableItem[];
  gameId?: string;
  /** Indices into day.extraColumns for columns shown in nightly. */
  extraDayColumnIndices?: number[];
  extraDayColumnWidths?: number[];
  extraDayColumnTitles?: string[];
}

const NightlyDayUserRow = ({
  user,
  index,
  isLast,
  dayNumber,
  setVoteValue,
  setActionValue,
  updateMorningMessage,
  onEditStart,
  onEditEnd,
  isEditing,
  morningMessagesList,
  columnWidths,
  users,
  gameId,
  extraDayColumnIndices = [],
  extraDayColumnWidths = [],
  extraDayColumnTitles = [],
}: NightlyDayUserRowProps) => {
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isVoteDialogOpen, setIsVoteDialogOpen] = useState(false);

  const [userTable, setUserTable] = useList<UserTableItem[]>('userTable', gameId ?? '', {
    privacy: 'PUBLIC',
  });

  const dayData = user.days[dayNumber] || { vote: '', action: '', extraColumns: [] };
  const voteMultiplier = dayData.voteMultiplier ?? 1;
  const hasMultiplierBadge = voteMultiplier !== 1;

  const handleVotePress = () => {
    setIsVoteDialogOpen(true);
  };

  const handleActionPress = () => {
    setIsActionDialogOpen(true);
  };

  // Resolve vote email to player name
  const resolvedVoteName = useMemo(() => {
    return resolveVoteEmailToName(dayData.vote || '', users);
  }, [dayData.vote, users]);

  const getCurrentMorningMessage = () => {
    if (
      morningMessagesList[user.email.toLowerCase()] &&
      morningMessagesList[user.email.toLowerCase()][dayNumber] !== undefined
    ) {
      return morningMessagesList[user.email.toLowerCase()][dayNumber];
    }
    return '';
  };

  const getMorningMessagePreview = () => {
    const message = getCurrentMorningMessage();
    return message
      ? message.slice(0, 30) + (message.length > 30 ? '...' : '')
      : 'No morning message...';
  };

  // Wait for column widths to be ready before rendering to prevent flicker
  const areColumnWidthsReady =
    columnWidths.vote > 0 && columnWidths.action > 0 && columnWidths.morningMessage > 0;

  if (!areColumnWidthsReady) {
    return <Row className="bg-text/5 h-12 w-min gap-0" />;
  }

  return (
    <>
      <Row className={`h-12 w-min gap-0 ${isEditing ? 'z-50' : ''}`}>
        <Column
          className={`border-subtle-border z-10 h-full items-center justify-center gap-4 border`}
          style={{ width: columnWidths.vote }}>
          <Pressable
            onPress={handleVotePress}
            className="h-full w-full items-center justify-center px-1">
            <FontText
              weight="medium"
              className="overflow-hidden text-nowrap text-center"
              style={{ width: columnWidths.vote - 16 }}>
              {dayData.vote ? (
                resolvedVoteName
              ) : (
                <FontText className="opacity-50">No Vote...</FontText>
              )}
            </FontText>
          </Pressable>
          {hasMultiplierBadge && (
            <View className="bg-border/30 absolute bottom-0.5 right-0.5 rounded px-1 py-0.5">
              <FontText className="text-text/60 text-[10px]">{voteMultiplier}x</FontText>
            </View>
          )}
        </Column>
        <Column
          className={`border-subtle-border z-20 h-full items-center justify-center gap-0 border`}
          style={{ width: columnWidths.action }}>
          <Pressable
            onPress={handleActionPress}
            className="h-full w-full items-center justify-center px-1">
            <View style={{ width: columnWidths.action - 8 }}>
              <ActionPills actionText={getPlayerActionSummary(dayData.action)} />
            </View>
          </Pressable>
        </Column>
        <Column
          className={`border-subtle-border h-full items-center justify-center gap-0 border ${isLast && extraDayColumnIndices.length === 0 ? 'rounded-br-lg' : ''}`}
          style={{ width: columnWidths.morningMessage }}>
          {getCurrentMorningMessage() ? (
            <Pressable
              onPress={() => setIsMessageDialogOpen(true)}
              style={{ width: columnWidths.morningMessage - 8 }}
              className="h-full items-center justify-center">
              <FontText
                weight="medium"
                className="overflow-hidden text-nowrap text-center"
                style={{
                  width: columnWidths.morningMessage - 8,
                  textDecorationLine: 'underline',
                  textDecorationStyle: 'dotted',
                }}>
                <FontText className="text-center">{getMorningMessagePreview()}</FontText>
              </FontText>
            </Pressable>
          ) : morningMessagesList[user.email.toLowerCase()]?.[dayNumber - 1] ? (
            <View
              style={{ width: columnWidths.morningMessage - 8 }}
              className="h-full flex-row items-center justify-center gap-1 px-2">
              <Pressable
                onPress={() => {
                  const yesterdayMessage =
                    morningMessagesList[user.email.toLowerCase()]?.[dayNumber - 1];
                  if (yesterdayMessage) {
                    updateMorningMessage(dayNumber, index, yesterdayMessage);
                  }
                }}
                className="min-w-0 flex-1">
                <FontText
                  weight="medium"
                  className="bg-text overflow-hidden text-ellipsis text-nowrap rounded-full px-2 py-1 text-center"
                  color="white">
                  Import Yesterday's
                </FontText>
              </Pressable>
              <Pressable
                onPress={() => setIsMessageDialogOpen(true)}
                className="bg-text aspect-square h-7 w-7 items-center justify-center rounded-full">
                <Pencil size={12} color="white" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setIsMessageDialogOpen(true)}
              style={{ width: columnWidths.morningMessage - 8 }}
              className="h-full items-center justify-center">
              <FontText
                weight="medium"
                className="overflow-hidden text-nowrap text-center opacity-50"
                style={{ width: columnWidths.morningMessage - 8 }}>
                No morning message...
              </FontText>
            </Pressable>
          )}
        </Column>
        {extraDayColumnIndices.map((colIdx, i) => {
          const width = extraDayColumnWidths[i] ?? 112;
          const value = dayData.extraColumns?.[colIdx] ?? '';
          const isLastExtra = i === extraDayColumnIndices.length - 1;
          return (
            <Column
              key={i}
              className={`border-subtle-border h-full items-center justify-center border ${isLast && isLastExtra ? 'rounded-br-lg' : ''}`}
              style={{ width, position: 'relative', overflow: 'hidden' }}>
              <TagCellDisplay
                gameId={gameId ?? ''}
                value={value}
                onChange={(newValue) => {
                  const currentUsers = userTable?.value ?? [];
                  if (index < 0 || index >= currentUsers.length) return;
                  const updatedUsers = [...currentUsers];
                  const u = updatedUsers[index];
                  const days = [...(u.days ?? [])];
                  while (days.length <= dayNumber) {
                    days.push({ vote: '', action: '', extraColumns: [] });
                  }
                  const extraColumns = [...(days[dayNumber].extraColumns ?? [])];
                  while (extraColumns.length <= colIdx) {
                    extraColumns.push('');
                  }
                  extraColumns[colIdx] = newValue;
                  days[dayNumber] = { ...days[dayNumber], extraColumns };
                  updatedUsers[index] = { ...u, days };
                  setUserTable(updatedUsers);
                }}
                width={width}
                cellContext={{
                  playerIndex: index,
                  dayIndex: dayNumber,
                  column: extraDayColumnTitles[i] ?? `Column ${colIdx + 1}`,
                }}
              />
            </Column>
          );
        })}
      </Row>
      <MarkdownEditorDialog
        isOpen={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        title={`${user.realName || 'User'} Morning Message (Tomorrow)`}
        submitLabel="Save Message"
        initialMarkdown={getCurrentMorningMessage()}
        onSubmit={({ markdown }) => updateMorningMessage(dayNumber, index, markdown)}
        dialogSubtext={`Set the message ${user.realName || 'User'} will see after this day ends.`}
        gameId={gameId}
        showScript
        showInputs
        hideInputs={false}
        centered={true}
      />
      <ActionEditorDialog
        isOpen={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        title={`${user.realName || 'User'} Action`}
        initialAction={getPlayerActionSummary(dayData.action)}
        onSubmit={(action) => setActionValue?.(index, action)}
        dialogSubtext={`Set the action for ${user.realName || 'User'}.`}
      />
      <VoteEditorDialog
        isOpen={isVoteDialogOpen}
        onOpenChange={setIsVoteDialogOpen}
        title={`${user.realName || 'User'} Vote`}
        initialVote={dayData.vote || ''}
        initialVoteMultiplier={voteMultiplier}
        onSubmit={(vote, multiplier) => setVoteValue?.(index, vote, multiplier)}
        dialogSubtext={`Set the vote target for ${user.realName || 'User'}.`}
        users={users}
      />
    </>
  );
};

export default NightlyDayUserRow;
