import React, { useId, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FileText, Table, TriangleAlert } from 'lucide-react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import CloseButton from '../../ui/dialog/CloseButton';
import Column from '../../layout/Column';
import FontText from '../../ui/text/FontText';
import ShadowScrollView from '../../ui/ShadowScrollView';
import { useTooltip } from '../../../script/editor/useTooltip';
import { fileName, type FilePlacement, type PlacementCellKind } from '../../../utils/scriptFiles';

/** Which consumer a dead chain fails to reach: ordinary files must reach a
 *  cell; trigger scripts must reach a tag. */
export type DeadEnd = 'cell' | 'tag';

export const DEAD_CHAIN_COLOR = '#8a5f00';

/** Tiny ⚠ shown on file placements whose caller never reaches a live
 *  consumer. Opens a one-line explanation. */
export const DeadChainBadge = ({
  caller,
  end,
  size = 11,
}: {
  caller: string;
  end: DeadEnd;
  size?: number;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Why is this chain unused?"
        hitSlop={6}
        onPress={(e) => {
          e.stopPropagation?.();
          setOpen(true);
        }}>
        <TriangleAlert size={size} color={DEAD_CHAIN_COLOR} />
      </Pressable>
      <ConvexDialog.Root className="hidden" isOpen={open} onOpenChange={setOpen}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-xs" isSwipeable={false}>
            <CloseButton onPress={() => setOpen(false)} />
            <DialogHeader text="Chain goes nowhere" />
            <FontText variant="subtext" className="px-4 pb-4 text-sm">
              {`"${caller}" isn't used in any ${end === 'tag' ? 'tag' : 'cell'}, so this chain never runs.`}
            </FontText>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>
    </>
  );
};

const CELL_KIND_LABEL: Record<PlacementCellKind, string> = {
  roleMessage: 'role message',
  voteMessage: 'vote message',
  voteDefault: 'default vote',
  morningMessage: 'morning',
  tableCell: 'cell',
  aboutRole: 'about role',
};

const cellSubtitle = (p: FilePlacement): string => {
  if (p.cellKind === 'morningMessage' && p.day !== undefined) return `morning · day ${p.day}`;
  if (p.cellKind === 'tableCell') {
    return p.day !== undefined ? `${p.column} · day ${p.day}` : (p.column ?? 'cell');
  }
  return CELL_KIND_LABEL[p.cellKind ?? 'roleMessage'] ?? 'cell';
};

/** Fixed chip height so two-line cell chips, one-line file chips, and the
 *  "+N" overflow chip all align in the wrapping row. */
const CHIP_HEIGHT = 26;
const CHIP_CLASS =
  'border-subtle-border bg-text/5 hover:bg-text/10 flex-row items-center gap-1 rounded-md border px-1.5';

/** Small chip for one placement, a bordered icon+two-line cell chip (owner on
 *  top, which cell beneath) or an icon+name file chip. Border = the whole
 *  touch target (outline aligns with the touch target rule). */
