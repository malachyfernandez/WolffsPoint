import React, { useRef, useState, useEffect } from 'react';
import { Platform, Pressable, View } from 'react-native';
import TagCellDisplay from './TagCellDisplay';
import { useTableRowPreview } from './TableRowPreview';
import type { CellContext } from './TagCellEditor';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import Animated, { Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { UserTableItem } from 'types/playerTable';
import { VoteValue } from 'types/multiplayer';
import { getPlayerActionSummary } from 'utils/multiplayer';
import ActionPills from './ActionPills';
import ActionEditorDialog from './ActionEditorDialog';
import VoteEditorDialog, { ResolvedVoteName } from './VoteEditorDialog';
import { SelectableOverlay } from './multiSelect/SelectableOverlay';

interface DayUserRowProps {
  user: UserTableItem;
  index: number;
  isLast: boolean;
  dayNumber: number;
  gameId: string;
  setVoteValue?: (userIndex: number, newValue: VoteValue, voteMultiplier: number) => void;
  setActionValue?: (userIndex: number, newValue: string) => void;
  setExtraColumnValue?: (userIndex: number, columnIndex: number, newValue: string) => void;
  userTableColumnVisibility?: {
    extraUserColumns: boolean[];
    extraDayColumns: boolean[];
  };
  onEditStart?: () => void;
  onEditEnd?: () => void;
  isEditing?: boolean;
  dayBaseColumnWidths: {
    vote: number;
    action: number;
  };
  extraDayColumnWidths: number[];
  users: UserTableItem[];
  dayColumnTitles: string[];
  onTagsAdded?: (tagNames: string[], context: CellContext) => void;
  onTagsRemoved?: (tagNames: string[], context: CellContext) => void;
  selectionMode?: boolean;
}

const DayUserRow = ({
  user,
  index,
  isLast,
  dayNumber,
  gameId,
  setVoteValue,
  setActionValue,
  setExtraColumnValue,
  userTableColumnVisibility,
  onEditStart,
  onEditEnd,
  isEditing,
  dayBaseColumnWidths,
  extraDayColumnWidths,
  users,
  dayColumnTitles,
  onTagsAdded,
  onTagsRemoved,
  selectionMode = false,
}: DayUserRowProps) => {
  const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
  const [isEditingVote, setIsEditingVote] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isVoteDialogOpen, setIsVoteDialogOpen] = useState(false);
  const hasMounted = useRef(false);

  // Registers this row's element + preview target with the shared floating
  // preview pill (web only — it resolves hovered rows by pointer position).
  const rowPreview = useTableRowPreview();
  const rowRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !rowPreview || selectionMode) return;
    return rowPreview.registerRow(rowRef.current as unknown as HTMLElement | null, {
      kind: 'player',
      email: user.email,
      dayIndex: dayNumber,
    });
  }, [rowPreview, selectionMode, user.email, dayNumber]);

  useEffect(() => {
    // Mark as mounted after initial render to enable animations for add/remove
    const timer = setTimeout(() => {
      hasMounted.current = true;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const dayData = user.days[dayNumber] || { vote: '', action: '', extraColumns: [] };
  const voteMultiplier = dayData.voteMultiplier ?? 1;
  const hasMultiplierBadge = voteMultiplier !== 1;

  const handleColumnEditStart = (columnIndex: number) => {
    setEditingColumns((prev) => ({ ...prev, [columnIndex]: true }));
    onEditStart?.();
  };

  const handleColumnEditEnd = (columnIndex: number) => {
    setEditingColumns((prev) => ({ ...prev, [columnIndex]: false }));
    onEditEnd?.();
  };

  const handleVotePress = () => {
    setIsVoteDialogOpen(true);
  };

  const handleActionPress = () => {
    setIsActionDialogOpen(true);
  };


  return (
    <View ref={rowRef} className="relative">
      <Row className={`h-12 w-min gap-0 ${isEditing ? 'z-50' : ''}`}>
        <Column
          className={`border-subtle-border z-10 h-full items-center justify-center gap-4 border ${isLast ? 'rounded-bl-lg' : ''}`}
          style={{ width: dayBaseColumnWidths.vote, position: 'relative' }}>
          <Pressable
            onPress={handleVotePress}
            className="h-full w-full items-center justify-center px-1">
            <FontText
              weight="medium"
              className="overflow-hidden text-nowrap text-center"
              style={{ width: dayBaseColumnWidths.vote - 16 }}>
              {dayData.vote ? (
                <ResolvedVoteName vote={dayData.vote} users={users} />
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
          <SelectableOverlay cellId={`d-v-${index}`} cellType="daysVote" />
        </Column>
        <Column
          className={`border-subtle-border z-20 h-full items-center justify-center gap-0 border`}
          style={{ width: dayBaseColumnWidths.action, position: 'relative' }}>
          <Pressable
            onPress={handleActionPress}
            className="h-full w-full items-center justify-center px-1">
            <View style={{ width: dayBaseColumnWidths.action - 8 }}>
              <ActionPills actionText={getPlayerActionSummary(dayData.action)} />
            </View>
          </Pressable>
          <SelectableOverlay cellId={`d-a-${index}`} cellType="daysAction" />
        </Column>

        {dayData.extraColumns?.map((column, columnIndex) => {
          if (!userTableColumnVisibility?.extraDayColumns[columnIndex]) return null;

          const visibleColumns =
            dayData.extraColumns?.filter(
              (_, idx) => userTableColumnVisibility?.extraDayColumns[idx]
            ) || [];
          const visibleIndex = visibleColumns.indexOf(column);
          const isLastVisibleColumn = visibleIndex === visibleColumns.length - 1;
          const columnWidth = extraDayColumnWidths[columnIndex] ?? 112;

          return (
            <Animated.View
              className={`h-full ${editingColumns[columnIndex] ? 'z-50' : ''}`}
              key={columnIndex}
              entering={
                hasMounted.current ? FadeInDown.duration(100).easing(Easing.ease) : undefined
              }
              exiting={
                hasMounted.current ? FadeOutUp.duration(100).easing(Easing.ease) : undefined
              }>
              <Column
                className={`border-subtle-border h-full items-center justify-center gap-4 border ${isLast && isLastVisibleColumn ? 'rounded-br-lg' : ''}`}
                style={{ width: columnWidth, position: 'relative', overflow: 'hidden' }}>
                <TagCellDisplay
                  gameId={gameId}
                  value={column}
                  onChange={(newValue) => setExtraColumnValue?.(index, columnIndex, newValue)}
                  width={columnWidth}
                  onEditStart={() => handleColumnEditStart(columnIndex)}
                  onEditEnd={() => handleColumnEditEnd(columnIndex)}
                  cellContext={{
                    playerIndex: index,
                    dayIndex: dayNumber,
                    column: dayColumnTitles[columnIndex] ?? `Column ${columnIndex + 1}`,
                  }}
                  onTagsAdded={onTagsAdded}
                  onTagsRemoved={onTagsRemoved}
                />
                <SelectableOverlay cellId={`d-e-${index}-${columnIndex}`} cellType="daysExtra" />
              </Column>
            </Animated.View>
          );
        })}
        <ActionEditorDialog
          isOpen={isActionDialogOpen}
          onOpenChange={setIsActionDialogOpen}
          title={`${user.realName || 'User'} Action`}
          initialAction={getPlayerActionSummary(dayData.action)}
          onSubmit={(action) => setActionValue?.(index, action)}
          dialogSubtext={`Set the action for ${user.realName || 'User'}.`}
          historyKey={`action:${gameId}:${dayNumber}:${index}`}
        />
        <VoteEditorDialog
          isOpen={isVoteDialogOpen}
          onOpenChange={setIsVoteDialogOpen}
          title={`${user.realName || 'User'} Vote`}
          initialVote={dayData.vote || ''}
          initialVoteMultiplier={dayData.voteMultiplier ?? 1}
          voteInputs={dayData.voteInputs}
          voteInputKey={dayData.voteInputKey}
          onSubmit={(vote, multiplier) => setVoteValue?.(index, vote, multiplier)}
          dialogSubtext={`Set the vote target for ${user.realName || 'User'}.`}
          users={users}
          historyKey={`vote:${gameId}:${dayNumber}:${index}`}
        />
      </Row>
    </View>
  );
};

export default DayUserRow;
