import React, { useId } from 'react';
import { Pressable, View } from 'react-native';
import { useTooltip } from '../../hooks/useTooltip';
import { useScriptFilesReader } from '../../hooks/useScriptFiles';
import { effectiveCell } from '../../utils/cellPieces';
import { getTagMeta, fileName } from '../../utils/scriptFiles';
import { isAutomaticSource } from '../../utils/fieldProvenance';

export const rawCellSources = (raw: string): string[] => {
  const effective = effectiveCell(raw);
  return [
    ...new Set(
      [
        ...effective.pieces.map((piece) => piece.src),
        ...(effective.baseSource && effective.baseText ? [effective.baseSource] : []),
      ].filter(isAutomaticSource)
    ),
  ];
};

function OriginMark({ sources, gameId }: { sources: string[]; gameId: string }) {
  const { index } = useScriptFilesReader(gameId);
  const labels = [
    ...new Set(
      sources.map((source) => {
        source = source.replace(/^persistent:/, '');
        if (source.startsWith('certification:')) return 'From certification';
        const ref = source.replace(/^tag:(?:tracked|removed):/, '').split('@')[0];
        const file = index.byId.get(ref);
        const name = file
          ? (getTagMeta(file)?.name ?? fileName(file.path))
          : ref.replace(/^name:/, '').replace(/^./, (letter) => letter.toUpperCase());
        return `From ${name} Tag`;
      })
    ),
  ];
  const label = labels.join(' / ');
  const { setHovered } = useTooltip(useId(), label);
  const certification = sources.some((source) => source.startsWith('certification:'));
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: certification
            ? 'rgba(174, 130, 45, 0.065)'
            : 'rgba(43, 131, 119, 0.065)',
        }}
      />
      <Pressable
        accessibilityRole="image"
        accessibilityLabel={label}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={(event) => event.stopPropagation()}
        style={{ position: 'absolute', right: 2, top: 2, padding: 3, zIndex: 25 }}>
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: certification
              ? 'rgba(156, 113, 33, 0.65)'
              : 'rgba(34, 120, 108, 0.65)',
          }}
        />
      </Pressable>
    </>
  );
}

export default function CellOriginIndicator({
  source,
  raw,
  gameId,
}: {
  source?: string;
  raw?: string;
  gameId: string;
}) {
  const sources = source ? [source] : raw ? rawCellSources(raw) : [];
  return sources.length ? <OriginMark sources={sources} gameId={gameId} /> : null;
}
