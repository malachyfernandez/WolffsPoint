/**
 * Table-level cell operations: apply provenance-tagged TableUpdates to the
 * user table and morning messages, strip contributions by source, and
 * compute/revert tag placements.
 *
 * Replaces the string-concat semantics of `applyTableUpdates` - ops append
 * provenance markers (see cellPieces.ts) instead of producing a final string,
 * which is what makes re-certify and tag-trigger revert work.
 */

import { UserTableItem, UserTableTitle } from '../types/playerTable';
import { TableUpdate } from '../script/registry';
import {
  getFileCallParts,
  cleanupFileInputStatements,
  makeFileStatement,
  parseFileCell,
  resolveFileRef,
  type ScriptFilesIndex,
} from './scriptFiles';
import { printExpression } from '../script/lang/printer';
import { fieldValue, stripFieldSources, writeField } from './fieldProvenance';
import {
  applyCellOp,
  cellTagRefs,
  cellTagSupports,
  stripSource,
  tagPlacementSrc,
  formatCellAddress,
  type CellPiece,
  type CellAddress,
  type CellOp,
  type TagLookup,
  type TagRef,
} from './cellPieces';
import {
  VOTE_MULTIPLIER_COLUMN,
  LIVING_STATE_COLUMN,
  VOTE_COLUMN,
  ACTION_COLUMN,
  isMorningMessage,
} from './applyTableUpdates';

/** Columns whose updates apply last (vote/action are high-impact). */
const LAST_PRIORITY_COLUMNS = new Set([VOTE_COLUMN, ACTION_COLUMN]);

const isVoteMultiplier = (column: string): boolean =>
  column.toLowerCase() === VOTE_MULTIPLIER_COLUMN;
const isLivingState = (column: string): boolean => column.toLowerCase() === LIVING_STATE_COLUMN;
const isVote = (column: string): boolean => column.toLowerCase() === VOTE_COLUMN;
const isAction = (column: string): boolean => column.toLowerCase() === ACTION_COLUMN;

export interface CellOpsOptions {
  /** Resolve a tag name to a tag file (id-aware pieces). Optional - without
   *  it, tag adds write name-only pieces. */
  tagLookup?: TagLookup;
  filesIndex?: ScriptFilesIndex;
}

const cellOpFromUpdate = (update: TableUpdate, options?: CellOpsOptions): CellOp => {
  const op: CellOp = { ...update, source: update.source ?? '' };
  if (op.valueKind !== 'file' || !options?.filesIndex) return op;
  const statement = op.fileCall ? parseFileCell(`${op.fileCall};`)?.[0] : undefined;
  const ref = statement ? getFileCallParts(statement) : null;
  const index = options.filesIndex;
  const file = ref
    ? resolveFileRef(index, ref)
    : (index.byId.get(op.value) ?? resolveFileRef(index, { path: op.value }));
  if (!file) return op;
  op.value = file.id;
  const canonical = cleanupFileInputStatements(
    [makeFileStatement(file, ref ? Object.fromEntries(ref.overrides) : {})],
    index
  )[0];
  if (canonical.kind === 'ExpressionStatement') op.fileCall = printExpression(canonical.expression);
  return op;
};

/** String-cell columns get marker ops; typed fields are replace-only. */
const isMarkerCell = (column: string, dayIndex: number | null): boolean => {
  if (dayIndex === null) return !isLivingState(column);
  return !(isVoteMultiplier(column) || isVote(column) || isAction(column));
};

/**
 * Apply TableUpdates to a user table. String cells go through `applyCellOp`
 * (marker ops with provenance); vote/action/voteMultiplier/livingState are
 * direct field sets.
 */
