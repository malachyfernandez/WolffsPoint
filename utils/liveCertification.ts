import type { UserTableItem, UserTableTitle } from '../types/playerTable';
import type { PlayerNightSubmission } from '../types/multiplayer';
import { collectTagPlacements, stripSourceFromTables } from './cellOps';
import {
  effectiveCell,
  parseCellPieces,
  serializePiece,
  stripSource,
  type CellPiece,
} from './cellPieces';
import {
  certificationScope,
  fieldValue,
  isAutomaticSource,
  isManualSource,
  manualSources,
  writeField,
  type FieldProvenance,
  type TrackedValue,
} from './fieldProvenance';
import {
  executeMorningMessagePlannedUpdates,
  executePlannedUpdates,
} from './executePlannedUpdates';
import { tagLookupFromIndex } from './scriptFiles';
import { runTagTriggerFixpoint, type TagTriggerEnv } from '../hooks/useTagTriggers';
import { bindPlannedUpdateTargets } from './certificationIdentity';

export type LiveCertificationInput = {
  namespace?: string;
  users: UserTableItem[];
  titles: UserTableTitle;
  mornings: Record<string, string[]>;
  submissions: Record<string, PlayerNightSubmission>;
  day: number;
  type: 'votes' | 'actions';
  runId: string;
  env: TagTriggerEnv;
};
export type LiveConflict = {
  id: string;
  player: string;
  playerIndex: number;
  day: number | null;
  column: string;
  current: string;
  proposed: string;
  primary: boolean;
  field?: string;
  manualSources?: string[];
};
export type LiveChoices = Record<string, 'keep' | 'replace'>;

const describe = (value: unknown) =>
  typeof value === 'string' ? value : (JSON.stringify(value) ?? 'Empty');
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const canonicalValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonicalValue(item)])
    );
  }
  return value;
};
const scopeFor = (input: LiveCertificationInput) =>
  `certification:${encodeURIComponent(input.namespace ?? 'game')}:${encodeURIComponent(input.titles.dayIds?.[input.day] ?? String(input.day))}:${input.type}`;
const isRelevant = (source: string, scope: string, removedTags: Set<string>) =>
  certificationScope(source) === scope || removedTags.has(source);

const rawCells = (
  users: UserTableItem[],
  titles: UserTableTitle,
  mornings: Record<string, string[]>
) => {
  const cells: {
    key: string;
    playerIndex: number;
    day: number | null;
    column: string;
    get: () => string;
    set: (value: string) => void;
  }[] = [];
  users.forEach((user, playerIndex) => {
    const add = (
      day: number | null,
      column: string,
      columnId: string,
      get: () => string,
      set: (value: string) => void
    ) =>
      cells.push({
        key: JSON.stringify([
          user.id ?? user.email,
          day === null ? null : (user.days[day]?.id ?? day),
          columnId,
        ]),
        playerIndex,
        day,
        column,
        get,
        set,
      });
    titles.extraUserColumns.forEach((column, index) =>
      add(
        null,
        column,
        titles.extraUserColumnIds?.[index] ?? column,
        () => user.playerData.extraColumns?.[index] ?? '',
        (value) => {
          user.playerData.extraColumns ??= [];
          user.playerData.extraColumns[index] = value;
        }
      )
    );
    user.days.forEach((day, dayIndex) => {
      titles.extraDayColumns.forEach((column, index) =>
        add(
          dayIndex,
          column,
          titles.extraDayColumnIds?.[index] ?? column,
          () => day.extraColumns?.[index] ?? '',
          (value) => {
            day.extraColumns ??= [];
            day.extraColumns[index] = value;
          }
        )
      );
      const email = user.email.toLowerCase();
      add(
        dayIndex,
        'Morning message',
        'builtin:morningmessage',
        () => mornings[email]?.[dayIndex] ?? '',
        (value) => {
          mornings[email] ??= [];
          mornings[email][dayIndex] = value;
        }
      );
    });
  });
  return cells;
};

/** Everything happens on copies. The caller commits only after review and a
 * backend comparison of the exact table, submission, and script inputs. */
