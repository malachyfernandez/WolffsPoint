import React, { useState } from 'react';
import { Pressable } from 'react-native';
import FontText from '../ui/text/FontText';
import TagPill, { getTagColor } from './TagPill';
import TagCellEditor from './TagCellEditor';
import { useValue } from 'hooks/useData';
import { getGameScopedKey } from 'utils/multiplayer';
import { parseCell } from 'utils/tagEncoding';
import type { TagDefinition, CellContext } from './TagCellEditor';

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
  onTagsAdded?: (tagNames: string[], context: CellContext) => void;
  /** Called when tags are removed (for firing tag-removed triggers) */
  onTagsRemoved?: (tagNames: string[], context: CellContext) => void;
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
}: TagCellDisplayProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [tagDefs] = useValue<TagDefinition[]>(getGameScopedKey('tagDefinitions', gameId), {
    defaultValue: [],
    privacy: 'PUBLIC',
  });

  const parsed = parseCell(value);
  const definitions = tagDefs.value ?? [];

  const handlePress = () => {
    onEditStart?.();
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
      <Pressable
        onPress={handlePress}
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
        {parsed.hasTags ? (
          <>
            {parsed.tags.map((tag, i) => {
              const def = definitions.find((d) => d.name === tag.name);
              const color = def ? getTagColor(def.color) : getTagColor('Grey');
              return (
                <TagPill key={i} label={tag.name} color={color} size="sm" maxWidth={width - 12} />
              );
            })}
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

      <TagCellEditor
        isOpen={isEditorOpen}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        gameId={gameId}
        value={value}
        onChange={onChange}
        cellContext={cellContext}
        onTagsAdded={onTagsAdded}
        onTagsRemoved={onTagsRemoved}
      />
    </>
  );
};

export default TagCellDisplay;
