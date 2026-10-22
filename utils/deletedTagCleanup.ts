/**
 * Deleted-tag cleanup.
 *
 * Deleting a tag file (or a legacy tagDefinitions entry, or moving a file
 * out of `tags/`) must remove the tag from every cell that contains it.
 * The provenance-native removal is a REM tombstone, so cleanup appends
 * `[/REM match="tagid:X"/]` for id-bound tag pieces and
 * `[/REM match="tag:N"/]` for name-only refs (tag pieces without an id and
 * legacy `[/TAG: "N"/]` base tokens). Masked contributions stay in storage;
 * revert and support bookkeeping keep working.
 */
import { cellTagRefs, serializePiece, type ContributionSource } from './cellPieces';
import { isTagFile, tagFileName, type ScriptFilesIndex } from './scriptFiles';
import type { UserTableItem } from '../types/playerTable';
import type { RoleTableItem } from '../types/roleTable';

export const DELETED_TAG_SRC: ContributionSource = 'cleanup';

export interface RemovedTag {
  /** Stable tag file id when the tag was file-backed. */
  id?: string;
  /** Display name (`Tag({NAME})` meta or file name / definition name). */
  name: string;
}

/** Tag files present in `before` that are gone or no longer tags in `after`
 *  (deleted outright, or moved out of the pinned `tags/` folder). */
export const removedTagFiles = (before: ScriptFilesIndex, after: ScriptFilesIndex): RemovedTag[] =>
  [...before.byId.values()]
    .filter(isTagFile)
    .filter((file) => {
      const current = after.byId.get(file.id);
      return !current || !isTagFile(current);
    })
    .map((file) => ({ id: file.id, name: tagFileName(file) }));

/** Legacy tagDefinitions entries dropped between two snapshots. */
export const removedTagDefs = (
  before: { name: string }[] | undefined,
  after: { name: string }[] | undefined
): RemovedTag[] => {
  const live = new Set((after ?? []).map((def) => def.name.toLowerCase()));
  return (before ?? [])
    .filter((def) => !live.has(def.name.toLowerCase()))
    .map((def) => ({ name: def.name }));
};

/**
 * Appends REM tombstones masking every visible ref to a removed tag.
 * Name-only refs are only masked when no surviving tag still owns that name
 * (`liveTagNames`) - a same-named tag file or legacy definition keeps them.
 */
export const cleanupDeletedTagCell = (
  raw: string,
  removed: RemovedTag[],
  liveTagNames?: Set<string>
): string => {
  if (!raw || !raw.includes('[/') || !removed.length) return raw;
  const live = liveTagNames ?? new Set<string>();
  const refs = cellTagRefs(raw);
  let next = raw;
  for (const tag of removed) {
    for (const ref of refs) {
      if (ref.tagId) {
        if (tag.id !== undefined && ref.tagId === tag.id) {
          next += serializePiece({
            kind: 'rem',
            src: DELETED_TAG_SRC,
            match: { type: 'tagid', tagId: ref.tagId },
          });
        }
      } else if (
        ref.name.toLowerCase() === tag.name.toLowerCase() &&
        !live.has(ref.name.toLowerCase())
      ) {
        next += serializePiece({
          kind: 'rem',
          src: DELETED_TAG_SRC,
          match: { type: 'tag', name: ref.name },
        });
      }
    }
  }
  return next;
};

const cleanStrings = (
  values: string[] | undefined,
  removed: RemovedTag[],
  liveTagNames?: Set<string>
): string[] | undefined => {
  if (!values) return values;
  const next = values.map((value) => cleanupDeletedTagCell(value, removed, liveTagNames));
  return next.some((value, position) => value !== values[position]) ? next : values;
};

/** Only live tag-capable cells change; stable IDs and private histories stay intact. */
export const cleanupDeletedTagUserTable = (
  users: UserTableItem[],
  removed: RemovedTag[],
  liveTagNames?: Set<string>
): UserTableItem[] => {
  const next = users.map((user) => {
    const columns = cleanStrings(user.playerData.extraColumns, removed, liveTagNames);
    const days = user.days.map((day) => {
      const extraColumns = cleanStrings(day.extraColumns, removed, liveTagNames);
      return extraColumns === day.extraColumns ? day : { ...day, extraColumns };
    });
    const changedDays = days.some((day, position) => day !== user.days[position]);
    if (columns === user.playerData.extraColumns && !changedDays) return user;
    return {
      ...user,
      playerData:
        columns === user.playerData.extraColumns
          ? user.playerData
          : { ...user.playerData, extraColumns: columns },
      days: changedDays ? days : user.days,
    };
  });
  return next.some((user, position) => user !== users[position]) ? next : users;
};

export const cleanupDeletedTagRoles = (
  roles: RoleTableItem[],
  removed: RemovedTag[],
  liveTagNames?: Set<string>
): RoleTableItem[] => {
  const next = roles.map((role) => {
    const roleMessage = cleanupDeletedTagCell(role.roleMessage, removed, liveTagNames);
    const voteMessage =
      role.voteMessage === undefined
        ? undefined
        : cleanupDeletedTagCell(role.voteMessage, removed, liveTagNames);
    const aboutRole = cleanupDeletedTagCell(role.aboutRole, removed, liveTagNames);
    return roleMessage === role.roleMessage &&
      voteMessage === role.voteMessage &&
      aboutRole === role.aboutRole
      ? role
      : { ...role, roleMessage, voteMessage, aboutRole };
  });
  return next.some((role, position) => role !== roles[position]) ? next : roles;
};

/** For active markdown/message records only, never certification or save-history records. */
export const cleanupDeletedTagContent = <T>(
  value: T,
  removed: RemovedTag[],
  liveTagNames?: Set<string>
): T => {
  if (typeof value === 'string') return cleanupDeletedTagCell(value, removed, liveTagNames) as T;
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const next = value.map((item) => cleanupDeletedTagContent(item, removed, liveTagNames));
    return (next.some((item, position) => item !== value[position]) ? next : value) as T;
  }
  let changed = false;
  const entries = Object.entries(value).map(([key, item]) => {
    const clean = cleanupDeletedTagContent(item, removed, liveTagNames);
    if (clean !== item) changed = true;
    return [key, clean];
  });
  return changed ? (Object.fromEntries(entries) as T) : value;
};

/** Display names of every surviving tag: file-backed tags plus legacy defs. */
export const liveTagNameSet = (
  index: ScriptFilesIndex,
  tagDefs: { name: string }[] | undefined
): Set<string> => {
  const names = new Set<string>();
  for (const file of index.byId.values()) {
    if (isTagFile(file)) names.add(tagFileName(file).toLowerCase());
  }
  for (const def of tagDefs ?? []) names.add(def.name.toLowerCase());
  return names;
};
