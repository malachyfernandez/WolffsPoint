import React, { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import FontText from '../ui/text/FontText';
import TagPill, { getTagColor } from './TagPill';
import TagCellEditor from './TagCellEditor';
import { useValue } from 'hooks/useData';
import { getGameScopedKey } from 'utils/multiplayer';
import { parseCell } from 'utils/tagEncoding';
import { effectiveCell, formatCellAddress, previewCellItems, type TagRef } from 'utils/cellPieces';
import CellPreviewChips from './scriptFiles/CellPreviewChips';
import { findTagFile, getTagMeta } from 'utils/scriptFiles';
import { useScriptFilesReader } from 'hooks/useScriptFiles';
import type { CellContentType } from 'types/playerTable';
import ExtraColumnFilesEditor from './scriptFiles/ExtraColumnFilesEditor';
import { CellHighlight, isCellHighlightMatch, useCellHighlightRequest } from './CellHighlight';
import type { TagDefinition, CellContext } from './TagCellEditor';
import CellOriginIndicator from './CellOriginIndicator';

interface TagCellDisplayProps {
  gameId: string;
  value: string;
  onChange: (newValue: string) => void;
  width: number;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  /** Context for tag triggers (player index, day index, column title) */
  cellContext?: CellContext;
  /** Called when new tags are added (for firing tag triggers) */
  onTagsAdded?: (tagRefs: (string | TagRef)[], context: CellContext) => void;
  /** Called when tags are removed (for firing tag-removed triggers) */
  onTagsRemoved?: (tagRefs: (string | TagRef)[], context: CellContext) => void;
  contentType?: CellContentType;
}

const TagCellDisplay = ({
  gameId,
  value,
  onChange,
  width,
  onEditStart,
  onEditEnd,
  cellContext,
  onTagsAdded,
  onTagsRemoved,
  contentType = 'tags',
}: TagCellDisplayProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  // Mount-on-first-open: TagCellDisplay renders per tag cell across the whole
  // table, so the editor tree only exists after the cell is first tapped.
  const [editorMounted, setEditorMounted] = useState(false);
  const [tagDefs] = useValue<TagDefinition[]>(getGameScopedKey('tagDefinitions', gameId), {
    defaultValue: [],
    privacy: 'PUBLIC',
  });
  // File-backed tag colors come from the tag file's meta (id-first lookup);
  // legacy definitions are the fallback.
  const { index: scriptFilesIndex } = useScriptFilesReader(gameId);
  const highlightReq = useCellHighlightRequest();

  const parsed = useMemo(() => parseCell(value), [value]);
  const filePreviewItems = useMemo(
    () =>
      contentType === 'files' && scriptFilesIndex
        ? previewCellItems(value, scriptFilesIndex)
        : [],
    [contentType, scriptFilesIndex, value]
  );
  const displayedTags = useMemo(() => {
    const effective = effectiveCell(value);
    return parsed.tags.flatMap((tag) => {
      const name = tag.name.toLowerCase();
      const copies =
        effective.baseTagNames.filter((n) => n.toLowerCase() === name).length +
        effective.pieces.filter((p) => p.kind === 'tag' && p.name.toLowerCase() === name).length;
      return Array.from({ length: Math.max(1, copies) }, () => tag);
    });
  }, [parsed, value]);
  const definitions = tagDefs.value ?? [];

  const colorForTag = (tag: { name: string; tagId?: string }) => {
    if (scriptFilesIndex) {
      const file = findTagFile(scriptFilesIndex, tag);
      const meta = file ? getTagMeta(file) : null;
      if (meta?.color) return getTagColor(meta.color);
    }
    const def = definitions.find((d) => d.name === tag.name);
    return def ? getTagColor(def.color) : getTagColor('Grey');
  };

  const handleOpen = () => {
    onEditStart?.();
    setEditorMounted(true);
    setIsEditorOpen(true);
  };

  const handleClose = () => {
    setIsEditorOpen(false);
    onEditEnd?.();
  };

  // The Pressable absolutely fills the entire parent cell so that the whole
  // cell acts as the button. Content is centered within via inline flexbox
  // styles (inline to guarantee they apply regardless of NativeWind merging).
  return (
    <>
      <CellOriginIndicator gameId={gameId} raw={value} />
      <Pressable
        onPress={handleOpen}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          alignContent: 'center',
          justifyContent: 'center',
          paddingHorizontal: 6,
          gap: 4,
          overflow: 'hidden',
        }}>
        {contentType === 'files' ? (
          filePreviewItems.length > 0 ? (
            <CellPreviewChips
              items={filePreviewItems}
              tagColor={colorForTag}
              maxWidth={width - 12}
              fadeRow
            />
          ) : (
            <FontText weight="medium" className="text-center" numberOfLines={2}>
              UNSET
            </FontText>
          )
        ) : parsed.hasTags ? (
          <>
            {displayedTags.map((tag, i) => (
              <TagPill
                key={i}
                label={tag.name}
                color={colorForTag(tag)}
                size="sm"
                maxWidth={width - 12}
              />
            ))}
          </>
        ) : parsed.text ? (
          <FontText
            weight="medium"
            className="overflow-hidden text-nowrap text-center"
            style={{
              maxWidth: width - 12,
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
            }}>
            {parsed.text}
          </FontText>
        ) : (
          <FontText
            className="opacity-50"
            style={{ textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>
            UNSET
          </FontText>
        )}
      </Pressable>

      {cellContext && (
        <CellHighlight
          active={isCellHighlightMatch(highlightReq, {
            cellKind: 'tableCell',
            targetKey: formatCellAddress(cellContext),
            day: cellContext.dayIndex === null ? undefined : cellContext.dayIndex + 1,
          })}
        />
      )}

      {(editorMounted || isEditorOpen) && contentType === 'files' && (
        <ExtraColumnFilesEditor
          isOpen={isEditorOpen}
          onOpenChange={(open) => {
            if (!open) handleClose();
          }}
          gameId={gameId}
          value={value}
          onChange={onChange}
          title={cellContext?.column ?? 'Edit files'}
          historyKey={
            cellContext ? `extraFiles:${gameId}:${formatCellAddress(cellContext)}` : undefined
          }
        />
      )}
      {(editorMounted || isEditorOpen) && contentType === 'tags' && (
        <TagCellEditor
          isOpen={isEditorOpen}
          onOpenChange={(open) => {
            if (open) handleOpen();
            else handleClose();
          }}
          gameId={gameId}
          value={value}
          onChange={onChange}
          cellContext={cellContext}
          onTagsAdded={onTagsAdded}
          onTagsRemoved={onTagsRemoved}
          historyKey={
            cellContext
              ? `tagCell:${gameId}:${cellContext.playerIndex}:${cellContext.dayIndex ?? 'player'}:${cellContext.column}`
              : `tagCell:${gameId}:${value.slice(0, 20)}`
          }
        />
      )}
    </>
  );
};

export default TagCellDisplay;