export const applyCellOps = (
  users: UserTableItem[],
  updates: TableUpdate[],
  titles: UserTableTitle,
  options?: CellOpsOptions
): UserTableItem[] => {
  const sorted = [...updates].sort((a, b) => {
    const aLast = LAST_PRIORITY_COLUMNS.has(a.column.toLowerCase()) ? 1 : 0;
    const bLast = LAST_PRIORITY_COLUMNS.has(b.column.toLowerCase()) ? 1 : 0;
    return aLast - bLast;
  });

  let result = [...users];

  for (const update of sorted) {
    const { playerIndex, dayIndex, column, value } = update;
    const fieldSource =
      update.autoRemove === false && update.source?.startsWith('tag:')
        ? `persistent:${update.source}`
        : update.source;
    const indices = playerIndex === null ? result.map((_, i) => i) : [playerIndex];

    for (const idx of indices) {
      if (idx < 0 || idx >= result.length) continue;
      const user = result[idx];

      if (isMorningMessage(column)) continue; // handled by applyMorningMessageOps

      const marker = isMarkerCell(column, dayIndex);
      const op = cellOpFromUpdate(update, options);

      if (dayIndex === null) {
        if (isLivingState(column)) {
          const lower = value.toLowerCase();
          const livingState = lower === 'alive' || lower === 'dead' ? lower : 'dead';
          result[idx] = {
            ...user,
            playerData: {
              ...user.playerData,
              livingState: livingState as 'alive' | 'dead',
              fieldProvenance: fieldSource
                ? writeField(
                    user.playerData.fieldProvenance,
                    'livingState',
                    user.playerData.livingState,
                    livingState,
                    fieldSource
                  )
                : user.playerData.fieldProvenance,
            },
          };
          const history = result[idx].playerData.fieldProvenance?.livingState;
          if (history) result[idx].playerData.livingState = fieldValue(history) as 'alive' | 'dead';
        } else {
          const colIdx = (titles.extraUserColumns ?? []).findIndex(
            (t) => t.toLowerCase() === column.toLowerCase()
          );
          if (colIdx === -1) continue;
          const extraColumns = [...(user.playerData.extraColumns ?? [])];
          while (extraColumns.length < (titles.extraUserColumns ?? []).length) {
            extraColumns.push('');
          }
          extraColumns[colIdx] = marker
            ? applyCellOp(extraColumns[colIdx] ?? '', op, options?.tagLookup)
            : value;
          result[idx] = {
            ...user,
            playerData: { ...user.playerData, extraColumns },
          };
        }
      } else {
        const days = [...(user.days ?? [])];
        while (days.length <= dayIndex) {
          days.push({ vote: '', action: '', extraColumns: [] });
        }
        const day = { ...days[dayIndex] };

        if (isVoteMultiplier(column)) {
          const parsed = parseFloat(value);
          day.voteMultiplier = isNaN(parsed) ? 1 : parsed;
          if (fieldSource)
            day.fieldProvenance = writeField(
              day.fieldProvenance,
              'voteMultiplier',
              user.days?.[dayIndex]?.voteMultiplier,
              day.voteMultiplier,
              fieldSource
            );
        } else if (isVote(column)) {
          day.vote = value;
          if (fieldSource)
            day.fieldProvenance = writeField(
              day.fieldProvenance,
              'vote',
              user.days?.[dayIndex]?.vote,
              value,
              fieldSource
            );
        } else if (isAction(column)) {
          day.action = value;
          if (fieldSource)
            day.fieldProvenance = writeField(
              day.fieldProvenance,
              'action',
              user.days?.[dayIndex]?.action,
              value,
              fieldSource
            );
        } else {
          const colIdx = (titles.extraDayColumns ?? []).findIndex(
            (t) => t.toLowerCase() === column.toLowerCase()
          );
          if (colIdx === -1) continue;
          const extraColumns = [...(day.extraColumns ?? [])];
          while (extraColumns.length < (titles.extraDayColumns ?? []).length) {
            extraColumns.push('');
          }
          extraColumns[colIdx] = applyCellOp(extraColumns[colIdx] ?? '', op, options?.tagLookup);
          day.extraColumns = extraColumns;
        }

        days[dayIndex] = day;
        const field = isVoteMultiplier(column)
          ? 'voteMultiplier'
          : isVote(column)
            ? 'vote'
            : isAction(column)
              ? 'action'
              : null;
        if (field && day.fieldProvenance?.[field]) {
          (day as unknown as Record<string, unknown>)[field] = fieldValue(
            day.fieldProvenance[field]
          );
        }
        result[idx] = { ...user, days };
      }
    }
  }

  return result;
};