export const FilePlacementChip = ({
  placement,
  onNavigate,
  deadEnd,
}: {
  placement: FilePlacement;
  onNavigate?: (placement: FilePlacement) => void;
  /** Set when this file-caller chain never reaches a live consumer. */
  deadEnd?: DeadEnd;
}) => {
  const tooltipId = useId();
  const { setHovered } = useTooltip(
    tooltipId,
    placement.kind === 'file' ? 'Open file' : 'Go to cell'
  );
  if (placement.kind === 'file') {
    const caller = fileName(placement.label);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open file ${caller}`}
        onPress={(e) => {
          e.stopPropagation?.();
          onNavigate?.(placement);
        }}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        className={CHIP_CLASS}
        style={{ height: CHIP_HEIGHT }}>
        <FileText size={11} color="#4a6a8a" />
        <FontText className="text-xs" numberOfLines={1}>
          {caller}
        </FontText>
        {deadEnd && <DeadChainBadge caller={caller} end={deadEnd} size={10} />}
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Go to ${placement.label}`}
      onPress={(e) => {
        e.stopPropagation?.();
        onNavigate?.(placement);
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={CHIP_CLASS}
      style={{ height: CHIP_HEIGHT }}>
      <Table size={11} color="#8a7355" />
      <Column className="justify-center gap-0">
        <FontText weight="medium" numberOfLines={1} style={{ fontSize: 11, lineHeight: 13 }}>
          {placement.owner ?? placement.label}
        </FontText>
        <FontText variant="subtext" numberOfLines={1} style={{ fontSize: 10, lineHeight: 11 }}>
          {cellSubtitle(placement)}
        </FontText>
      </Column>
    </Pressable>
  );
};

/** Overflow chip: "+N" opens the placements modal. */
export const MorePlacementsChip = ({ count, onPress }: { count: number; onPress: () => void }) => {
  const tooltipId = useId();
  const { setHovered } = useTooltip(tooltipId, 'See all placements');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count} more placements`}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className={CHIP_CLASS}
      style={{ height: CHIP_HEIGHT }}>
      <FontText variant="subtext" className="text-xs">
        +{count}
      </FontText>
    </Pressable>
  );
};

/** Modal listing every placement as navigable rows, the "+N" overflow and
 *  large morning-message groups resolve here. */
export const FilePlacementsModal = ({
  isOpen,
  onOpenChange,
  title,
  placements,
  onNavigate,
  deadEndFor,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placements: FilePlacement[];
  onNavigate?: (placement: FilePlacement) => void;
  /** Resolves a file-caller placement to 'cell'/'tag' when its chain never
   *  reaches a live consumer. */
  deadEndFor?: (p: FilePlacement) => DeadEnd | undefined;
}) => (
  <ConvexDialog.Root className="hidden" isOpen={isOpen} onOpenChange={onOpenChange}>
    <ConvexDialog.Portal>
      <ConvexDialog.Overlay />
      <ConvexDialog.Content className="h-[60vh] max-w-md" isSwipeable={false}>
        <CloseButton onPress={() => onOpenChange(false)} />
        <DialogHeader text={title} subtext="Everywhere this file is used" />
        <ShadowScrollView className="min-h-0 flex-1" scrollViewClassName="min-h-0 flex-1 pt-2">
          <Column className="gap-1.5 px-4 pb-2">
            {placements.map((p, i) => {
              const deadEnd = deadEndFor?.(p);
              return (
                <Pressable
                  key={`${p.kind}-${p.fileId ?? p.owner ?? p.label}-${p.day ?? i}`}
                  onPress={
                    onNavigate
                      ? () => {
                          onNavigate(p);
                          onOpenChange(false);
                        }
                      : undefined
                  }
                  className="border-subtle-border bg-inner-background hover:bg-text/5 flex-row items-center gap-2.5 rounded-xl border px-3 py-2">
                  {p.kind === 'file' ? (
                    <FileText size={16} color="#4a6a8a" />
                  ) : (
                    <Table size={16} color="#8a7355" />
                  )}
                  <Column className="min-w-0 flex-1 gap-0">
                    <FontText weight="medium" className="text-sm" numberOfLines={1}>
                      {p.kind === 'file' ? fileName(p.label) : (p.owner ?? p.label)}
                    </FontText>
                    <FontText variant="subtext" className="text-xs" numberOfLines={1}>
                      {p.kind === 'file' ? `file · ${p.label}` : cellSubtitle(p)}
                    </FontText>
                  </Column>
                  {deadEnd && <DeadChainBadge caller={fileName(p.label)} end={deadEnd} />}
                </Pressable>
              );
            })}
            {placements.length === 0 && (
              <View className="items-center py-8">
                <FontText variant="subtext" className="text-sm">
                  Not referenced anywhere
                </FontText>
              </View>
            )}
          </Column>
        </ShadowScrollView>
      </ConvexDialog.Content>
    </ConvexDialog.Portal>
  </ConvexDialog.Root>
);
