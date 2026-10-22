import { simGameIdFor, simRecordKeyFor, SIM_SHARED_ITEM_ID } from '../contexts/SimContext';
import { createClientId, getGameScopedKey } from './multiplayer';
import { nowDate, nowMs } from './simNow';
import type { UserTableItem, UserTableTitle } from '../types/playerTable';
import type { PlayerProfile } from '../types/multiplayer';

/**
 * Simulation session helpers.
 *
 * The session itself is a plain per-user variable ("simSession-{gameId}") so it
 * survives reloads and is read outside SimProvider (no redirects apply).
 */

export type SimView = 'operator' | 'console' | 'persona';

export interface SimSession {
  /** A simulation exists for this game (config snapshot taken). */
  enabled: boolean;
  /** What the screen currently shows: live operator, sim console, or a persona. */
  view: SimView;
  /** Active persona when view === 'persona'. */
  personaId?: string;
  personaName?: string;
  /**
   * What the game thinks "now" is (epoch ms). Undefined means real time.
   * Set from the sim strip's date control; read by SimProvider to drive
   * nowDate()/nowMs()/useNow() inside the sim tree.
   */
  simNowMs?: number;
}

export const defaultSimSession: SimSession = { enabled: false, view: 'operator' };

export const simSessionKey = (gameId: string) => `simSession-${gameId}`;

/** Persisted per-game UI pref: whether the sim sidebar shows its full list or the icon rail. */
export const simSidebarExpandedKey = (gameId: string) => `simSidebarExpanded-${gameId}`;

/** Stable persona id derived from a roster email: "faux.willow@x" -> "faux-willow". */
export const personaIdForEmail = (email: string) =>
  email
    .trim()
    .toLowerCase()
    .split('@')[0]
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'player';

export const personaUserIdFor = (personaId: string) => `sim:${personaId}`;

/**
 * Canonical record coordinates inside the sim - mirrors what the useData
 * redirect produces for components mounted under SimProvider. Seed/reset code
 * runs outside the provider, so it writes these literal coordinates directly.
 */
export const simListKeyFor = (realGameId: string, listKey: string) =>
  simRecordKeyFor(realGameId, listKey);

/** The key a game-scoped variable resolves to inside the sim. */
export const simVariableKeyFor = (realGameId: string, baseKey: string) =>
  simRecordKeyFor(realGameId, getGameScopedKey(baseKey, simGameIdFor(realGameId)));

/** Game-scoped list items copied into the sim on "Start simulation". */
export const SIM_SNAPSHOT_LIST_KEYS = [
  'userTable',
  'userTableTitle',
  'userTableColumnVisibility',
  'userTableColumnNightlyVisibility',
  'roleTable',
  'dayDatesArray',
  'numberOfRealDaysPerInGameDay',
  'selectedDayIndex',
  'skipActionsDays',
  'skipVotingDays',
  'voteMessageDefault',
  'newspaper',
  'morningMessagesList',
  'useLegacySystems',
  'cellModuleVersion',
] as const;

/**
 * Game-scoped variables (read via useFindValues across users / useValue by the
 * operator) copied into the sim as 'sim:shared' list items. Inside the sim,
 * both read paths resolve to the same list items.
 */
export const SIM_SNAPSHOT_VAR_BASE_KEYS = [
  'gameSchedule',
  'ruleBook',
  'scriptFiles',
  'tagDefinitions',
  'tagTriggers',
  'nightlyPageColumnSizes',
  'playerPageColumnSizes',
] as const;

export const simSharedItem = SIM_SHARED_ITEM_ID;

/** Persona record coordinates (must match the useValue redirect). */
export const personaRecordKey = (realGameId: string, key: string) =>
  simRecordKeyFor(realGameId, key);

export const personaItemIdFor = (personaId: string) => `sim:${personaId}`;