/** Morning-message half of applyCellOps. */
export const applyMorningMessageOps = (
  morningMessagesList: Record<string, string[]>,
  updates: TableUpdate[],
  users: UserTableItem[],
  options?: CellOpsOptions
): Record<string, string[]> => {
  let result = { ...morningMessagesList };
  for (const update of updates) {
    if (!isMorningMessage(update.column)) continue;
    if (update.dayIndex === null) continue;
    const indices = update.playerIndex === null ? users.map((_, i) => i) : [update.playerIndex];
    for (const idx of indices) {
      if (idx < 0 || idx >= users.length) continue;
      const email = users[idx].email.toLowerCase();
      const messages = [...(result[email] ?? [])];
      while (messages.length <= update.dayIndex) messages.push('');
      messages[update.dayIndex] = applyCellOp(
        messages[update.dayIndex] ?? '',
        cellOpFromUpdate(update, options),
        options?.tagLookup
      );
      result[email] = messages;
    }
  }
  return result;
};

// ---------------------------------------------------------------------------
// Provenance strip + tag placements
// ---------------------------------------------------------------------------

/** Strip every marker whose src starts with `srcPrefix`, from all string
 *  cells and morning messages. Returns removed pieces (with their cell
 *  addresses) for cascade detection. */
export const stripSourceFromTables = (
  users: UserTableItem[],
  morningMessages: Record<string, string[]> | undefined,
  titles: UserTableTitle,
  srcPrefix: string,
  exact = false
): {
  users: UserTableItem[];
  morningMessages?: Record<string, string[]>;
  removed: { piece: CellPiece; addr: CellAddress }[];
} => {
  const removed: { piece: CellPiece; addr: CellAddress }[] = [];
  const result = users.map((user, playerIndex) => {
    const playerFields = stripFieldSources(user.playerData.fieldProvenance, srcPrefix, exact);
    // Player-level extra columns
    const extraUser = [...(user.playerData.extraColumns ?? [])];
    let changed = Object.keys(playerFields.values).length > 0;
    for (let i = 0; i < (titles.extraUserColumns ?? []).length; i++) {
      const cur = extraUser[i] ?? '';
      if (!cur.includes('[/')) continue;
      const stripped = stripSource(cur, srcPrefix, exact);
      if (stripped.removed.length > 0) {
        extraUser[i] = stripped.raw;
        changed = true;
        for (const piece of stripped.removed) {
          removed.push({
            piece,
            addr: { playerIndex, dayIndex: null, column: titles.extraUserColumns[i] },
          });
        }
      }
    }
    // Day-level extra columns
    const days = (user.days ?? []).map((day, dayIndex) => {
      const fields = stripFieldSources(day.fieldProvenance, srcPrefix, exact);
      const extraDay = [...(day.extraColumns ?? [])];
      let dayChanged = Object.keys(fields.values).length > 0;
      for (let i = 0; i < (titles.extraDayColumns ?? []).length; i++) {
        const cur = extraDay[i] ?? '';
        if (!cur.includes('[/')) continue;
        const stripped = stripSource(cur, srcPrefix, exact);
        if (stripped.removed.length > 0) {
          extraDay[i] = stripped.raw;
          dayChanged = true;
          for (const piece of stripped.removed) {
            removed.push({
              piece,
              addr: { playerIndex, dayIndex, column: titles.extraDayColumns[i] },
            });
          }
        }
      }
      if (!dayChanged) return day;
      return {
        ...day,
        ...fields.values,
        fieldProvenance: fields.provenance,
        extraColumns: extraDay,
      } as typeof day;
    });
    if (!changed && days.every((d, i) => d === (user.days ?? [])[i])) return user;
    return {
      ...user,
      playerData: {
        ...user.playerData,
        ...playerFields.values,
        fieldProvenance: playerFields.provenance,
        extraColumns: extraUser,
      } as typeof user.playerData,
      days,
    };
  });

  let nextMorning = morningMessages;
  if (nextMorning) {
    const copy: Record<string, string[]> = {};
    let anyChanged = false;
    for (const [email, msgs] of Object.entries(nextMorning)) {
      const playerIndex = result.findIndex((u) => u.email.toLowerCase() === email);
      const next = msgs.map((raw, dayIndex) => {
        if (!raw.includes('[/')) return raw;
        const stripped = stripSource(raw, srcPrefix, exact);
        if (stripped.removed.length > 0) {
          anyChanged = true;
          for (const piece of stripped.removed) {
            removed.push({
              piece,
              addr: { playerIndex, dayIndex, column: 'morningMessage' },
            });
          }
        }
        return stripped.raw;
      });
      copy[email] = next;
    }
    if (anyChanged) nextMorning = copy;
  }

  return { users: result, morningMessages: nextMorning, removed };
};

