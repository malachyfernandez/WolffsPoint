import { useCallback, useEffect, useRef, useSyncExternalStore, useMemo } from 'react';
import { DATA_CONFIG } from '../utils/dataConfig';
import { globalDataStore } from '../contexts/DataProvider';
import { useUserListSet } from './useUserListSet';
import { useUserListRemove } from './useUserListRemove';
import { useUserVariablePrivacy } from './useUserVariablePrivacy';
import { useUserListPrivacy } from './useUserListPrivacy';
import {
  useSim,
  simRecordKey,
  simScopeItemId,
  simListItemId,
  simGamesItemId,
  simMapUserIds,
} from '../contexts/SimContext';

import type { UserVariableResult, UserVariableRecord } from './useUserVariable';
import type { UserListRecord } from './useUserList';
import type { ScheduledValueSetter } from './useScheduledUpdates';
import { useSimEditWarning } from '../contexts/SimEditWarningContext';
import { trackManualMessages, trackManualTableChanges } from '../utils/fieldProvenance';
import type { UserTableItem } from '../types/playerTable';
import { isRestoringCellWrites } from '../utils/cellWriteOrigin';

// Fallback states before the background subscriber mounts
const NO_OP = () => {};
const FALLBACK_GET = undefined;

/**
 * Gets or creates a single variable per user.
 * Combines subscriptions in the background across components.
 *
 * Sim: inside a SimProvider the variable becomes a persona-scoped list item
 * ('sim:{game}:{key}' @ 'sim:{persona}' or 'sim:shared') so each simulated
 * player gets their own writable record under the operator's account.
 */
