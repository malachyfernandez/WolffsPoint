import type { PlannedUpdate } from '../types/multiplayer';
import type { UserTableItem, UserTableTitle } from '../types/playerTable';

const BUILTIN_USER_COLUMNS = new Set(['livingstate']);
const BUILTIN_DAY_COLUMNS = new Set(['vote', 'action', 'votemultiplier', 'morningmessage']);
const builtinId = (column: string) => `builtin:${column.toLowerCase()}`;

const assertUnique = (ids: string[], label: string) => {
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new Error(`Missing or duplicate ${label} identity`);
  }
};

/** Pure widen/adopt step. Persist this together with the first ledger, never
 * generate IDs in a render or quietly reinterpret an old index-bound plan. */
export const adoptCertificationIdentities = (
  users: UserTableItem[],
  titles: UserTableTitle,
  dayCount: number,
  newId: (kind: 'player' | 'day' | 'column') => string
): { users: UserTableItem[]; titles: UserTableTitle } => {
  if (!Number.isSafeInteger(dayCount) || dayCount < 0) throw new Error('Invalid day count');
  const days = Math.max(
    dayCount,
    titles.dayIds?.length ?? 0,
    ...users.map((user) => user.days.length)
  );
  const dayIds = Array.from({ length: days }, (_, index) => {
    const existing = new Set(
      [titles.dayIds?.[index], ...users.map((user) => user.days[index]?.id)].filter(
        (id): id is string => !!id
      )
    );
    if (existing.size > 1) throw new Error('Conflicting game-day identities');
    return [...existing][0] ?? newId('day');
  });
  const columns = (names: string[], ids: string[] | undefined) => {
    if (ids && ids.length > names.length) {
      throw new Error('Column identities must be deleted together with their columns');
    }
    return names.map((_, index) => ids?.[index] ?? newId('column'));
  };
  const nextTitles: UserTableTitle = {
    ...titles,
    dayIds,
    extraUserColumnIds: columns(titles.extraUserColumns, titles.extraUserColumnIds),
    extraDayColumnIds: columns(titles.extraDayColumns, titles.extraDayColumnIds),
  };
  const nextUsers = users.map((user) => ({
    ...user,
    id: user.id ?? newId('player'),
    days: dayIds.map((id, index) => ({ ...user.days[index], id })),
  }));
  assertUnique(dayIds, 'day');
  assertUnique(
    nextUsers.map((user) => user.id),
    'player'
  );
  assertUnique([...nextTitles.extraUserColumnIds!, ...nextTitles.extraDayColumnIds!], 'column');
  if (
    [...nextTitles.extraUserColumnIds!, ...nextTitles.extraDayColumnIds!].some((id) =>
      id.startsWith('builtin:')
    )
  ) {
    throw new Error('Custom column identities cannot use the builtin namespace');
  }
  return { users: nextUsers, titles: nextTitles };
};

export const bindPlannedUpdateTargets = (
  updates: PlannedUpdate[],
  users: UserTableItem[],
  titles: UserTableTitle
): PlannedUpdate[] =>
  updates.map((update) => {
    if (update.targetIds) return update;
    const playerIds =
      update.playerIndex === null ? users.map((user) => user.id) : [users[update.playerIndex]?.id];
    const dayId = update.dayIndex === null ? null : titles.dayIds?.[update.dayIndex];
    const column = update.column.toLowerCase();
    const isUser = update.columnType === 'user';
    const builtin = (isUser ? BUILTIN_USER_COLUMNS : BUILTIN_DAY_COLUMNS).has(column);
    const names = isUser ? titles.extraUserColumns : titles.extraDayColumns;
    const ids = isUser ? titles.extraUserColumnIds : titles.extraDayColumnIds;
    const columnId = builtin
      ? builtinId(column)
      : ids?.[names.findIndex((name) => name.toLowerCase() === column)];
    // Legacy submissions remain explicitly unbound. Only the guarded adopter
    // can decide whether it is safe to accept one against a later structure.
    if (playerIds.some((id) => !id) || dayId === undefined || !columnId) return update;
    return {
      ...update,
      targetIds: { playerIds: playerIds as string[], dayId, columnId },
    };
  });

/** Resolve IDs immediately before execution. A deleted target is an error,
 * never permission to fall back to the player now occupying its old index. */
export const resolvePlannedUpdateTargets = (
  update: PlannedUpdate,
  users: UserTableItem[],
  titles: UserTableTitle,
  requireStableTargets = false
): PlannedUpdate[] => {
  const target = update.targetIds;
  if (!target) {
    if (requireStableTargets) throw new Error('Legacy planned update requires target review');
    return [update];
  }
  assertUnique(target.playerIds, 'planned player');
  if (titles.dayIds) assertUnique(titles.dayIds, 'game-day');
  const dayIndex = target.dayId === null ? null : titles.dayIds?.indexOf(target.dayId);
  if (dayIndex === undefined || dayIndex === -1) throw new Error('Planned game day was deleted');
  const isUser = update.columnType === 'user';
  if (isUser !== (dayIndex === null)) throw new Error('Planned column scope changed');
  const names = isUser ? titles.extraUserColumns : titles.extraDayColumns;
  const ids = isUser ? titles.extraUserColumnIds : titles.extraDayColumnIds;
  if (ids) {
    assertUnique(ids, 'column');
    if (ids.length !== names.length) throw new Error('Column identities are not aligned');
  }
  const builtins = isUser ? BUILTIN_USER_COLUMNS : BUILTIN_DAY_COLUMNS;
  const builtinColumn = target.columnId.startsWith('builtin:') ? target.columnId.slice(8) : null;
  const column =
    builtinColumn && builtins.has(builtinColumn)
      ? builtinColumn
      : names[ids?.indexOf(target.columnId) ?? -1];
  if (!column) throw new Error('Planned column was deleted');
  return target.playerIds.map((id) => {
    const matches = users.flatMap((user, index) => (user.id === id ? [index] : []));
    if (matches.length !== 1)
      throw new Error('Planned player was deleted or has duplicate identities');
    const playerIndex = matches[0];
    if (dayIndex !== null && users[playerIndex].days[dayIndex]?.id !== target.dayId) {
      throw new Error('Player day identity does not match the planned game day');
    }
    return { ...update, playerIndex, dayIndex, column };
  });
};