/** All currently-visible tag placements: placementKey → {ref, addr}. */
export const stableCellAddress = (
  users: UserTableItem[],
  titles: UserTableTitle,
  playerIndex: number,
  dayIndex: number | null,
  column: string
): CellAddress => {
  const names = dayIndex === null ? titles.extraUserColumns : titles.extraDayColumns;
  const ids = dayIndex === null ? titles.extraUserColumnIds : titles.extraDayColumnIds;
  const colIndex = names.findIndex((name) => name.toLowerCase() === column.toLowerCase());
  return {
    playerIndex,
    dayIndex,
    column,
    playerId: users[playerIndex]?.id,
    dayId: dayIndex === null ? undefined : users[playerIndex]?.days[dayIndex]?.id,
    columnId:
      column.toLowerCase() === 'morningmessage' ? 'builtin:morningmessage' : ids?.[colIndex],
  };
};

export const collectTagPlacements = (
  users: UserTableItem[],
  morningMessages: Record<string, string[]> | undefined,
  titles: UserTableTitle
): Map<string, { ref: TagRef; addr: CellAddress }> => {
  const placements = new Map<string, { ref: TagRef; addr: CellAddress }>();
  const scanCell = (raw: string, addr: CellAddress) => {
    if (!raw.includes('[/')) return;
    addr = stableCellAddress(users, titles, addr.playerIndex, addr.dayIndex, addr.column);
    for (const ref of cellTagRefs(raw)) {
      const key = tagPlacementSrc(ref, addr);
      if (!placements.has(key)) placements.set(key, { ref, addr });
    }
  };

  users.forEach((user, playerIndex) => {
    (titles.extraUserColumns ?? []).forEach((col, i) => {
      scanCell(user.playerData.extraColumns?.[i] ?? '', {
        playerIndex,
        dayIndex: null,
        column: col,
      });
    });
    (user.days ?? []).forEach((day, dayIndex) => {
      (titles.extraDayColumns ?? []).forEach((col, i) => {
        scanCell(day.extraColumns?.[i] ?? '', { playerIndex, dayIndex, column: col });
      });
    });
    const email = user.email.toLowerCase();
    (morningMessages?.[email] ?? []).forEach((raw, dayIndex) => {
      scanCell(raw, { playerIndex, dayIndex, column: 'morningMessage' });
    });
  });

  return placements;
};

/**
 * Revert contributions owned by dead tag placements: strip markers whose src
 * is `tag:{ref}@{addr}` for each dead key. Stripping may kill more
 * placements (a reverted write was itself a tag piece) → iterate to a
 * fixpoint. Returns the tables and every placement that died.
 */
