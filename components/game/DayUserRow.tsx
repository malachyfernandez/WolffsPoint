import React, { useRef, useState, useEffect } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Pencil } from 'lucide-react-native';
import TagCellDisplay from './TagCellDisplay';
import { useTableRowPreview } from './TableRowPreview';
import type { CellContext } from './TagCellEditor';
import type { TagRef } from 'utils/cellPieces';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import Animated, { Easing, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { UserTableItem, type CellContentType } from 'types/playerTable';
import { VoteValue } from 'types/multiplayer';
import { getPlayerActionSummary } from 'utils/multiplayer';
import ActionPills from './ActionPills';
import ActionEditorDialog from './ActionEditorDialog';
import VoteEditorDialog, { ResolvedVoteName } from './VoteEditorDialog';
import CellFilesEditorDialog from './scriptFiles/CellFilesEditorDialog';
import { FileSourcePreview } from './scriptFiles/CellPreviewChips';
import type { useScriptFiles } from '../../hooks/useScriptFiles';
import { SelectableOverlay } from './multiSelect/SelectableOverlay';
import { CellHighlight, isCellHighlightMatch, useCellHighlightRequest } from './CellHighlight';
import CellOriginIndicator from './CellOriginIndicator';
import { latestFieldSource } from '../../utils/fieldProvenance';

interface DayUserRowProps {
  columnTypes?: CellContentType[];
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
    morningMessage: number;
  };
  extraDayColumnWidths: number[];
  users: UserTableItem[];
  dayColumnTitles: string[];
  /** Per-user morning messages (email → per-day strings). */
  morningMessagesList: Record<string, string[]>;
  updateMorningMessage: (dayIndex: number, userIndex: number, value: string) => void;
  /** Shared files API: hoisted to the table so rows don't each build an index. */
  filesApi: ReturnType<typeof useScriptFiles>;
  onTagsAdded?: (tagRefs: (string | TagRef)[], context: CellContext) => void;
  onTagsRemoved?: (tagRefs: (string | TagRef)[], context: CellContext) => void;
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
  columnTypes,
  morningMessagesList,
  updateMorningMessage,
  filesApi,
  onTagsAdded,
  onTagsRemoved,
  selectionMode = false,
}: DayUserRowProps) => {
  const highlightReq = useCellHighlightRequest();
  const [editingColumns, setEditingColumns] = useState<Record<number, boolean>>({});
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isVoteDialogOpen, setIsVoteDialogOpen] = useState(false);
  // Mount-on-first-open: three dialogs per row; mounting all of them for
  // every player × day is a large chunk of the game-open mount burst.
  const [messageDialogMounted, setMessageDialogMounted] = useState(false);
  const [actionDialogMounted, setActionDialogMounted] = useState(false);
  const [voteDialogMounted, setVoteDialogMounted] = useState(false);
  const hasMounted = useRef(false);

  // Registers this row's element + preview target with the shared floating
  // preview pill (web only; it resolves hovered rows by pointer position).
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
    setVoteDialogMounted(true);
    setIsVoteDialogOpen(true);
  };

  const handleActionPress = () => {
    setActionDialogMounted(true);
    setIsActionDialogOpen(true);
  };

  const handleMessagePress = () => {
    setMessageDialogMounted(true);
    setIsMessageDialogOpen(true);
  };

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
    return message ? filesApi.previewText(message) : '';
  };

  const morningWidth = dayBaseColumnWidths.morningMessage;
  const hasVisibleExtraColumns =
    dayData.extraColumns?.some((_, idx) => userTableColumnVisibility?.extraDayColumns[idx]) ??
    false;

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
                <FontText className="opacity-50">No vote...</FontText>
              )}
            </FontText>
          </Pressable>
          {hasMultiplierBadge && (
            <View className="bg-border/30 absolute bottom-0.5 right-0.5 rounded px-1 py-0.5">
              <FontText className="text-text/60 text-[10px]">{voteMultiplier}x</FontText>
            </View>
          )}
          <SelectableOverlay cellId={`d-v-${index}`} cellType="daysVote" />
          <CellOriginIndicator
            gameId={gameId}
            source={
              dayData.fieldProvenance?.vote
                ? latestFieldSource(dayData.fieldProvenance, 'vote', dayData.vote)
                : latestFieldSource(
                    dayData.fieldProvenance,
                    'voteMultiplier',
                    dayData.voteMultiplier
                  )
            }
          />
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
          <CellOriginIndicator
            gameId={gameId}
            source={latestFieldSource(dayData.fieldProvenance, 'action', dayData.action)}
          />
        </Column>
        {morningWidth > 0 && (
          <Column
            className={`border-subtle-border h-full items-center justify-center gap-0 border ${isLast && !hasVisibleExtraColumns ? 'rounded-br-lg' : ''}`}
            style={{ width: morningWidth, position: 'relative' }}>
            <CellOriginIndicator gameId={gameId} raw={getCurrentMorningMessage()} />
            {getCurrentMorningMessage() ? (
              <Pressable
                onPress={handleMessagePress}
                style={{ width: morningWidth - 8 }}
                className="h-full items-center justify-center">
                <FileSourcePreview
                  source={getCurrentMorningMessage()}
                  index={filesApi.index}
                  centered
                  maxWidth={morningWidth - 16}
                  fallback={
                    getMorningMessagePreview() ? (
                      <FontText
                        weight="medium"
                        className="overflow-hidden text-nowrap text-center"
                        style={{
                          width: morningWidth - 8,
                          textDecorationLine: 'underline',
                          textDecorationStyle: 'dotted',
                        }}>
                        <FontText className="text-center">{getMorningMessagePreview()}</FontText>
                      </FontText>
                    ) : (
                      <FontText
                        weight="medium"
                        className="overflow-hidden text-nowrap text-center opacity-50"
                        style={{ width: morningWidth - 8 }}>
                        No message...
                      </FontText>
                    )
                  }
                />
              </Pressable>
            ) : morningMessagesList[user.email.toLowerCase()]?.[dayNumber - 1] ? (
              <View
                style={{ width: morningWidth - 8 }}
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
                    Import Yesterday&apos;s
                  </FontText>
                </Pressable>
                <Pressable
                  onPress={handleMessagePress}
                  className="bg-text aspect-square h-7 w-7 items-center justify-center rounded-full">
                  <Pencil size={12} color="white" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleMessagePress}
                style={{ width: morningWidth - 8 }}
                className="h-full items-center justify-center">
                <FontText
                  weight="medium"
                  className="overflow-hidden text-nowrap text-center opacity-50"
                  style={{ width: morningWidth - 8 }}>
                  No message...
                </FontText>
              </Pressable>
            )}
            <SelectableOverlay cellId={`d-m-${index}`} cellType="morningMessage" />
            <CellHighlight
              active={isCellHighlightMatch(highlightReq, {
                cellKind: 'morningMessage',
                targetKey: user.email.toLowerCase(),
                // Placements count days 1-based; dayNumber is the 0-based index.
                day: dayNumber + 1,
              })}
            />
          </Column>
        )}

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
                  contentType={columnTypes?.[columnIndex]}
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
                <SelectableOverlay
                  cellId={`d-e-${index}-${columnIndex}`}
                  cellType={columnTypes?.[columnIndex] === 'files' ? 'daysExtraFiles' : 'daysExtra'}
                />
              </Column>
            </Animated.View>
          );
        })}
      </Row>
      {(messageDialogMounted || isMessageDialogOpen) && (
        <CellFilesEditorDialog
          isOpen={isMessageDialogOpen}
          onOpenChange={setIsMessageDialogOpen}
          title={`${user.realName || 'User'} Morning Message (Tomorrow)`}
          dialogSubtext={`Set the message ${user.realName || 'User'} will see after this day ends.`}
          cellText={getCurrentMorningMessage()}
          onSubmitText={(text) => updateMorningMessage(dayNumber, index, text)}
          filesApi={filesApi}
          pinnedFolder="morningMessage"
          nameBase={user.realName || 'User'}
          gameId={gameId}
          hideInputs={false}
          legacyEditorProps={{
            centered: true,
            historyKey: `morningMessage:${gameId}:${dayNumber}:${index}`,
          }}
        />
      )}
      {(actionDialogMounted || isActionDialogOpen) && (
        <ActionEditorDialog
          isOpen={isActionDialogOpen}
          onOpenChange={setIsActionDialogOpen}
          title={`${user.realName || 'User'} Action`}
          initialAction={getPlayerActionSummary(dayData.action)}
          onSubmit={(action) => setActionValue?.(index, action)}
          dialogSubtext={`Set the action for ${user.realName || 'User'}.`}
          historyKey={`action:${gameId}:${dayNumber}:${index}`}
        />
      )}
      {(voteDialogMounted || isVoteDialogOpen) && (
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
      )}
    </View>
  );
};

export default DayUserRow;
