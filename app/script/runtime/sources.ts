import type { UserTableItem } from '../../../types/playerTable';
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
}

/**
 * Convert a UserTableItem into a flat runtime object.
 * The player's fields are spread directly so scripts can access
 * `Item.isDead`, `Item.realName`, `Item.role`, etc. without nesting.
 */
const playerEntry = (player: UserTableItem) => ({
  realName: player.realName,
  email: player.email,
  userId: player.userId,
  role: player.role,
  isAlive: player.playerData.livingState === 'alive',
  days: player.days,
});

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
  const players = (source.players ?? []).map((entry) => playerEntry(entry));
  const currentPlayer = players.find((entry) => {
    if (source.currentUserId && entry.userId === source.currentUserId) {
      return true;
    }
    return Boolean(
      source.currentEmail && entry.email.toLowerCase() === source.currentEmail.toLowerCase()
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