export interface PersonaSeed {
  userDataItem: {
    key: string;
    itemId: string;
    value: { name: string; email: string; userId: string };
  };
  profileItem: { key: string; itemId: string; value: PlayerProfile };
}

/**
 * Builds the two persona records the player UI needs:
 * 'userData' (so PlayerAccessGate finds an email) and 'playerProfile-{simId}'
 * (pre-claimed so the claim-profile gate doesn't fire).
 */
export const buildPersonaSeed = (
  realGameId: string,
  player: Pick<UserTableItem, 'realName' | 'email'>
): PersonaSeed => {
  const simGameId = simGameIdFor(realGameId);
  const personaId = personaIdForEmail(player.email);
  const itemId = personaItemIdFor(personaId);
  const userId = personaUserIdFor(personaId);
  const email = player.email.trim().toLowerCase();
  const name = player.realName.trim();

  return {
    userDataItem: {
      key: personaRecordKey(realGameId, 'userData'),
      itemId,
      value: { name, email, userId },
    },
    profileItem: {
      key: personaRecordKey(realGameId, getGameScopedKey('playerProfile', simGameId)),
      itemId,
      value: {
        gameId: simGameId,
        email,
        userId,
        inGameName: name,
        profileImageUrl: '',
        phoneNumber: '',
        instagram: '',
        discord: '',
        otherContact: '',
        bioMarkdown: '',
        claimedAt: nowMs(),
      },
    },
  };
};

/** A blank faux player row for the sim userTable. */
export const buildFauxPlayer = (
  name: string,
  role: string,
  titles?: UserTableTitle | null,
  dayCount = 0
): UserTableItem => {
  const email = `${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')}@sim.local`;
  return {
    id: createClientId('player'),
    realName: name.trim(),
    email,
    userId: 'NOT-JOINED',
    role: role.trim() || 'UNSET',
    playerData: {
      livingState: 'alive',
      extraColumns: Array(titles?.extraUserColumns?.length ?? 0).fill(''),
    },
    days: Array(dayCount)
      .fill(null)
      .map((_, index) => ({
        id: titles?.dayIds?.[index],
        vote: '',
        action: '',
        extraColumns: Array(titles?.extraDayColumns?.length ?? 0).fill(''),
      })),
  };
};

/**
 * Moves the simulated clock to a target calendar day, defaulting the
 * time-of-day to the current (simulated) hour on the round hour so the sim
 * clock stays on clean :00 values. Passing null follows real time again.
 */
export const simNowForDate = (date: Date | null): number | undefined => {
  if (!date) return undefined;
  const base = nowDate();
  const next = new Date(date);
  next.setHours(base.getHours(), 0, 0, 0);
  return next.getTime();
};

/** Steps the simulated clock by whole days, preserving time-of-day. Bases on
 *  the live simulated clock (not the originally stored instant) so drift is
 *  preserved. */
export const stepSimNowDays = (currentSimNowMs: number | undefined, deltaDays: number): number => {
  const base = new Date(currentSimNowMs ?? nowMs());
  base.setDate(base.getDate() + deltaDays);
  return base.getTime();
};

/** Steps the simulated clock by whole hours, then floors to :00. Apply the
 *  delta BEFORE snapping - the clock keeps drifting at real pace, so
 *  flooring first would let a '-1h' press just rewind a few seconds. */
export const stepSimNowHours = (
  currentSimNowMs: number | undefined,
  deltaHours: number
): number => {
  const next = new Date((currentSimNowMs ?? nowMs()) + deltaHours * 3600000);
  next.setMinutes(0, 0, 0);
  return next.getTime();
};

/** Sets the simulated clock's time-of-day, keeping the current date. Bases on
 *  the live simulated clock when no instant is provided. */
export const setSimNowTime = (
  currentSimNowMs: number | undefined,
  hours: number,
  minutes: number
): number => {
  const base = new Date(currentSimNowMs ?? nowMs());
  base.setHours(hours, minutes, 0, 0);
  return base.getTime();
};
