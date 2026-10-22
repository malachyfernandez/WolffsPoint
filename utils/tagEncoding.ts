/**
 * Tag encoding utilities.
 *
 * Tags are stored inline within cell text in two forms:
 *   [/TAG: "Infected"/]                        legacy inline token (base content)
 *   [/TAG id="f_x" name="Infected" src="S"/]   provenance-tracked tag piece
 *
 * A cell value can contain plain text, tags, or both (as of the pieces
 * model). `parseCell` is piece-aware: it returns the *effective* content -
 * base text plus visible piece contributions - so every consumer (pill
 * display, net-change diffing, `.contains(tag())` checks) sees what the
 * cell actually says without knowing about markers. See cellPieces.ts.
 */

import {
  applyCellOp,
  cellTagRefs,
  effectiveCell,
  effectiveCellContent,
  serializePiece,
  MANUAL_SRC,
} from './cellPieces';
import type { ScriptFilesIndex } from './scriptFiles';
import type { TagLookup, TagRef } from './cellPieces';

export interface ParsedTag {
  name: string;
  /** Stable tag file id, when the tag is file-backed. */
  tagId?: string;
  /** Provenance of this tag piece (undefined/absent for base content). */
  src?: string;
}

export interface ParsedCell {
  /** Raw cell value as stored */
  raw: string;
  /** Effective tags on the cell (inline base tags + visible tag pieces) */
  tags: ParsedTag[];
  /** Effective text portion (base + text pieces; tags excluded) */
  text: string;
  /** True if the cell contains any visible tags */
  hasTags: boolean;
}

/**
 * Parse a cell value into its effective tags and text.
 */
export const parseCell = (raw: string): ParsedCell => {
  if (!raw) return { raw: '', tags: [], text: '', hasTags: false };

  const refs = cellTagRefs(raw);
  const eff = effectiveCell(raw);
  // Effective text: base + text-piece contents (file pieces need the files
  // index; contribute their raw nothing here - effectiveCellContent does
  // the same without an index).
  let text = eff.baseText;
  for (const piece of eff.pieces) {
    if (piece.kind === 'text') text += piece.text;
  }
  // Strip legacy tag tokens from the text portion.
  text = text.replace(/\[\/TAG:\s*"[^"]*"(?:\s+[a-zA-Z]+="[^"]*")*\s*\/\]/g, '');

  return {
    raw,
    tags: refs.map((ref) => ({ name: ref.name, tagId: ref.tagId, src: ref.src })),
    text: text.trim(),
    hasTags: refs.length > 0,
  };
};

/** Piece-aware text including resolved file pieces (when index provided). */
export const parseCellContent = (raw: string, index?: ScriptFilesIndex): string =>
  effectiveCellContent(raw, index);

/**
 * Encode an array of tag refs into cell storage. File-backed tags serialize
 * as provenance pieces (`src = manual`); name-only tags as legacy tokens.
 * Accepts strings (legacy names) or TagRef objects.
 */
export const encodeTags = (tagNames: (string | TagRef)[]): string => {
  return tagNames
    .map((entry) => {
      const ref: TagRef = typeof entry === 'string' ? { name: entry } : entry;
      if (ref.tagId) {
        return serializePiece({
          kind: 'tag',
          tagId: ref.tagId,
          name: ref.name,
          src: ref.src ?? MANUAL_SRC,
        });
      }
      return `[/TAG: "${ref.name}"/]`;
    })
    .join('');
};

/** Apply a selection to this cell, not a copy of another cell's marker stream. */
export const reconcileTagSelection = (
  raw: string,
  selected: TagRef[],
  lookup?: TagLookup
): string => {
  let next = raw;
  const existing = cellTagRefs(raw);
  const key = (ref: TagRef) =>
    ref.tagId ?? lookup?.(ref.name)?.id ?? `name:${ref.name.toLowerCase()}`;
  for (const ref of existing) {
    if (!selected.some((s) => key(s) === key(ref))) {
      next = applyCellOp(
        next,
        { mode: 'remove', value: encodeTags([ref.name]), source: MANUAL_SRC },
        lookup
      );
    }
  }
  for (const ref of selected) {
    if (!existing.some((e) => key(e) === key(ref))) {
      next = applyCellOp(
        next,
        { mode: 'append', value: encodeTags([ref.name]), source: MANUAL_SRC },
        lookup
      );
    }
  }
  return next;
};

/**
 * Encode plain text into the cell storage format (just the text itself).
 */
export const encodeText = (text: string): string => {
  return text;
};

/**
 * Check if a raw cell value contains any visible tags.
 */
export const cellHasTags = (raw: string): boolean => {
  if (!raw) return false;
  return cellTagRefs(raw).length > 0;
};
