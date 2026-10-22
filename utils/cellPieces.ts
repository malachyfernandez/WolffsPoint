/**
 * Cell pieces: provenance-tracked contributions inside a cell string.
 *
 * A cell's raw string is `base text + marker stream`. The base is the
 * original/untracked content (plain text, markdown, legacy `[/TAG: "x"/]`
 * tokens, or a file-list). Appended markers record additive operations,
 * each stamped with a `src` provenance key describing who wrote it:
 *
 *   [/TAG id="f_x" name="Infected" src="S"/]        tag piece
 *   [/ADD src="S" kind="text"]content[/ADD]         text piece
 *   [/ADD src="S" kind="file" ref="f_x"/]           live-linked file piece
 *   [/REM src="S" match="tag:X"/]                   remove tombstone (masks
 *                                                    earlier matching pieces)
 *   [/SET src="S"]content[/SET]                     replace marker (last
 *                                                    visible SET wins as base)
 *
 * Effective content = fold(base, markers):
 *   base      = last unmasked SET text, else the raw base
 *   pieces    = tag/text/file pieces with no REM after them that matches
 *   base tags = `[/TAG: "x"/]` tokens in the effective base, minus ones
 *               masked by later REMs
 *
 * Because ops are append-only markers, reverting a source = deleting its
 * markers and re-folding - which is what makes re-certify and tag-trigger
 * revert possible.
 */

import type { ScriptFilesIndex } from './scriptFiles';
import type { Statement } from '../script/lang/ast';
import { printExpression, printStatement } from '../script/lang/printer';
import {
  cellPreviewText,
  fileName,
  flattenCellContent,
  getFileCallParts,
  cleanupFileInputStatements,
  cleanupFileInputText,
  collectTextFileRefs,
  makeFileStatement,
  parseDisplayComposition,
  parseFileCell,
  resolveFileRef,
} from './scriptFiles';
import { resolveDisplayComposition } from './displayComposition';
import { getFolderCallParts, resolveFolderRef } from './scriptFolders';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContributionSource = string;

export type PieceMatcher =
  | { type: 'tag'; name: string } // match a tag piece by name (case-insensitive)
  | { type: 'tagid'; tagId: string } // match a tag piece by tag file id
  | { type: 'text'; substring: string } // match text pieces containing substring
  | { type: 'file'; fileId: string }
  | { type: 'display'; pieceId: string } // match one physical display payload
  | { type: 'src'; src: string }; // match any piece from a source

export type CellPiece = { allowDuplicates?: boolean } & (
  | { kind: 'tag'; src: ContributionSource; tagId?: string; name: string; pos: number }
  | { kind: 'text'; src: ContributionSource; text: string; pos: number }
  | { kind: 'file'; src: ContributionSource; fileId: string; fileCall?: string; pos: number }
  | {
      kind: 'display';
      src: ContributionSource;
      /** Logical entry identity, retained across edits. */
      entryId: string;
      /** Physical payload identity; a REM targets this exact piece version. */
      pieceId: string;
      /** One serialized composition statement (Folder/CreateMarkdown/Nav/etc.). */
      source: string;
      pos: number;
    }
  | { kind: 'rem'; src: ContributionSource; match: PieceMatcher; pos: number }
  | { kind: 'set'; src: ContributionSource; text: string; pos: number }
  | { kind: 'order'; src: ContributionSource; refs: string[]; pos: number }
);

export interface ParsedCellPieces {
  /** Raw cell text with all piece markers removed (untracked content). */
  base: string;
  /** Marker pieces in stream order. */
  pieces: CellPiece[];
}

export interface TagRef {
  tagId?: string;
  name: string;
  src?: ContributionSource;
}

// ---------------------------------------------------------------------------
// Marker grammar
// ---------------------------------------------------------------------------

const LEGACY_TAG_RE = /\[\/TAG:\s*"([^"]*)"((?:\s+[a-zA-Z]+="[^"]*")*)\s*\/\]/g;

// One alternation over all marker forms so a single left-to-right scan works.
// Order: content-ADD must be tried before self-closing ADD so `[/ADD..]x[/ADD]`
// isn't half-consumed (self-closing needs `/>` so it can't match the open tag
// of a content marker, but list it first anyway for clarity).
const MARKER_RE =
  /\[\/ADD\s+(?![^\]]*\/\])[^\]]*?\][\s\S]*?\[\/ADD\s*\]|\[\/SET\s+[^\]]*?\][\s\S]*?\[\/SET\s*\]|\[\/TAG\s+[^\]]*?\/\]|\[\/ADD\s+[^\]]*?\/\]|\[\/REM\s+[^\]]*?\/\]|\[\/ORDER\s+[^\]]*?\/\]/g;

const ATTR_RE = /([a-zA-Z]+)="([^"]*)"/g;

const parseAttrs = (attrText: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(attrText)) !== null) {
    attrs[m[1].toLowerCase()] = m[2];
  }
  return attrs;
};