const buildLiveCertification = (
  input: LiveCertificationInput,
  choices: LiveChoices,
  additionalReviewTargets: ReadonlySet<string>,
  pass: number
): {
  users: UserTableItem[];
  mornings: Record<string, string[]>;
  conflicts: LiveConflict[];
  scope: string;
} => {
  if (pass > 32) throw new Error('Certification review did not settle. Nothing was saved.');
  const scope = scopeFor(input);
  const prefix = `${scope}|`;
  const originalUsers = copy(input.users);
  const originalMornings = copy(input.mornings);
  const beforePlacements = collectTagPlacements(originalUsers, originalMornings, input.titles);
  const stripped = stripSourceFromTables(originalUsers, originalMornings, input.titles, prefix);
  // Certification retires only its writes. Tags handle their own removal,
  // including cascading effects and typed-field restoration.
  const baseline = runTagTriggerFixpoint(
    originalUsers,
    stripped.users,
    input.titles,
    input.env,
    stripped.morningMessages ?? originalMornings,
    beforePlacements
  );
  const baselinePlacements = collectTagPlacements(
    baseline.users,
    baseline.morningMessages,
    input.titles
  );
  const removedTags = new Set(
    [...beforePlacements.keys()].filter((key) => !baselinePlacements.has(key))
  );
  const conflicts: LiveConflict[] = [];
  const protections: { key: string; pieces: CellPiece[] }[] = [];
  let users = copy(baseline.users);
  let mornings = copy(baseline.morningMessages ?? originalMornings);
  const skippedPlayers = new Set<number>();
  const fieldKey = (playerIndex: number, day: number | null, field: string) =>
    JSON.stringify([
      users[playerIndex].id ?? users[playerIndex].email,
      day === null ? null : (users[playerIndex].days[day]?.id ?? day),
      field,
    ]);
  const rawReviewKey = (key: string, source: string) => JSON.stringify(['raw', key, source]);
  const displayField = (field: string, value: unknown) => {
    if (field !== 'vote') return describe(value);
    const nameFor = (target: unknown) =>
      input.users.find(
        (user) => user.email.toLowerCase() === String(target).toLowerCase() || user.id === target
      )?.realName ?? String(target ?? 'Empty');
    return Array.isArray(value) ? value.map(nameFor).join(', ') : nameFor(value);
  };

  const inspectFields = (
    provenance: FieldProvenance | undefined,
    playerIndex: number,
    day: number | null
  ) => {
    for (const [field, history] of Object.entries(provenance ?? {})) {
      const id = fieldKey(playerIndex, day, field);
      const manual = history.writes.filter(
        (write) =>
          isManualSource(write.source) &&
          (additionalReviewTargets.has(id) ||
            write.overrides?.some((source) => isRelevant(source, scope, removedTags)))
      );
      if (!manual.length) continue;
      const primary =
        day === input.day &&
        (input.type === 'votes'
          ? ['vote', 'voteInputs', 'voteInputKey', 'voteMultiplier'].includes(field)
          : field === 'action');
      const user = users[playerIndex];
      const conflict: LiveConflict = {
        id,
        playerIndex,
        day,
        field,
        primary,
        player: user.realName || user.email,
        column:
          (
            {
              vote: 'Vote',
              voteInputs: 'Vote inputs',
              voteInputKey: 'Vote input',
              voteMultiplier: 'Vote multiplier',
              action: 'Action',
              livingState: 'Living state',
            } as Record<string, string>
          )[field] ?? field,
        current: displayField(field, fieldValue(history)),
        proposed: '',
      };
      conflicts.push(conflict);
      if (choices[id] === 'keep') {
        if (primary) skippedPlayers.add(playerIndex);
      } else {
        const container = day === null ? user.playerData : user.days[day];
        const ownHistory = container.fieldProvenance?.[field];
        if (!ownHistory) continue;
        const manualIds = new Set(manual.map((write) => write.id));
        const next = {
          ...ownHistory,
          writes: ownHistory.writes.filter((write) => !manualIds.has(write.id)),
        };
        container.fieldProvenance = { ...container.fieldProvenance, [field]: next };
        (container as unknown as Record<string, unknown>)[field] = fieldValue(next);
      }
    }
  };
  input.users.forEach((user, index) => {
    inspectFields(user.playerData.fieldProvenance, index, null);
    user.days.forEach((day, dayIndex) => inspectFields(day.fieldProvenance, index, dayIndex));
  });
  const originalCells = rawCells(originalUsers, input.titles, originalMornings);
  const cells = rawCells(users, input.titles, mornings);
  for (const original of originalCells) {
    const pieces = parseCellPieces(original.get()).pieces.filter(
      (piece) =>
        additionalReviewTargets.has(rawReviewKey(original.key, piece.src)) ||
        manualSources(piece.src).some((source) => isRelevant(source, scope, removedTags))
    );
    if (!pieces.length) continue;
    const id = original.key;
    const own = cells.find((cell) => cell.key === id)!;
    const sources = [...new Set(pieces.map((piece) => piece.src))];
    conflicts.push({
      id,
      playerIndex: original.playerIndex,
      day: original.day,
      column: original.column,
      player: input.users[original.playerIndex].realName || input.users[original.playerIndex].email,
      current: describe(original.get()),
      proposed: '',
      primary: false,
      manualSources: sources,
    });
    for (const source of sources) own.set(stripSource(own.get(), source, true).raw);
    if (choices[id] === 'keep') protections.push({ key: id, pieces });
  }

  const ops = {
    filesIndex: input.env.index,
    tagLookup: input.env.index ? tagLookupFromIndex(input.env.index) : undefined,
    titles: input.titles,
  };
  for (let index = 0; index < users.length; index++) {
    const user = users[index];
    const submission = input.submissions[user.email.toLowerCase()];
    if (!submission) continue; // Previous tracked results have already been retired.
    const source = `${prefix}${input.runId}|${encodeURIComponent(user.id ?? user.email)}`;
    const day = { ...user.days[input.day] };
    const values =
      input.type === 'votes'
        ? {
            vote: submission.vote,
            voteInputs: submission.voteInputs,
            voteInputKey: submission.voteInputKey,
            voteMultiplier: submission.voteMultiplier ?? 1,
          }
        : { action: submission.action };
    const primaryField = input.type === 'votes' ? 'vote' : 'action';
    const history = day.fieldProvenance?.[primaryField] ?? { base: day[primaryField], writes: [] };
    const plans =
      (input.type === 'votes' ? submission.votePlannedUpdates : submission.plannedUpdates) ?? [];
    const fingerprint = JSON.stringify(
      canonicalValue({
        values,
        plans,
        submittedAt:
          input.type === 'votes' ? submission.submittedVoteAt : submission.submittedActionAt,
      })
    );
    const binding =
      history.submissionBinding?.fingerprint === fingerprint
        ? history.submissionBinding
        : {
            fingerprint,
            updates: copy(bindPlannedUpdateTargets(plans, input.users, input.titles)),
          };
    day.fieldProvenance = {
      ...day.fieldProvenance,
      [primaryField]: { ...history, submissionBinding: binding },
    };
    if (skippedPlayers.has(index)) {
      users[index] = {
        ...user,
        days: user.days.map((current, dayIndex) => (dayIndex === input.day ? day : current)),
      };
      continue;
    }
    for (const [field, value] of Object.entries(values)) {
      day.fieldProvenance = writeField(
        day.fieldProvenance,
        field,
        (day as unknown as Record<string, TrackedValue>)[field],
        value,
        source
      );
      (day as unknown as Record<string, TrackedValue>)[field] = fieldValue(
        day.fieldProvenance[field]
      );
    }
    users[index] = {
      ...user,
      days: user.days.map((current, dayIndex) => (dayIndex === input.day ? day : current)),
    };
    const updates = binding.updates;
    if (!updates?.length) continue;
    users = executePlannedUpdates(users, updates, input.titles, {
      ...ops,
      source,
      strict: true,
      requireStableTargets: true,
    });
    mornings = executeMorningMessagePlannedUpdates(mornings, updates, users, {
      ...ops,
      source,
      strict: true,
      requireStableTargets: true,
    });
  }
  const applyProtections = () => {
    for (const protection of protections) {
      const cell = rawCells(users, input.titles, mornings).find(
        (candidate) => candidate.key === protection.key
      );
      if (!cell) continue;
      for (const source of new Set(protection.pieces.map((piece) => piece.src))) {
        cell.set(stripSource(cell.get(), source, true).raw);
      }
      cell.set(cell.get() + protection.pieces.map(serializePiece).join(''));
    }
  };
  // Prevent a kept manual tag removal from transiently firing its add trigger.
  applyProtections();
  const result = runTagTriggerFixpoint(
    baseline.users,
    users,
    input.titles,
    input.env,
    mornings,
    collectTagPlacements(baseline.users, baseline.morningMessages, input.titles)
  );
  users = result.users;
  mornings = result.morningMessages ?? mornings;
  const beforeProtection = collectTagPlacements(users, mornings, input.titles);
  applyProtections(); // Also mask newly generated, derived file/tag contributions.
  const protectedResult = runTagTriggerFixpoint(
    users,
    users,
    input.titles,
    input.env,
    mornings,
    beforeProtection
  );
  users = protectedResult.users;
  mornings = protectedResult.morningMessages ?? mornings;
  // A new scope or newly fired tag can also target an existing protected
  // decision. Discover those writes, then re-evaluate with the decision
  // released/kept before scripts read the affected cells.
  const discovered = new Set(additionalReviewTargets);
  const inspectNewFields = (
    original: FieldProvenance | undefined,
    current: FieldProvenance | undefined,
    playerIndex: number,
    day: number | null
  ) => {
    for (const [field, history] of Object.entries(original ?? {})) {
      const id = fieldKey(playerIndex, day, field);
      if (conflicts.some((conflict) => conflict.id === id)) continue;
      if (!history.writes.some((write) => isManualSource(write.source) && write.overrides?.length))
        continue;
      const oldIds = new Set(history.writes.map((write) => write.id));
      if (
        current?.[field]?.writes.some(
          (write) => isAutomaticSource(write.source) && !oldIds.has(write.id)
        )
      ) {
        discovered.add(id);
      }
    }
  };
  input.users.forEach((user, playerIndex) => {
    inspectNewFields(
      user.playerData.fieldProvenance,
      users[playerIndex].playerData.fieldProvenance,
      playerIndex,
      null
    );
    user.days.forEach((day, dayIndex) =>
      inspectNewFields(
        day.fieldProvenance,
        users[playerIndex].days[dayIndex]?.fieldProvenance,
        playerIndex,
        dayIndex
      )
    );
  });
  const signature = (raw: string) => {
    const effective = effectiveCell(raw);
    return JSON.stringify([
      effective.baseText,
      effective.pieces.map(({ pos, ...piece }) => piece),
      effective.fileOrder,
    ]);
  };
  const finalCells = new Map(
    rawCells(users, input.titles, mornings).map((cell) => [cell.key, cell])
  );
  for (const original of originalCells) {
    const pieces = parseCellPieces(original.get()).pieces;
    const oldPieces = new Set(pieces.map(serializePiece));
    const current = finalCells.get(original.key)?.get() ?? '';
    const newAutomatic = parseCellPieces(current).pieces.filter(
      (piece) => isAutomaticSource(piece.src) && !oldPieces.has(serializePiece(piece))
    );
    if (!newAutomatic.length) continue;
    for (const source of new Set(
      pieces.filter((piece) => manualSources(piece.src).length).map((piece) => piece.src)
    )) {
      if (
        conflicts.some(
          (conflict) => conflict.id === original.key && conflict.manualSources?.includes(source)
        )
      )
        continue;
      const decisions = pieces.filter((piece) => piece.src === source);
      if (
        signature(current) !== signature(current + decisions.map(serializePiece).join('')) ||
        (decisions.some((piece) => piece.kind === 'set') &&
          newAutomatic.some((piece) => piece.kind === 'set'))
      )
        discovered.add(rawReviewKey(original.key, source));
    }
  }
  if (discovered.size > additionalReviewTargets.size) {
    return buildLiveCertification(input, choices, discovered, pass + 1);
  }
  for (const conflict of conflicts) {
    const user = users[conflict.playerIndex];
    const container = (conflict.day === null
      ? user.playerData
      : user.days[conflict.day]) as unknown as Record<string, unknown>;
    conflict.proposed = conflict.field
      ? displayField(conflict.field, container[conflict.field])
      : (rawCells(users, input.titles, mornings)
          .find((cell) => cell.key === conflict.id)
          ?.get() ?? '');
  }
  return { users, mornings, conflicts, scope };
};

export const planLiveCertification = (input: LiveCertificationInput, choices: LiveChoices = {}) =>
  buildLiveCertification(input, choices, new Set(), 0);