export const revertDeadTagPlacements = (
  users: UserTableItem[],
  morningMessages: Record<string, string[]> | undefined,
  titles: UserTableTitle,
  deadKeys: string[]
): { users: UserTableItem[]; morningMessages?: Record<string, string[]> } => {
  let result = users;
  let mornings = morningMessages;
  const queue = [...deadKeys];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const key = queue.shift()!;
    if (processed.has(key)) continue;
    processed.add(key);
    const before = collectTagPlacements(result, mornings, titles);
    const stripped = stripSourceFromTables(result, mornings, titles, key, true);
    if (stripped.users === result && stripped.morningMessages === mornings) continue;
    result = stripped.users;
    mornings = stripped.morningMessages;
    const live = collectTagPlacements(result, mornings, titles);
    for (const dead of deadPlacementsBetween(before, live)) {
      if (!processed.has(dead)) queue.push(dead);
    }
  }
  return { users: result, morningMessages: mornings };
};

/** Reachability from manual, baseline, certification, and persistent roots.
 * Reference counts alone would let A -> B -> A survive after its root is gone. */
export const pruneUnsupportedTagPlacements = (
  users: UserTableItem[],
  morningMessages: Record<string, string[]> | undefined,
  titles: UserTableTitle
) => {
  const placements = collectTagPlacements(users, morningMessages, titles);
  const roots = new Set<string>();
  const children = new Map<string, Set<string>>();
  for (const [key, { ref, addr }] of placements) {
    const user = users[addr.playerIndex];
    const names = addr.dayIndex === null ? titles.extraUserColumns : titles.extraDayColumns;
    const column = names.findIndex((name) => name.toLowerCase() === addr.column.toLowerCase());
    const raw =
      addr.column.toLowerCase() === 'morningmessage'
        ? morningMessages?.[user.email.toLowerCase()]?.[addr.dayIndex!]
        : addr.dayIndex === null
          ? user.playerData.extraColumns?.[column]
          : user.days[addr.dayIndex]?.extraColumns?.[column];
    for (const support of cellTagSupports(raw ?? '')) {
      if (
        ref.tagId && support.tagId
          ? ref.tagId !== support.tagId
          : ref.name.toLowerCase() !== support.name.toLowerCase()
      )
        continue;
      const source = support.src ?? 'baseline';
      if (!source.startsWith('tag:tracked:')) roots.add(key);
      else {
        if (!children.has(source)) children.set(source, new Set());
        children.get(source)!.add(key);
      }
    }
  }
  const reachable = new Set(roots);
  const queue = [...roots];
  for (let index = 0; index < queue.length; index++) {
    for (const child of children.get(queue[index]) ?? []) {
      if (!reachable.has(child)) {
        reachable.add(child);
        queue.push(child);
      }
    }
  }
  let result = users;
  let mornings = morningMessages;
  for (const key of placements.keys()) {
    if (reachable.has(key)) continue;
    const stripped = stripSourceFromTables(result, mornings, titles, key, true);
    result = stripped.users;
    mornings = stripped.morningMessages;
  }
  return { users: result, morningMessages: mornings };
};

/** Placement keys dead between two table states (before → after). */
export const deadPlacementsBetween = (
  before: Map<string, { ref: TagRef; addr: CellAddress }>,
  after: Map<string, { ref: TagRef; addr: CellAddress }>
): string[] => {
  const dead: string[] = [];
  for (const key of before.keys()) {
    if (!after.has(key)) dead.push(key);
  }
  return dead;
};

/** Placement keys new between two table states. */
export const newPlacementsBetween = (
  before: Map<string, { ref: TagRef; addr: CellAddress }>,
  after: Map<string, { ref: TagRef; addr: CellAddress }>
): { key: string; ref: TagRef; addr: CellAddress }[] => {
  const added: { key: string; ref: TagRef; addr: CellAddress }[] = [];
  for (const [key, value] of after.entries()) {
    if (!before.has(key)) added.push({ key, ref: value.ref, addr: value.addr });
  }
  return added;
};

export { formatCellAddress };