export function useValue<T = any>(
  key: string,
  overrides: any = {}
): [UserVariableResult<T>, ScheduledValueSetter<T>] {
  // `enabled` is consumed here, not forwarded: when false the hook registers
  // nothing (no backend subscription) and resolves to the defaultValue as a
  // settled (non-syncing) record.
  const { enabled = true, ...restOverrides } = overrides;
  const sim = useSim();
  const baseConfig = DATA_CONFIG[key] || {};
  const args = useMemo(
    () => ({ ...baseConfig, ...restOverrides }),
    [JSON.stringify(baseConfig), JSON.stringify(restOverrides)]
  );
  const sub = useMemo(() => {
    if (sim.mode !== 'off') {
      return { type: 'list', key: simRecordKey(sim, key), itemId: simScopeItemId(sim), args };
    }
    return { type: 'variable', key, args };
  }, [sim.mode, sim.realGameId, sim.personaId, key, args]);
  const subId = useMemo(() => JSON.stringify(sub), [sub]);

  useEffect(() => {
    if (!enabled) return;
    return globalDataStore.register(subId, sub);
  }, [enabled, subId, sub]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  const finalResult = result || [
    { value: args.defaultValue, state: { isSyncing: enabled } },
    NO_OP,
  ];

  return finalResult;
}

/**
 * Gets or creates a single item in a list per user.
 *
 * Sim: key is prefixed into the sim namespace and the itemId gains the ':sim'
 * suffix (the real gameId maps to "{gameId}:sim").
 */
export function useList<T = any>(
  key: string,
  itemId: string,
  overrides: any = {}
): [UserVariableResult<T>, ScheduledValueSetter<T>] {
  const { enabled = true, ...restOverrides } = overrides;
  const sim = useSim();
  const baseConfig = DATA_CONFIG[key] || {};
  const args = useMemo(
    () => ({ ...baseConfig, ...restOverrides }),
    [JSON.stringify(baseConfig), JSON.stringify(restOverrides)]
  );
  const sub = useMemo(() => {
    if (sim.mode !== 'off') {
      return {
        type: 'list',
        key: simRecordKey(sim, key),
        itemId: simListItemId(sim, itemId),
        args,
      };
    }
    return { type: 'list', key, itemId, args };
  }, [sim.mode, sim.realGameId, key, itemId, args]);
  const subId = useMemo(() => JSON.stringify(sub), [sub]);

  useEffect(() => {
    if (!enabled) return;
    const unregister = globalDataStore.register(subId, sub);
    return () => {
      unregister();
    };
  }, [enabled, subId, sub]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  const resolved = result || [{ value: args.defaultValue, state: { isSyncing: enabled } }, NO_OP];
  const current = useRef({ id: subId, snapshot: resolved });
  if (current.current.id !== subId) current.current = { id: subId, snapshot: resolved };
  const setterScope = current.current;
  setterScope.snapshot = resolved;
  // Effects depend on setters. Keep this boundary stable while reading the
  // latest staged baseline. Old commands retain their original game/sim scope
  // rather than following this component into a different record.
  const setTrackedValue = useCallback<ScheduledValueSetter<T>>(
    (value, options) => {
      const [record, setter] = setterScope.snapshot;
      if (isRestoringCellWrites() || options?.cellWriteOrigin === 'restore') {
        return setter(value, { ...options, cellWriteOrigin: 'restore' });
      }
      if (options?.cellWriteOrigin === 'tracked') return setter(value, options);
      const before = record.scheduledUpdate?.value ?? record.value;
      const tracked =
        key === 'userTable'
          ? trackManualTableChanges((before ?? []) as UserTableItem[], value as UserTableItem[])
          : trackManualMessages(before ?? {}, value as Record<string, string[]>);
      return setter(tracked, { ...options, cellWriteOrigin: 'tracked' });
    },
    [key, setterScope]
  );
  // Sim warning for role-table manipulation: no-op outside SimProvider, and
  // automated repairs (file-input cleanup) carry a cellWriteOrigin so only
  // direct user writes trip the flag.
  const warnSimEdit = useSimEditWarning();
  const setSimWarnedValue = useCallback<ScheduledValueSetter<T>>(
    (value, options) => {
      if (!options?.cellWriteOrigin) warnSimEdit();
      const [, setter] = setterScope.snapshot;
      return setter(value, options);
    },
    [warnSimEdit, setterScope]
  );
  return useMemo(
    () =>
      key === 'userTable' || key === 'morningMessagesList'
        ? [resolved[0], setTrackedValue]
        : key === 'roleTable'
          ? [resolved[0], setSimWarnedValue]
          : resolved,
    [key, resolved, setTrackedValue, setSimWarnedValue]
  );
}

/**
 * Finds accessible variables across all users based on search/filter criteria.
 *
 * Sim: variables live as persona-scoped list items, so the query becomes a
 * find-list-items at the sim-prefixed key - returning every persona's records
 * the same way live submissions aggregate across real users.
 */
export function useFindValues<T = any>(
  key: string,
  queryArgs: {
    itemId?: string;
    searchFor?: string;
    filterFor?: string | number | boolean;
    userIds?: string[];
    returnTop?: number;
    startAfter?: number;
  } = {}
) {
  const sim = useSim();
  const baseConfig = DATA_CONFIG[key] || {};
  const args = useMemo(
    () => ({ ...baseConfig, ...queryArgs }),
    [JSON.stringify(baseConfig), JSON.stringify(queryArgs)]
  );
  const sub = useMemo(() => {
    if (sim.mode !== 'off') {
      // A 'sim:*' id is a persona scope (an itemId), not a record owner -
      // every sim record is operator-owned, so owner-filtering by it finds
      // nothing. A single persona-scoped userIds filter becomes an itemId
      // filter, which is exactly the persona's record at this key. An
      // explicit itemId (e.g. 'sim:shared' for shared variable reads) wins.
      const scopeItemId =
        args.userIds?.length === 1 && args.userIds[0].startsWith('sim:')
          ? args.userIds[0]
          : undefined;
      const itemId = args.itemId ?? scopeItemId;
      return {
        type: 'find-list-items',
        key: simRecordKey(sim, key),
        args: {
          ...args,
          itemId,
          userIds: scopeItemId ? undefined : simMapUserIds(sim, args.userIds),
        },
      };
    }
    return { type: 'find-values', key, args };
  }, [sim.mode, sim.realGameId, sim.personaUserId, sim.operatorUserId, key, args]);
  const subId = useMemo(() => JSON.stringify(sub), [sub]);

  useEffect(() => {
    return globalDataStore.register(subId, sub);
  }, [subId, sub]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  const finalResult = (result || FALLBACK_GET) as UserVariableRecord<T>[] | undefined;

  return finalResult;
}

/**
 * Finds accessible list items across all users based on search/filter criteria.
 *
 * Sim: keys prefix into the sim namespace and itemIds map into sim ids. The
 * 'games' list is exempt (ownership lookups must keep resolving the real
 * operator), with "{gameId}:sim" reverse-mapped to the real id.
 */
export function useFindListItems<T = any>(
  key: string,
  queryArgs: {
    itemId?: string;
    searchFor?: string;
    filterFor?: string | number | boolean;
    userIds?: string[];
    returnTop?: number;
    startAfter?: number;
  } = {}
) {
  const sim = useSim();
  const baseConfig = DATA_CONFIG[key] || {};
  const args = useMemo(
    () => ({ ...baseConfig, ...queryArgs }),
    [JSON.stringify(baseConfig), JSON.stringify(queryArgs)]
  );
  const sub = useMemo(() => {
    if (sim.mode !== 'off') {
      const isGames = key === 'games';
      return {
        type: 'find-list-items',
        key: isGames ? key : simRecordKey(sim, key),
        args: {
          ...args,
          itemId: isGames ? simGamesItemId(sim, args.itemId) : simListItemId(sim, args.itemId),
          userIds: simMapUserIds(sim, args.userIds),
        },
      };
    }
    return { type: 'find-list-items', key, args };
  }, [sim.mode, sim.realGameId, sim.simGameId, sim.personaUserId, sim.operatorUserId, key, args]);
  const subId = useMemo(() => JSON.stringify(sub), [sub]);

  useEffect(() => {
    const unregister = globalDataStore.register(subId, sub);
    return () => {
      unregister();
    };
  }, [subId, sub]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  return (result || FALLBACK_GET) as UserListRecord<T>[] | undefined;
}

/**
 * Gets the exact count of accessible variables for a given filter.
 */
export function useValueCount(key: string, queryArgs: { filterFor: string | number | boolean }) {
  const sim = useSim();
  const baseConfig = DATA_CONFIG[key] || {};
  const args = { ...baseConfig, ...queryArgs };
  const sub =
    sim.mode !== 'off'
      ? { type: 'list-count', key: simRecordKey(sim, key), args }
      : { type: 'value-count', key, args };
  const subId = JSON.stringify(sub);

  useEffect(() => {
    return globalDataStore.register(subId, sub);
  }, [subId]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  return result || FALLBACK_GET;
}

/**
 * Gets the exact count of accessible list items for a given filter.
 */
export function useListCount(
  key: string,
  queryArgs: { filterFor: string | number | boolean; itemId?: string }
) {
  const sim = useSim();
  const baseConfig = DATA_CONFIG[key] || {};
  const args = { ...baseConfig, ...queryArgs };
  const sub =
    sim.mode !== 'off'
      ? {
          type: 'list-count',
          key: simRecordKey(sim, key),
          args: { ...args, itemId: simListItemId(sim, args.itemId) },
        }
      : { type: 'list-count', key, args };
  const subId = JSON.stringify(sub);

  useEffect(() => {
    return globalDataStore.register(subId, sub);
  }, [subId]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  return result || FALLBACK_GET;
}

// -----------------------------------------------------------------------------
// Mutation Utilities
// These don't need background subscriptions, but they do pull from DATA_CONFIG
// -----------------------------------------------------------------------------

export function useListSet<T = any>() {
  const setList = useUserListSet<T>();
  const sim = useSim();
  return (args: { key: string; itemId: string; value: T; [x: string]: any }) => {
    const baseConfig = DATA_CONFIG[args.key] || {};
    const next =
      sim.mode !== 'off'
        ? {
            ...args,
            key: simRecordKey(sim, args.key),
            itemId: simListItemId(sim, args.itemId) ?? args.itemId,
          }
        : args;
    return setList({ ...(baseConfig as any), ...next });
  };
}

export function useListRemove() {
  const removeItem = useUserListRemove();
  const sim = useSim();
  return (args: { key: string; itemId: string }) =>
    removeItem(
      sim.mode !== 'off'
        ? {
            key: simRecordKey(sim, args.key),
            itemId: simListItemId(sim, args.itemId) ?? args.itemId,
          }
        : args
    );
}

export function usePrivacySet() {
  const setVariablePrivacy = useUserVariablePrivacy();
  const setListPrivacy = useUserListPrivacy();
  const sim = useSim();
  return (args: { key: string; privacy: any }) => {
    // Under sim, variables live as list items at the prefixed key, so privacy
    // updates go to the sim list definition instead of a live variable.
    return sim.mode !== 'off'
      ? setListPrivacy({ key: simRecordKey(sim, args.key), privacy: args.privacy })
      : setVariablePrivacy(args);
  };
}

export function useListPrivacySet() {
  const setListPrivacy = useUserListPrivacy();
  const sim = useSim();
  return (args: { key: string; privacy: any }) =>
    setListPrivacy(sim.mode !== 'off' ? { ...args, key: simRecordKey(sim, args.key) } : args);
}
