import type { UserTableItem, UserTableTitle, DayData } from '../../../types/playerTable';
import type { RoleTableItem } from '../../../types/roleTable';

export type ScriptCapability = 'operator' | 'player' | 'newser';

export interface ScriptSourceData {
  capability?: ScriptCapability;
  players?: UserTableItem[];
  roles?: RoleTableItem[];
  currentUserId?: string;
  currentEmail?: string;
  currentDay?: number;
  dayDates?: string[];
  schedule?: Record<string, unknown>;
  profiles?: unknown[];
  userTableTitle?: UserTableTitle;
}

/**
 * Convert a DayData into a flat runtime object with extra columns merged in
 * using their column titles as keys. e.g. { vote, action, Infected: "Y", ... }
 */
const dayEntry = (day: DayData | undefined, extraDayColumnTitles: string[]) => {
  const base: Record<string, unknown> = {
    vote: day?.vote ?? '',
    action: day?.action ?? '',
  };
  const extra = day?.extraColumns ?? [];
  for (let i = 0; i < extraDayColumnTitles.length; i++) {
    base[extraDayColumnTitles[i]] = extra[i] ?? '';
  }
  return base;
};

/**
 * Convert a UserTableItem into a flat runtime object.
 * The player's fields are spread directly so scripts can access
 * `Item.isDead`, `Item.realName`, `Item.role`, etc. without nesting.
 * Extra user columns are merged in using their titles as keys.
 * Day objects also have extra day columns merged in using their titles as keys.
 */
const playerEntry = (player: UserTableItem, titles?: UserTableTitle) => {
  const extraUserColumnTitles = titles?.extraUserColumns ?? [];
  const extraDayColumnTitles = titles?.extraDayColumns ?? [];

  const base: Record<string, unknown> = {
    realName: player.realName,
    email: player.email,
    userId: player.userId,
    role: player.role,
    isAlive: player.playerData.livingState === 'alive',
    days: (player.days ?? []).map((day) => dayEntry(day, extraDayColumnTitles)),
  };

  const extra = player.playerData.extraColumns ?? [];
  for (let i = 0; i < extraUserColumnTitles.length; i++) {
    base[extraUserColumnTitles[i]] = extra[i] ?? '';
  }

  return base;
};

export const SCRIPT_GLOBAL_NAMES = [
  'players',
  'roles',
  'currentPlayer',
  'currentDay',
  'dayDates',
  'schedule',
  'profiles',
] as const;

export const createScriptGlobals = (source: ScriptSourceData = {}): Record<string, unknown> => {
  const capability = source.capability ?? 'newser';
  const players = (source.players ?? []).map((entry) => playerEntry(entry, source.userTableTitle));
  const currentPlayer = players.find((entry) => {
    const e = entry as Record<string, unknown>;
    if (source.currentUserId && e.userId === source.currentUserId) {
      return true;
    }
    return Boolean(
      source.currentEmail &&
      typeof e.email === 'string' &&
      e.email.toLowerCase() === source.currentEmail.toLowerCase()
    );
  });
  const roles = (source.roles ?? [])
    .filter((role) => role.isVisible !== false || capability === 'operator')
    .map(({ role, doesRoleVote, isVisible, aboutRole }) => ({
      role,
      doesRoleVote,
      isVisible,
      aboutRole,
    }));

  return {
    players,
    roles,
    currentPlayer: capability === 'player' ? currentPlayer : undefined,
    currentDay: source.currentDay ?? 0,
    dayDates: source.dayDates ?? [],
    schedule: source.schedule ?? {},
    profiles: source.profiles ?? [],
  };
};
