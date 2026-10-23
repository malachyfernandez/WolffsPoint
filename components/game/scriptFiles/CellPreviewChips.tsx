import React from 'react';
import { Platform, View } from 'react-native';
import { ChevronRight, Code2, FileText, Folder, Tag as TagIcon, Zap } from 'lucide-react-native';
import FontText from '../../ui/text/FontText';
import TagPill, { getTagColor, type TagColor } from '../TagPill';
import { fileName, isTagFile, tagFileName } from 'utils/scriptFiles';
import type { ScriptFile } from 'utils/scriptFiles';
import type { CellPreviewItem } from 'utils/cellPieces';

/** Right-edge fade used when a chip row overflows a card preview (web mask;
 *  native simply clips at the container bounds). */
const CHIP_ROW_FADE = 'linear-gradient(to right, #000 65%, transparent 100%)';

/** Same per-role/kind icon language as the file browser: tag files get the tag
 *  glyph, trigger scripts a bolt, markdown a file icon, display scripts code. */
const fileChipIcon = (file: ScriptFile) =>
  isTagFile(file) ? (
    <TagIcon size={11} color="#7E22CE" />
  ) : file.role === 'trigger' ? (
    <Zap size={11} color="#B45309" />
  ) : file.kind === 'markdown' ? (
    <FileText size={11} color="#4a6a8a" />
  ) : (
    <Code2 size={11} color="#6a4a8a" />
  );

const Chip = ({
  icon,
  trailingIcon,
  label,
  maxWidth,
  faded = false,
}: {
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  label: string;
  maxWidth?: number;
  faded?: boolean;
}) => (
  <View
    className={`bg-text/10 flex-row items-center gap-1 rounded-full px-2 py-0.5 ${faded ? 'opacity-50' : ''}`}
    style={{ maxWidth }}>
    {icon}
    <FontText
      weight="medium"
      className="shrink text-xs"
      numberOfLines={1}
      ellipsizeMode="tail">
      {label}
    </FontText>
    {trailingIcon}
  </View>
);

/** A CreateDivider rendered literally - a thin vertical line between chips. */
const DividerChip = () => (
  <View className="bg-text/30" style={{ width: 1, height: 14, alignSelf: 'center' }} />
);

interface CellPreviewChipsProps {
  items: CellPreviewItem[];
  /** Resolves tag colors (file-backed tag meta, then legacy definitions);
   *  defaults to grey when absent. */
  tagColor?: (tag: { name: string; tagId?: string }) => TagColor;
  /** Max width for a single chip label - long names truncate. */
  maxWidth?: number;
  /** Show items on one non-wrapping row whose right edge fades out instead
   *  of wrapping/clipping - for card previews like the rule book card. */
  fadeRow?: boolean;
}

/** Renders previewCellItems as small chips: file name + kind icon, folder,
 *  nav button, literal divider, inline markdown, and TagPill for tags. */
const CellPreviewChips = ({ items, tagColor, maxWidth, fadeRow = false }: CellPreviewChipsProps) => {
  const renderItem = (item: CellPreviewItem, i: number): React.ReactNode => {
    switch (item.kind) {
      case 'file':
        return (
          <Chip
            key={`f${i}`}
            icon={fileChipIcon(item.file)}
            label={isTagFile(item.file) ? tagFileName(item.file) : fileName(item.file.path)}
            maxWidth={maxWidth}
          />
        );
      case 'missing':
        return (
          <Chip
            key={`m${i}`}
            icon={<FileText size={11} color="#4a6a8a" />}
            label={item.label}
            maxWidth={maxWidth}
            faded
          />
        );
      case 'folder':
        return (
          <Chip
            key={`d${i}`}
            icon={<Folder size={11} color="#8a7355" />}
            label={item.label}
            maxWidth={maxWidth}
          />
        );
      case 'nav':
        return (
          <Chip
            key={`n${i}`}
            label={item.label}
            trailingIcon={<ChevronRight size={11} color="#1a1a1a" />}
            maxWidth={maxWidth}
          />
        );
      case 'divider':
        return <DividerChip key={`v${i}`} />;
      case 'markdown':
        return (
          <Chip
            key={`k${i}`}
            icon={<FileText size={11} color="#4a6a8a" />}
            label="Markdown"
            maxWidth={maxWidth}
          />
        );
      case 'tag':
        return (
          <TagPill
            key={`t${i}`}
            label={item.name}
            color={tagColor?.(item) ?? getTagColor('Grey')}
            size="sm"
            maxWidth={maxWidth}
          />
        );
      case 'text':
        return (
          <FontText
            key={`x${i}`}
            variant="subtext"
            className="text-xs"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ maxWidth }}>
            {item.text}
          </FontText>
        );
      default:
        return null;
    }
  };

  if (fadeRow) {
    return (
      <View
        className="w-full flex-row items-center justify-start gap-1 overflow-hidden"
        style={[
          { flexWrap: 'nowrap' },
          Platform.OS === 'web'
            ? ({ maskImage: CHIP_ROW_FADE, WebkitMaskImage: CHIP_ROW_FADE } as never)
            : null,
        ]}>
        {items.map(renderItem)}
      </View>
    );
  }
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-1">
      {items.map(renderItem)}
    </View>
  );
};

export default CellPreviewChips;
