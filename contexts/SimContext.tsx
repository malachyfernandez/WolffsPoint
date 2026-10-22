import React, { createContext, useContext, useEffect } from 'react';
import { setSimNow } from '../utils/simNow';

/**
 * Simulation persona/namespace context.
 *
 * When a simulation is active, everything mounted under SimProvider sees an
 * isolated copy of the game: the useData hooks rewrite record coordinates so
 * every read and write lands in the sim namespace instead of the live game's.
 *
 * Record coordinate rules (applied inside hooks/useData.ts):
 *
 * - Record keys get a "sim:{realGameId}:" prefix. This applies to both list
 *   keys and variable keys, so a sim record can never collide with - or leak
 *   into - a live record. Example: list 'userTable' becomes
 *   'sim:myGame:userTable'; variable 'playerNightSubmission-day-3-myGame:sim'
 *   becomes 'sim:myGame:playerNightSubmission-day-3-myGame:sim'.
 *
 * - List itemIds get a ":sim" suffix (idempotent). The game id itself maps to
 *   "{gameId}:sim", which is exactly what components already compute when
 *   their gameId prop is the sim id.
 *
 * - Per-user variables (useValue) become list items so each persona gets its
 *   own record under the operator's account: itemId 'sim:{personaId}' for a
 *   persona, 'sim:shared' for the console/operator view. The matching find
 *   query (useFindValues -> find-list-items) then returns every persona's
 *   records at once - the same shape the operator table expects for
 *   submissions, profiles, etc.
 *
 * - The 'games' list is exempt: there is no sim game row, and ownership
 *   lookups (useGameOperatorUserId) must keep resolving the real operator.
 *   Reads for itemId "{gameId}:sim" reverse-map to the real gameId.
 */

export type SimMode = 'off' | 'console' | 'persona';

export interface SimState {
  mode: SimMode;
  /** The live game's id. */
  realGameId: string;
  /** "{realGameId}:sim" - every game-scoped itemId resolves here. */
  simGameId: string;
  /** Active persona id (slug from the persona's email). Persona mode only. */
  personaId?: string;
  /** The currentUserId passed into the player tree: "sim:{personaId}". */
  personaUserId?: string;
  personaName?: string;
  /** The real operator's user token - sim records are operator-owned. */
  operatorUserId?: string;
  /**
   * Simulated "now" (epoch ms) chosen from the sim strip. While set, nowDate()
   * / nowMs() / useNow() inside the provider return the emulated clock instead
   * of the wall clock. Undefined means follow real time.
   */
  simNowMs?: number;
  /**
   * Opens the faux-player manager. The dialog itself lives outside this
   * provider (its hook reads live records + writes literal sim coordinates),
   * so console components call through here instead of mounting it.
   */
  openManagePlayers?: () => void;
}

export const SIM_OFF: SimState = { mode: 'off', realGameId: '', simGameId: '' };

const SimContext = createContext<SimState>(SIM_OFF);

export const SimProvider = ({ value, children }: { value: SimState; children: React.ReactNode }) => {
  // Publish the simulated clock to the module-level offset nowDate()/nowMs()
  // read. Cleared when the provider unmounts or the session unsets simNow.
  useEffect(() => {
    setSimNow(value.simNowMs ?? null);
    return () => setSimNow(null);
  }, [value.simNowMs]);

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
};

export const useSim = (): SimState => useContext(SimContext);

export const simGameIdFor = (realGameId: string) => `${realGameId}:sim`;

/** Namespaced record key used inside the sim for a given live key. */
export const simRecordKey = (sim: SimState, key: string) => `sim:${sim.realGameId}:${key}`;

/** Same transform for call sites that only have the game id (seed code). */
export const simRecordKeyFor = (realGameId: string, key: string) => `sim:${realGameId}:${key}`;

/**
 * itemId for a persona/console variable-as-list-item record.
 * 'sim:shared' holds console-written records every persona can see.
 */
export const simScopeItemId = (sim: SimState) =>
  sim.mode === 'persona' && sim.personaId ? `sim:${sim.personaId}` : 'sim:shared';

export const SIM_SHARED_ITEM_ID = 'sim:shared';

/**
 * Redirects a list itemId into the sim namespace. The exact real gameId maps
 * to the sim gameId; anything already carrying ':sim' passes through; other
 * ids get the ':sim' suffix so composite ids stay namespaced too.
 */
export const simListItemId = (sim: SimState, itemId: string | undefined) => {
  if (!itemId) return itemId;
  if (itemId === sim.realGameId) return sim.simGameId;
  if (itemId.includes(':sim')) return itemId;
  return `${itemId}:sim`;
};

/**
 * Reverse-maps the 'games' list lookup: components inside the sim pass the
 * sim gameId, but the games row only exists under the real id.
 */
export const simGamesItemId = (sim: SimState, itemId: string | undefined) =>
  itemId === sim.simGameId ? sim.realGameId : itemId;

/**
 * Persona-scoped userIds filters would find nothing (sim records are owned
 * by the operator), so the persona's synthetic userId maps back to the real
 * operator token.
 */
export const simMapUserIds = (sim: SimState, userIds: string[] | undefined) =>
  userIds?.map((id) =>
    sim.personaUserId && id === sim.personaUserId ? sim.operatorUserId || id : id
  );