const cleanAttr = (value: string): string => value.replace(/["\]\[]/g, '');
const decodeAttr = (value: string | undefined): string | undefined => {
  try {
    return value ? decodeURIComponent(value) : undefined;
  } catch {
    return undefined;
  }
};

const serializeMatcher = (match: PieceMatcher): string => {
  switch (match.type) {
    case 'tag':
      return `tag:${match.name}`;
    case 'tagid':
      return `tagid:${match.tagId}`;
    case 'text':
      return `text:${match.substring}`;
    case 'src':
      return `src:${match.src}`;
    case 'file':
      return `file:${match.fileId}`;
    case 'display':
      return `display:${match.pieceId}`;
  }
};

const parseMatcher = (value: string): PieceMatcher | null => {
  const idx = value.indexOf(':');
  if (idx === -1) return null;
  const type = value.slice(0, idx).toLowerCase();
  const rest = value.slice(idx + 1);
  if (type === 'tag') return { type: 'tag', name: rest };
  if (type === 'tagid') return { type: 'tagid', tagId: rest };
  if (type === 'text') return { type: 'text', substring: rest };
  if (type === 'src') return { type: 'src', src: rest };
  if (type === 'file') return { type: 'file', fileId: rest };
  if (type === 'display') return { type: 'display', pieceId: rest };
  return null;
};

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/** Parse a raw cell string into base text + ordered marker pieces. */
export const parseCellPieces = (raw: string): ParsedCellPieces => {
  if (!raw) return { base: '', pieces: [] };
  MARKER_RE.lastIndex = 0;
  const pieces: CellPiece[] = [];
  let base = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MARKER_RE.exec(raw)) !== null) {
    base += raw.slice(lastIndex, match.index);
    const token = match[0];
    lastIndex = match.index + token.length;
    const pos = pieces.length;

    if (token.startsWith('[/TAG ')) {
      const inner = token.slice(6, token.length - 2); // between '[/TAG ' and '/]'
      const attrs = parseAttrs(inner);
      pieces.push({
        kind: 'tag',
        src: attrs.src ?? '',
        tagId: attrs.id || undefined,
        name: attrs.name ?? '',
        allowDuplicates: attrs.duplicates === 'true' || undefined,
        pos,
      });
    } else if (token.startsWith('[/ADD ')) {
      // Self-closing (file) or content form (text)
      if (token.endsWith('[/ADD]')) {
        const closeIdx = token.lastIndexOf('[/ADD]');
        const openEnd = token.indexOf(']');
        const attrs = parseAttrs(token.slice(6, openEnd));
        pieces.push({
          kind: 'text',
          src: attrs.src ?? '',
          text: token.slice(openEnd + 1, closeIdx),
          allowDuplicates: attrs.duplicates === 'true' || undefined,
          pos,
        });
      } else {
        const attrs = parseAttrs(token.slice(6, token.length - 2));
        if (attrs.kind === 'file' && attrs.ref) {
          pieces.push({
            kind: 'file',
            src: attrs.src ?? '',
            fileId: attrs.ref,
            pos,
            fileCall: decodeAttr(attrs.call),
            allowDuplicates: attrs.duplicates === 'true' || undefined,
          });
        } else if (attrs.kind === 'display' && attrs.ref && attrs.entry && attrs.call) {
          const source = decodeAttr(attrs.call);
          if (source !== undefined) {
            pieces.push({
              kind: 'display',
              src: attrs.src ?? '',
              entryId: attrs.entry,
              pieceId: attrs.ref,
              source,
              pos,
              allowDuplicates: attrs.duplicates === 'true' || undefined,
            });
          }
        } else {
          // Self-closing non-file add: treat as empty text piece
          pieces.push({ kind: 'text', src: attrs.src ?? '', text: '', pos });
        }
      }
    } else if (token.startsWith('[/ORDER ')) {
      const attrs = parseAttrs(token.slice(8, token.length - 2));
      try {
        const refs: unknown = JSON.parse(decodeAttr(attrs.refs) ?? 'null');
        if (Array.isArray(refs) && refs.every((ref) => typeof ref === 'string')) {
          pieces.push({ kind: 'order', src: attrs.src ?? '', refs, pos });
        }
      } catch {
        // Ignore malformed ordering metadata without changing content.
      }
    } else if (token.startsWith('[/REM ')) {
      const attrs = parseAttrs(token.slice(6, token.length - 2));
      const matcher = attrs.match ? parseMatcher(attrs.match) : null;
      if (matcher) {
        pieces.push({ kind: 'rem', src: attrs.src ?? '', match: matcher, pos });
      }
    } else if (token.startsWith('[/SET ')) {
      const closeIdx = token.lastIndexOf('[/SET]');
      const openEnd = token.indexOf(']');
      const attrs = parseAttrs(token.slice(6, openEnd));
      pieces.push({
        kind: 'set',
        src: attrs.src ?? '',
        text: token.slice(openEnd + 1, closeIdx),
        pos,
      });
    }
  }
  base += raw.slice(lastIndex);
  return { base, pieces };
};

/** True if a piece is masked by a REM that appears after it in the stream. */
const pieceMasked = (piece: CellPiece, rems: CellPiece[]): boolean => {
  for (const rem of rems) {
    if (rem.kind !== 'rem' || rem.pos <= piece.pos) continue;
    const m = rem.match;
    switch (m.type) {
      case 'tag':
        if (piece.kind === 'tag' && piece.name.toLowerCase() === m.name.toLowerCase()) return true;
        break;
      case 'tagid':
        if (piece.kind === 'tag' && piece.tagId && piece.tagId === m.tagId) return true;
        break;
      case 'text':
        if (piece.kind === 'text' && piece.text.includes(m.substring)) return true;
        break;
      case 'src':
        if (piece.src === m.src) return true;
        break;
      case 'file':
        if (piece.kind === 'file' && piece.fileId === m.fileId) return true;
        break;
      case 'display':
        if (piece.kind === 'display' && piece.pieceId === m.pieceId) return true;
        break;
    }
  }
  return false;
};

const setMasked = (set: CellPiece, rems: CellPiece[]): boolean => {
  for (const rem of rems) {
    if (rem.kind !== 'rem' || rem.pos <= set.pos) continue;
    if (rem.match.type === 'src' && rem.match.src === set.src) return true;
  }
  return false;
};

/** Extract legacy `[/TAG: "x"/]` names from a text blob. */
const legacyTagNamesIn = (text: string): { name: string; index: number }[] => {
  const out: { name: string; index: number }[] = [];
  LEGACY_TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LEGACY_TAG_RE.exec(text)) !== null) {
    out.push({ name: m[1], index: m.index });
  }
  return out;
};

export interface DisplayBaseEntry {
  /** Stable logical identity used by ordering metadata. */
  entryId: string;
  /** Synthetic physical identity targetable by a display REM. */
  pieceId: string;
  statement: Statement;
  source: string;
}

