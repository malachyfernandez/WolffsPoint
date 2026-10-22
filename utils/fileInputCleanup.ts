import type { UserTableItem } from '../types/playerTable';
import type { RoleTableItem } from '../types/roleTable';
import { parseScript } from '../script/lang/parser';
import { getFileInputs, type ScriptFilesIndex } from './scriptFiles';
import { cleanupFileInputCell } from './cellPieces';

export const hasRemovedFileInputs = (before: ScriptFilesIndex, after: ScriptFilesIndex): boolean =>
  [...before.byId.values()].some((previous) => {
    const current = after.byId.get(previous.id);
    if (!current || current.source === previous.source) return false;
    if (
      [previous, current].some((file) =>
        parseScript(file.source).diagnostics.some((issue) => issue.severity === 'error')
      )
    )
      return false;
    const names = new Set(getFileInputs(current).map((input) => input.name.toLowerCase()));
    return getFileInputs(previous).some((input) => !names.has(input.name.toLowerCase()));
  });

const cleanStrings = (values: string[] | undefined, index: ScriptFilesIndex) => {
  if (!values) return values;
  const next = values.map((value) => cleanupFileInputCell(value, index));
  return next.some((value, position) => value !== values[position]) ? next : values;
};

/** Only live file-capable cells change; stable IDs and private histories stay intact. */
export const cleanupFileInputUserTable = (
  users: UserTableItem[],
  index: ScriptFilesIndex
): UserTableItem[] => {
  const next = users.map((user) => {
    const columns = cleanStrings(user.playerData.extraColumns, index);
    const days = user.days.map((day) => {
      const extraColumns = cleanStrings(day.extraColumns, index);
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

export const cleanupFileInputRoles = (
  roles: RoleTableItem[],
  index: ScriptFilesIndex
): RoleTableItem[] => {
  const next = roles.map((role) => {
    const roleMessage = cleanupFileInputCell(role.roleMessage, index);
    const voteMessage =
      role.voteMessage === undefined ? undefined : cleanupFileInputCell(role.voteMessage, index);
    const aboutRole = cleanupFileInputCell(role.aboutRole, index);
    return roleMessage === role.roleMessage &&
      voteMessage === role.voteMessage &&
      aboutRole === role.aboutRole
      ? role
      : { ...role, roleMessage, voteMessage, aboutRole };
  });
  return next.some((role, position) => role !== roles[position]) ? next : roles;
};

/** For active markdown/message records only, never certification or save-history records. */
export const cleanupFileInputContent = <T>(value: T, index: ScriptFilesIndex): T => {
  if (typeof value === 'string') return cleanupFileInputCell(value, index) as T;
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const next = value.map((item) => cleanupFileInputContent(item, index));
    return (next.some((item, position) => item !== value[position]) ? next : value) as T;
  }
  let changed = false;
  const entries = Object.entries(value).map(([key, item]) => {
    const clean = cleanupFileInputContent(item, index);
    if (clean !== item) changed = true;
    return [key, clean];
  });
  return changed ? (Object.fromEntries(entries) as T) : value;
};