const fnv1a = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

/** Deterministic identities for non-file statements embedded in the base.
 *  First display edits can target them without replacing the entire cell. */
const displayBaseEntries = (source: string): DisplayBaseEntry[] => {
  const statements = parseDisplayComposition(source) ?? [];
  const counts = new Map<string, number>();
  const out: DisplayBaseEntry[] = [];
  for (const statement of statements) {
    if (getFileCallParts(statement)) continue;
    const printed = printStatement(statement);
    const hash = fnv1a(printed);
    const occurrence = counts.get(hash) ?? 0;
    counts.set(hash, occurrence + 1);
    const entryId = `base_${hash}_${occurrence}`;
    out.push({ entryId, pieceId: `basepiece_${entryId}`, statement, source: printed });
  }
  return out;
};

// ---------------------------------------------------------------------------
// Fold - effective content
// ---------------------------------------------------------------------------

export interface EffectiveCell {
  /** Effective base text (last SET or raw base), with masked legacy tag
   *  tokens stripped and text-REM substrings removed. */
  baseText: string;
  /** Owner of the last unmasked SET, if the base is attributed. */
  baseSource?: string;
  /** Inline `[/TAG: "x"/]` names remaining visible in the base. */
  baseTagNames: string[];
  /** Non-file display statements still owned by the effective base. */
  displayBaseEntries: DisplayBaseEntry[];
  /** Visible content pieces (tag/text/file/display), in stream order. */
  pieces: CellPiece[];
  fileOrder?: string[];
}

export const effectiveCell = (raw: string, index?: ScriptFilesIndex): EffectiveCell => {
  const { base, pieces } = parseCellPieces(raw);
  const rems = pieces.filter((p) => p.kind === 'rem');

  // Effective base: last SET not masked by a later src-REM; else raw base.
  let baseText = base;
  let basePos = -1;
  let baseSource: string | undefined;
  for (const p of pieces) {
    if (p.kind === 'set' && !setMasked(p, rems)) {
      baseText = p.text;
      basePos = p.pos;
      baseSource = p.src;
    }
  }

  // REMs after the effective base position also mask content inside the base:
  // tag matchers strip matching `[/TAG: "x"/]` tokens, text matchers remove
  // the first occurrence of the substring.
  const baseRems = rems.filter((p) => p.pos > basePos);
  const composition = parseDisplayComposition(baseText);
  if (composition) {
    const fileRems = new Set(
      baseRems.flatMap((p) => (p.kind === 'rem' && p.match.type === 'file' ? [p.match.fileId] : []))
    );
    const displayRems = new Set(
      baseRems.flatMap((p) =>
        p.kind === 'rem' && p.match.type === 'display' ? [p.match.pieceId] : []
      )
    );
    const baseDisplays = displayBaseEntries(baseText);
    let displayIndex = 0;
    baseText = composition
      .filter((statement) => {
        const ref = getFileCallParts(statement);
        if (ref) {
          const key = ref.id ?? ref.path.toLowerCase();
          return ![...fileRems].some(
            (match) =>
              match === ref.id || match.toLowerCase() === ref.path.toLowerCase() || match === key
          );
        }
        const entry = baseDisplays[displayIndex++];
        return entry ? !displayRems.has(entry.pieceId) : true;
      })
      .map((s) => printStatement(s))
      .join('\n');
  }
  for (const rem of baseRems) {
    if (rem.kind !== 'rem') continue;
    if (rem.match.type === 'tag') {
      const target = rem.match.name.toLowerCase();
      baseText = baseText.replace(
        new RegExp(`\\[\\/TAG:\\s*"${escapeRegex(target)}"\\s*\\/\\]`, 'i'),
        ''
      );
    } else if (rem.match.type === 'tagid') {
      // id matchers can't touch name-only base tokens; nothing to do
    } else if (rem.match.type === 'text') {
      baseText = baseText.replace(rem.match.substring, '');
    } else if (rem.match.type === 'file' && !composition) {
      const statements = parseFileCell(baseText);
      if (statements) {
        const match = rem.match.fileId;
        baseText = statements
          .filter((s) => {
            const ref = getFileCallParts(s);
            return ref?.id ? ref.id !== match : ref?.path.toLowerCase() !== match.toLowerCase();
          })
          .map((s) => printStatement(s))
          .join('\n');
      }
    }
  }

  // Keep every owner's contribution in storage, but show one copy by default.
  // Removing the first owner then reveals the next instead of losing the module.
  const seen = new Set(legacyTagNamesIn(baseText).map((t) => `tag:${t.name.toLowerCase()}`));
  const baseStatements = parseDisplayComposition(baseText) ?? parseFileCell(baseText) ?? [];
  for (const s of baseStatements) {
    const ref = getFileCallParts(s);
    if (ref) {
      const id = index ? (resolveFileRef(index, ref)?.id ?? ref.id) : ref.id;
      if (id) seen.add(`file:${id}`);
    }
  }
  for (const entry of displayBaseEntries(baseText)) seen.add(`display:${entry.entryId}`);
  const visible = pieces
    .filter(
      (p) => p.kind === 'tag' || p.kind === 'text' || p.kind === 'file' || p.kind === 'display'
    )
    .filter((p) => p.pos > basePos && !pieceMasked(p, rems))
    .filter((p) => {
      const key =
        p.kind === 'tag'
          ? `tag:${p.name.toLowerCase()}`
          : p.kind === 'file'
            ? `file:${p.fileId}`
            : p.kind === 'display'
              ? `display:${p.entryId}`
              : p.kind === 'text'
                ? `text:${p.text}`
                : '';
      const duplicate =
        seen.has(key) ||
        (p.kind === 'tag' && !!p.tagId && seen.has(`tagid:${p.tagId}`)) ||
        (p.kind === 'text' && baseText.includes(p.text));
      seen.add(key);
      if (p.kind === 'tag' && p.tagId) seen.add(`tagid:${p.tagId}`);
      return p.allowDuplicates || !duplicate;
    });

  return {
    baseText,
    ...(baseSource ? { baseSource } : {}),
    baseTagNames: legacyTagNamesIn(baseText).map((t) => t.name),
    displayBaseEntries: displayBaseEntries(baseText),
    pieces: visible,
    fileOrder: pieces
      .filter((p) => p.kind === 'order' && p.pos > basePos && !pieceMasked(p, rems))
      .map((p) => (p.kind === 'order' ? p.refs : []))
      .slice(-1)[0],
  };
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Visible tag identities on a cell: inline base tokens + tag pieces +
 *  `[/TAG: "x"/]` tokens embedded inside visible text pieces. Deduped. */
export const cellTagRefs = (raw: string): TagRef[] => {
  const eff = effectiveCell(raw);
  const out: TagRef[] = [];
  const seen = new Set<string>();
  const push = (ref: TagRef) => {
    const key = ref.tagId ?? `name:${ref.name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(ref);
  };
  for (const name of eff.baseTagNames) push({ name });
  for (const p of eff.pieces) {
    if (p.kind === 'tag') {
      push({ tagId: p.tagId, name: p.name, src: p.src });
    } else if (p.kind === 'text') {
      for (const t of legacyTagNamesIn(p.text)) push({ name: t.name });
    }
  }
  return out;
};

/** Visible ownership before display deduplication. A second owner must still
 * support a tag even when only the first owner's pill is rendered. */
export const cellTagSupports = (raw: string): TagRef[] => {
  const parsed = parseCellPieces(raw);
  const allOwners =
    parsed.base +
    parsed.pieces
      .map((piece) =>
        serializePiece(
          piece.kind === 'tag' || piece.kind === 'text'
            ? { ...piece, allowDuplicates: true }
            : piece
        )
      )
      .join('');
  const effective = effectiveCell(allOwners);
  const rems = parsed.pieces.filter((piece) => piece.kind === 'rem');
  const lastSet = parsed.pieces
    .filter((piece) => piece.kind === 'set' && !setMasked(piece, rems))
    .slice(-1)[0];
  const supports: TagRef[] = effective.baseTagNames.map((name) => ({
    name,
    src: lastSet?.src ?? 'baseline',
  }));
  for (const piece of effective.pieces) {
    if (piece.kind === 'tag')
      supports.push({ tagId: piece.tagId, name: piece.name, src: piece.src });
    if (piece.kind === 'text') {
      supports.push(
        ...legacyTagNamesIn(piece.text).map((tag) => ({ name: tag.name, src: piece.src }))
      );
    }
  }
  return supports;
};

/** File references a piece-bearing cell contributes beyond what raw-text
 *  scanning sees: `kind="file"`/`kind="display"` pieces, text folded through
 *  SET/REM markers, and File() calls inside visible text pieces. Tombstoned
 *  pieces are already excluded by effectiveCell. Marker-free cells → []. */
export const collectPieceFileRefs = (
  raw: string,
  index?: ScriptFilesIndex
): { id?: string; path: string }[] => {
  if (!raw.includes('[/')) return [];
  const eff = effectiveCell(raw, index);
  const refs = collectTextFileRefs(eff.baseText, index);
  for (const piece of eff.pieces) {
    if (piece.kind === 'file') {
      refs.push({ id: piece.fileId, path: index?.byId.get(piece.fileId)?.path ?? '' });
    } else if (piece.kind === 'display') {
      refs.push(...collectTextFileRefs(piece.source, index));
    } else if (piece.kind === 'text') {
      refs.push(...collectTextFileRefs(piece.text, index));
    }
  }
  return refs;
};

const resolvedPieceText = (source: string, index?: ScriptFilesIndex): string => {
  if (!index || parseDisplayComposition(source) === null) return source;
  return resolveDisplayComposition(source, index).markdown;
};

/** Effective text of a cell for scripts: base + text piece contents +
 *  resolved file/display pieces + tag pieces re-serialized as
 *  `[/TAG: "name"/]` (so `cellContents.contains(tag("X"))` works uniformly).
 *  File and display pieces need the files index; without it they contribute
 *  nothing. */
export const effectiveCellText = (raw: string, index?: ScriptFilesIndex): string => {
  const eff = effectiveCell(raw, index);
  let text = resolvedPieceText(eff.baseText, index);
  for (const p of eff.pieces) {
    if (p.kind === 'text') {
      text += p.text;
    } else if (p.kind === 'tag') {
      text += `[/TAG: "${cleanAttr(p.name)}"/]`;
    } else if (p.kind === 'file' && index) {
      const file = index.byId.get(p.fileId);
      if (file)
        text += flattenCellContent(
          p.fileCall ? `${p.fileCall};` : printStatement(makeFileStatement(file)),
          index
        ).markdown;
    } else if (p.kind === 'display' && index) {
      text += resolvedPieceText(p.source, index);
    }
  }
  return text;
};

/** Effective markdown/text content for rendering: same as effectiveCellText
 *  but tag pieces are excluded (they render as pills, not text). */
export const effectiveCellContent = (raw: string, index?: ScriptFilesIndex): string => {
  const eff = effectiveCell(raw, index);
  let text = resolvedPieceText(eff.baseText, index);
  for (const p of eff.pieces) {
    if (p.kind === 'text') {
      text += p.text;
    } else if (p.kind === 'file' && index) {
      const file = index.byId.get(p.fileId);
      if (file)
        text += flattenCellContent(
          p.fileCall ? `${p.fileCall};` : printStatement(makeFileStatement(file)),
          index
        ).markdown;
    } else if (p.kind === 'display' && index) {
      text += resolvedPieceText(p.source, index);
    }
  }
  return text;
};

/** Short friendly preview for table cells: file names when the cell carries
 *  file references (a legacy file-list base or `kind="file"` pieces), plus
 *  any folded text. Marker-free cells defer to `cellPreviewText` so plain
 *  file-list cells keep their existing look. */
export const previewCellText = (raw: string, index: ScriptFilesIndex): string => {
  if (!raw.includes('[/')) return cellPreviewText(raw, index);
  const eff = effectiveCell(raw, index);
  const composition = parseDisplayComposition(eff.baseText);
  const names: string[] = [];
  const seen = new Set<string>();
  const pushName = (n: string) => {
    if (n && !seen.has(n)) {
      seen.add(n);
      names.push(n);
    }
  };
  const statementName = (statement: Statement): string => {
    const fileRef = getFileCallParts(statement);
    if (fileRef) return fileName(resolveFileRef(index, fileRef)?.path ?? fileRef.path);
    const folderRef = getFolderCallParts(statement);
    if (folderRef)
      return fileName(resolveFolderRef(index, folderRef) ?? folderRef.path ?? 'Folder');
    if (statement.kind === 'NavButtonStatement') {
      return statement.label.kind === 'StringLiteral' ? statement.label.value : 'Navigation';
    }
    if (
      statement.kind === 'ExpressionStatement' &&
      statement.expression.kind === 'CallExpression' &&
      statement.expression.callee.kind === 'IdentifierExpression'
    ) {
      const name = statement.expression.callee.name.toLowerCase();
      if (name === 'createmarkdown') return 'Markdown';
      if (name === 'createdivider') return 'Divider';
    }
    return 'Display block';
  };
  if (composition) {
    for (const entry of displayCellEntries(raw, index)) pushName(statementName(entry.statement));
  } else {
    for (const p of eff.pieces) {
      if (p.kind === 'file') pushName(fileName(index.byId.get(p.fileId)?.path ?? ''));
    }
    const baseStatements = parseFileCell(eff.baseText);
    if (baseStatements) {
      for (const stmt of baseStatements) {
        const parts = getFileCallParts(stmt);
        if (parts) pushName(fileName(resolveFileRef(index, parts)?.path ?? parts.path));
      }
    }
  }
  const textBits = [
    ...(composition || parseFileCell(eff.baseText) ? [] : [eff.baseText.trim()]),
    ...eff.pieces.map((p) => (p.kind === 'text' ? p.text.trim() : '')),
  ].filter(Boolean);
  const parts: string[] = [];
  if (names.length) parts.push(names.join(', '));
  if (textBits.length) parts.push(textBits.join(' '));
  const joined = parts.join(' · ');
  return joined.length > 30 ? `${joined.slice(0, 30)}...` : joined;
};

/** Fold pieces into raw-equivalent text the existing flatten pipeline
 *  understands: file-list-shaped cells keep `File(...)` statements (file
 *  pieces appended as calls) so statement expansion still applies; mixed
 *  cells fall back to `effectiveCellText` (file pieces inline as resolved
 *  markdown, tags as `[/TAG: "n"/]` tokens). */
export const foldCellForResolve = (
  raw: string,
  index: ScriptFilesIndex,
  options: { displayModules?: boolean } = {}
): string => {
  if (!raw.includes('[/')) return raw;
  const eff = effectiveCell(raw, index);
  const filePieces = eff.pieces.filter((p) => p.kind === 'file');
  const displayPieces = eff.pieces.filter((p) => p.kind === 'display');
  const nonDisplayPieces = eff.pieces.filter((p) => p.kind !== 'file' && p.kind !== 'display');
  const baseIsComposition = parseDisplayComposition(eff.baseText) !== null;
  const baseIsFileList = parseFileCell(eff.baseText) !== null;
  if (
    options.displayModules &&
    (filePieces.length > 0 || displayPieces.length > 0 || baseIsComposition) &&
    nonDisplayPieces.length === 0 &&
    (baseIsComposition || eff.baseText.trim() === '')
  ) {
    return displayCellEditorText(raw, index);
  }
  if (
    (filePieces.length > 0 || baseIsFileList) &&
    nonDisplayPieces.length === 0 &&
    displayPieces.length === 0 &&
    (baseIsFileList || eff.baseText.trim() === '')
  ) {
    return fileCellEditorText(raw, index);
  }
  return effectiveCellText(raw, index);
};

/** Strip piece markers from a payload so pieces can't nest inside each other.
 *  Legacy `[/TAG: "x"/]` tokens are kept - they are base content, not pieces. */
export const sanitizePieceContent = (text: string): string => {
  MARKER_RE.lastIndex = 0;
  return text.replace(MARKER_RE, '');
};

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type CellPieceInput = DistributiveOmit<CellPiece, 'pos'>;

export const serializePiece = (piece: CellPieceInput): string => {
  const duplicates = piece.allowDuplicates ? ' duplicates="true"' : '';
  switch (piece.kind) {
    case 'tag': {
      const id = piece.tagId ? ` id="${cleanAttr(piece.tagId)}"` : '';
      const src = piece.src ? ` src="${cleanAttr(piece.src)}"` : '';
      return `[/TAG${id} name="${cleanAttr(piece.name)}"${src}${duplicates}/]`;
    }
    case 'text':
      return `[/ADD src="${cleanAttr(piece.src)}"${duplicates}]${sanitizePieceContent(piece.text)}[/ADD]`;
    case 'file':
      return `[/ADD src="${cleanAttr(piece.src)}" kind="file" ref="${cleanAttr(piece.fileId)}"${duplicates}${piece.fileCall ? ` call="${encodeURIComponent(piece.fileCall)}"` : ''}/]`;
    case 'display':
      return `[/ADD src="${cleanAttr(piece.src)}" kind="display" ref="${cleanAttr(piece.pieceId)}" entry="${cleanAttr(piece.entryId)}" call="${encodeURIComponent(piece.source)}"${duplicates}/]`;
    case 'rem':
      return `[/REM src="${cleanAttr(piece.src)}" match="${cleanAttr(serializeMatcher(piece.match))}"/]`;
    case 'set':
      return `[/SET src="${cleanAttr(piece.src)}"]${sanitizePieceContent(piece.text)}[/SET]`;
    case 'order':
      return `[/ORDER src="${cleanAttr(piece.src)}" refs="${encodeURIComponent(JSON.stringify(piece.refs))}"/]`;
  }
};

// ---------------------------------------------------------------------------
// Ops - apply / strip
// ---------------------------------------------------------------------------

export type TagLookup = (name: string) => { id: string; name: string } | undefined;

export interface CellOp {
  mode: 'append' | 'remove' | 'replace';
  /** Raw value: tag token(s), text, or a file id when valueKind==='file'. */
  value: string;
  source: ContributionSource;
  /** 'file' → append a file piece referencing `value` as the file id. */
  valueKind?: 'text' | 'file';
  allowDuplicates?: boolean;
  autoRemove?: boolean;
  fileCall?: string;
}

/** Apply one op to a raw cell string. Pure - returns the new raw string. */
export const applyCellOp = (raw: string, op: CellOp, tagLookup?: TagLookup): string => {
  const { mode, value, allowDuplicates } = op;
  const source =
    op.autoRemove === false && op.source.startsWith(TAG_SRC_PREFIX)
      ? `persistent:${op.source}`
      : op.source;

  if (mode === 'replace') {
    const text =
      op.valueKind === 'file'
        ? op.fileCall
          ? `${op.fileCall};`
          : printStatement(makeFileStatement({ id: value, path: value }))
        : value;
    return raw + serializePiece({ kind: 'set', src: source, text });
  }

  if (mode === 'append') {
    if (op.valueKind === 'file' && value) {
      return (
        raw +
        serializePiece({
          kind: 'file',
          src: source,
          fileId: value,
          allowDuplicates,
          fileCall: op.fileCall,
        })
      );
    }
    // Tag token(s)? → tag pieces, deduped against visible tags.
    const tagNames = legacyTagNamesIn(value);
    const nonTagText = value.replace(LEGACY_TAG_RE, '').trim();
    if (tagNames.length > 0 && nonTagText.length === 0) {
      let out = raw;
      for (const t of tagNames) {
        const file = tagLookup?.(t.name);
        out += serializePiece({
          kind: 'tag',
          src: source,
          tagId: file?.id,
          name: file?.name ?? t.name,
          allowDuplicates,
        });
      }
      return out;
    }
    // Anything else → text piece (may embed legacy tag tokens; they count).
    if (!value) return raw;
    return raw + serializePiece({ kind: 'text', src: source, text: value, allowDuplicates });
  }

  // mode === 'remove'
  if (op.valueKind === 'file') {
    if (!value) return raw;
    let next =
      raw + serializePiece({ kind: 'rem', src: source, match: { type: 'file', fileId: value } });
    const statement = op.fileCall ? parseFileCell(`${op.fileCall};`)?.[0] : undefined;
    const path = statement ? getFileCallParts(statement)?.path : undefined;
    if (path && path !== value) {
      next += serializePiece({ kind: 'rem', src: source, match: { type: 'file', fileId: path } });
    }
    return next;
  }
  const tagNames = legacyTagNamesIn(value);
  const nonTagText = value.replace(LEGACY_TAG_RE, '').trim();
  if (tagNames.length > 0 && nonTagText.length === 0) {
    let out = raw;
    for (const t of tagNames) {
      out += serializePiece({
        kind: 'rem',
        src: source,
        match: { type: 'tag', name: t.name },
      });
    }
    return out;
  }
  if (!value) return raw;
  return (
    raw +
    serializePiece({
      kind: 'rem',
      src: source,
      match: { type: 'text', substring: value },
    })
  );
};

/** Repair call payloads without folding away owners, tombstones, or ordering. */
export const cleanupFileInputCell = (raw: string, index: ScriptFilesIndex): string => {
  if (!/\bfile\s*\(|\/\*file:|\bcall="/i.test(raw)) return raw;
  let result = '';
  let cursor = 0;
  for (const match of raw.matchAll(new RegExp(MARKER_RE.source, 'g'))) {
    result += cleanupFileInputText(raw.slice(cursor, match.index), index);
    const token = match[0]
      .replace(/\bcall="([^"]*)"/gi, (attribute, encoded: string) => {
        const call = decodeAttr(encoded);
        if (!call) return attribute;
        const clean = cleanupFileInputText(call, index);
        if (clean === call) return attribute;
        const value = call.trimEnd().endsWith(';') ? clean : clean.replace(/;\s*$/, '');
        return `call="${encodeURIComponent(value)}"`;
      })
      .replace(
        /^(\[\/(?:ADD|SET)\s+[^\]]*\])([\s\S]*)(\[\/(?:ADD|SET)\s*\])$/,
        (_token, start: string, body: string, end: string) =>
          start + cleanupFileInputText(body, index) + end
      );
    result += token;
    cursor = match.index + match[0].length;
  }
  return result + cleanupFileInputText(raw.slice(cursor), index);
};

/** File editors edit the visible list, never the underlying provenance stream. */
export const fileCellEditorText = (raw: string, index: ScriptFilesIndex): string => {
  const eff = effectiveCell(raw, index);
  const statements = (
    parseDisplayComposition(eff.baseText) ??
    parseFileCell(eff.baseText) ??
    []
  ).filter((statement) => getFileCallParts(statement) !== null);
  for (const piece of eff.pieces) {
    if (piece.kind !== 'file') continue;
    const file = index.byId.get(piece.fileId);
    const stored = piece.fileCall ? parseFileCell(`${piece.fileCall};`) : null;
    statements.push(
      ...(stored ?? [makeFileStatement(file ?? { id: piece.fileId, path: piece.fileId })])
    );
  }
  if (eff.fileOrder) {
    const rank = new Map(eff.fileOrder.map((ref, i) => [ref, i]));
    const key = (s: Statement) => {
      const ref = getFileCallParts(s)!;
      return resolveFileRef(index, ref)?.id ?? ref.id ?? ref.path;
    };
    statements.sort((a, b) => (rank.get(key(a)) ?? rank.size) - (rank.get(key(b)) ?? rank.size));
  }
  return cleanupFileInputStatements(statements, index)
    .map((s) => printStatement(s))
    .join('\n');
};

interface DisplayCellEntry {
  orderRef: string;
  statement: Statement;
  source: string;
  fileKey?: string;
  display?: {
    entryId: string;
    pieceId: string;
    /** A marker-backed payload, or a synthetic base statement. */
    origin: 'piece' | 'base';
    piece?: Extract<CellPiece, { kind: 'display' }>;
  };
}

const fileStatementKey = (statement: Statement, index: ScriptFilesIndex): string | null => {
  const ref = getFileCallParts(statement);
  return ref ? (resolveFileRef(index, ref)?.id ?? ref.id ?? ref.path) : null;
};

const displayStatementKey = (statement: Statement): string => {
  if (statement.kind === 'NavButtonStatement') return 'nav';
  if (
    statement.kind === 'ExpressionStatement' &&
    statement.expression.kind === 'CallExpression' &&
    statement.expression.callee.kind === 'IdentifierExpression'
  ) {
    return `call:${statement.expression.callee.name.toLowerCase()}`;
  }
  return statement.kind;
};

const displayOrderRef = (entryId: string): string => `display:${entryId}`;

const displayCellEntries = (raw: string, index: ScriptFilesIndex): DisplayCellEntry[] => {
  const eff = effectiveCell(raw, index);
  const entries: DisplayCellEntry[] = [];
  const baseDisplays = eff.displayBaseEntries;
  let displayIndex = 0;
  for (const statement of parseDisplayComposition(eff.baseText) ?? []) {
    const fileKey = fileStatementKey(statement, index);
    if (fileKey) {
      entries.push({ orderRef: fileKey, statement, source: printStatement(statement), fileKey });
    } else {
      const display = baseDisplays[displayIndex++];
      if (!display) continue;
      entries.push({
        orderRef: displayOrderRef(display.entryId),
        statement,
        source: display.source,
        display: { ...display, origin: 'base' },
      });
    }
  }
  for (const piece of eff.pieces) {
    if (piece.kind === 'file') {
      const file = index.byId.get(piece.fileId);
      const stored = piece.fileCall ? parseFileCell(`${piece.fileCall};`) : null;
      const statement =
        stored?.[0] ?? makeFileStatement(file ?? { id: piece.fileId, path: piece.fileId });
      const fileKey = fileStatementKey(statement, index) ?? piece.fileId;
      entries.push({ orderRef: fileKey, statement, source: printStatement(statement), fileKey });
    } else if (piece.kind === 'display') {
      const statement = parseDisplayComposition(piece.source)?.[0];
      if (!statement) continue;
      entries.push({
        orderRef: displayOrderRef(piece.entryId),
        statement,
        source: printStatement(statement),
        display: {
          entryId: piece.entryId,
          pieceId: piece.pieceId,
          origin: 'piece',
          piece,
        },
      });
    }
  }
  if (eff.fileOrder) {
    const rank = new Map(eff.fileOrder.map((ref, i) => [ref, i]));
    entries.sort(
      (a, b) => (rank.get(a.orderRef) ?? rank.size) - (rank.get(b.orderRef) ?? rank.size)
    );
  }
  return entries;
};

/** Composition text edited by the Files/Blocks mode. Marker-only display
 *  payloads are materialized as statements while unrelated owners remain in
 *  the raw provenance stream. */
export const displayCellEditorText = (raw: string, index: ScriptFilesIndex): string =>
  cleanupFileInputStatements(
    displayCellEntries(raw, index).map((entry) => entry.statement),
    index
  )
    .map((statement) => printStatement(statement))
    .join('\n');

const newDisplayId = (prefix: 'entry' | 'piece'): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

interface AfterDisplayEntry extends DisplayCellEntry {
  previous?: DisplayCellEntry;
}

/** Reconcile a mixed file/display composition using append-only provenance
 *  ops. Files keep their file-ID identity; every other top-level statement
 *  gets a logical entry ID and a physical payload ID for precise updates. */
export const reconcileDisplayCell = (
  raw: string,
  edited: string,
  index: ScriptFilesIndex
): string => {
  edited = cleanupFileInputText(edited, index);
  const afterStatements = parseDisplayComposition(edited);
  if (!afterStatements) return raw;

  const before = displayCellEntries(raw, index);
  const unmatched = new Set(before.filter((entry) => entry.display));
  const after: AfterDisplayEntry[] = [];

  for (const statement of afterStatements) {
    const fileKey = fileStatementKey(statement, index);
    if (fileKey) {
      after.push({
        orderRef: fileKey,
        statement,
        source: printStatement(statement),
        fileKey,
      });
      continue;
    }
    const source = printStatement(statement);
    const signature = displayStatementKey(statement);
    const exact = [...unmatched].find((entry) => entry.source === source);
    const sameKind = [...unmatched].find(
      (entry) => displayStatementKey(entry.statement) === signature
    );
    const previous = exact ?? sameKind ?? [...unmatched][0];
    if (previous) unmatched.delete(previous);
    const entryId = previous?.display?.entryId ?? newDisplayId('entry');
    after.push({
      orderRef: displayOrderRef(entryId),
      statement,
      source,
      previous,
      display: {
        entryId,
        pieceId:
          previous?.display?.origin === 'piece' && previous.source === source
            ? previous.display.pieceId
            : newDisplayId('piece'),
        origin: 'piece',
      },
    });
  }

  // File additions/removals/retargets still use the established file-piece
  // reconciliation. Its order marker (if any) is superseded by the mixed one
  // appended below.
  const afterFileText = after
    .filter((entry) => entry.fileKey)
    .map((entry) => printStatement(entry.statement))
    .join('\n');
  let next = reconcileFileCell(raw, afterFileText, index);

  for (const entry of unmatched) {
    if (!entry.display) continue;
    next += serializePiece({
      kind: 'rem',
      src: MANUAL_SRC,
      match: { type: 'display', pieceId: entry.display.pieceId },
    });
  }
  for (const entry of after) {
    if (!entry.display || !entry.previous) continue;
    const previous = entry.previous.display;
    if (!previous || entry.previous.source === entry.source) continue;
    next += serializePiece({
      kind: 'rem',
      src: MANUAL_SRC,
      match: { type: 'display', pieceId: previous.pieceId },
    });
  }
  for (const entry of after) {
    if (!entry.display) continue;
    const previous = entry.previous;
    if (previous?.display?.origin === 'base' && previous.source === entry.source) continue;
    if (previous?.display?.origin === 'piece' && previous.source === entry.source) continue;
    next += serializePiece({
      kind: 'display',
      src: MANUAL_SRC,
      entryId: entry.display.entryId,
      pieceId: entry.display.pieceId,
      source: entry.source,
    });
  }

  const beforeOrder = before.map((entry) => entry.orderRef);
  const afterOrder = after.map((entry) => entry.orderRef);
  if (afterOrder.length && JSON.stringify(afterOrder) !== JSON.stringify(beforeOrder)) {
    next += serializePiece({ kind: 'order', src: MANUAL_SRC, refs: afterOrder });
  }
  return next;
};

/** Reconcile a file-list edit using ops so unrelated owners and legacy text survive. */
export const reconcileFileCell = (raw: string, edited: string, index: ScriptFilesIndex): string => {
  edited = cleanupFileInputText(edited, index);
  const refs = (text: string) =>
    (parseFileCell(text) ?? []).map((statement) => {
      const ref = getFileCallParts(statement)!;
      return { statement, key: resolveFileRef(index, ref)?.id ?? ref.id ?? ref.path };
    });
  const before = refs(fileCellEditorText(raw, index));
  const after = refs(edited);
  let next = raw;
  const changed = (key: string) =>
    JSON.stringify(before.filter((r) => r.key === key).map((r) => printStatement(r.statement))) !==
    JSON.stringify(after.filter((r) => r.key === key).map((r) => printStatement(r.statement)));
  for (const ref of before) {
    if (changed(ref.key)) {
      next = applyCellOp(next, {
        mode: 'remove',
        value: ref.key,
        valueKind: 'file',
        source: MANUAL_SRC,
        fileCall:
          ref.statement.kind === 'ExpressionStatement'
            ? printExpression(ref.statement.expression)
            : undefined,
      });
    }
  }
  for (const ref of after) {
    if (changed(ref.key) && ref.statement.kind === 'ExpressionStatement') {
      next = applyCellOp(next, {
        mode: 'append',
        value: ref.key,
        valueKind: 'file',
        source: MANUAL_SRC,
        fileCall: printExpression(ref.statement.expression),
      });
    }
  }
  const order = after.map((ref) => ref.key);
  if (order.length && JSON.stringify(order) !== JSON.stringify(before.map((ref) => ref.key))) {
    next += serializePiece({ kind: 'order', src: MANUAL_SRC, refs: order });
  }
  return next;
};

/** Remove all markers whose `src` starts with `srcPrefix`. Returns the new
 *  raw string and the pieces that were removed (for cascade detection). */
export const stripSource = (
  raw: string,
  srcPrefix: string,
  exact = false
): { raw: string; removed: CellPiece[] } => {
  const { base, pieces } = parseCellPieces(raw);
  const matches = (p: CellPiece) => (exact ? p.src === srcPrefix : p.src.startsWith(srcPrefix));
  const removed = pieces.filter(matches);
  if (removed.length === 0) return { raw, removed: [] };
  const kept = pieces.filter((p) => !matches(p));
  let out = base;
  for (const p of kept) out += serializePiece(p);
  return { raw: out, removed };
};

// ---------------------------------------------------------------------------
// Provenance keys
// ---------------------------------------------------------------------------

export const CERTIFY_SRC_PREFIX = 'certify:';
export const TAG_SRC_PREFIX = 'tag:';
export const MANUAL_SRC = 'manual';

/** `certify:d{day}:{a|v}:{submitterEmail}` */
export const certifySrc = (dayIndex: number, type: 'a' | 'v', email: string): string =>
  `${CERTIFY_SRC_PREFIX}d${dayIndex}:${type}:${email.toLowerCase()}`;

/** Prefix matching all submissions' certify sources for a day+type. */
export const certifySrcPrefix = (dayIndex: number, type: 'a' | 'v'): string =>
  `${CERTIFY_SRC_PREFIX}d${dayIndex}:${type}:`;

export interface CellAddress {
  playerId?: string;
  dayId?: string;
  columnId?: string;
  playerIndex: number;
  dayIndex: number | null;
  column: string;
}

export const formatCellAddress = (addr: CellAddress): string =>
  addr.playerId && addr.columnId && (addr.dayIndex === null || addr.dayId)
    ? `id:${encodeURIComponent(addr.playerId)}|${addr.dayIndex === null ? 'p' : encodeURIComponent(addr.dayId!)}|${encodeURIComponent(addr.columnId)}`
    : `u${addr.playerIndex}|${addr.dayIndex === null ? 'p' : `d${addr.dayIndex}`}|${addr.column.toLowerCase()}`;

/** `tag:{tagId|name:x}@u{p}|d{d}|{col}` - src of a tag placement's writes.
 *  The placement identity is (tagRef, cell address); derivable from where a
 *  tag piece lives, so no extra bookkeeping is needed. */
export const tagPlacementSrc = (ref: { tagId?: string; name: string }, addr: CellAddress): string =>
  `${TAG_SRC_PREFIX}tracked:${ref.tagId ?? `name:${ref.name.toLowerCase()}`}@${formatCellAddress(addr)}`;
