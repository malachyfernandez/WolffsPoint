/**
 * sim/mockConvexReact.ts
 *
 * Drop-in replacement for `convex/react` and `convex/react-clerk` in the
 * perf-audit copy. Backed by sim/mockDb.ts — a reactive in-memory store.
 */

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { getFunctionName } from 'convex/server';
import { keyOf, mockDb } from './mockDb';
import { perfLog } from './perf/log';

export class ConvexReactClient {
  url?: string;
  constructor(url?: string) {
    this.url = url;
  }
  setAuth() {}
  clearAuth() {}
  close() { return Promise.resolve(); }
  query(_fn: any, args: any) {
    return Promise.resolve(mockDb.runQuery(getFunctionName(_fn), args));
  }
  mutation(_fn: any, args: any) {
    return Promise.resolve(mockDb.runMutation(getFunctionName(_fn), args));
  }
  action(_fn: any, args: any) {
    return mockDb.runAction(getFunctionName(_fn), args);
  }
  watchQuery(_fn: any, args: any) {
    const name = getFunctionName(_fn);
    const listeners = new Set<() => void>();
    return {
      onUpdate: (cb: () => void) => mockDb.subscribe(name, args, cb),
      localQueryResult: () => mockDb.getSnapshot(name, args),
      localQueryNow: () => mockDb.getSnapshot(name, args),
      journal: () => undefined,
      _listeners: listeners,
    };
  }
}

export const mockConvexClient = new ConvexReactClient('mock://sim');

export function ConvexProvider({ children }: { children: React.ReactNode; client?: any }) {
  return children as any;
}

export function ConvexProviderWithClerk({ children }: { children: React.ReactNode; client?: any; useAuth?: any }) {
  return children as any;
}

export function useConvex() {
  return mockConvexClient;
}

export function useConvexAuth() {
  return { isLoading: false, isAuthenticated: true };
}

export function useQuery(fnRef: any, args?: any) {
  const name = getFunctionName(fnRef);
  const argsRef = useRef<{ key: string; args: any } | null>(null);
  const serialized = JSON.stringify(args ?? {});
  if (!argsRef.current || argsRef.current.key !== serialized) {
    argsRef.current = { key: serialized, args };
  }

  const subscribe = useCallback(
    (onChange: () => void) => {
      const t0 = performance.now();
      const unsub = mockDb.subscribe(name, argsRef.current!.args, onChange);
      perfLog.logQuerySubscribe(name, t0);
      return unsub;
    },
    [name, argsRef.current?.key]
  );

  return useSyncExternalStore(
    subscribe,
    () => mockDb.getSnapshot(name, argsRef.current!.args),
    () => undefined
  );
}

type LocalStore = { getQuery: (f: any, a: any) => any; setQuery: (f: any, a: any, v: any) => void };

/**
 * Facade over mockDb that Convex's withOptimisticUpdate callbacks write
 * through. Since our "server" is synchronous, a setQuery writes straight
 * into the table row the query reads.
 */
const localStore: LocalStore = {
  getQuery(fnRef, args) {
    return mockDb.runQuery(getFunctionName(fnRef), args);
  },
  setQuery(fnRef, args, value) {
    const name = getFunctionName(fnRef);
    if (name === 'user_vars:get') {
      const k = `${mockDb.viewerUserId}${args.key}`;
      const existing = mockDb.vars.get(k) ?? {
        _id: `sim_${Math.random().toString(36).slice(2)}`,
        key: args.key,
        userToken: mockDb.viewerUserId,
        createdAt: Date.now(),
        privacy: 'PRIVATE',
      };
      mockDb.vars.set(k, { ...existing, ...value });
    } else if (name === 'user_lists:get') {
      const k = `${mockDb.viewerUserId}${args.key}${args.itemId}`;
      const existing = mockDb.listItems.get(k) ?? {
        _id: `sim_${Math.random().toString(36).slice(2)}`,
        key: args.key,
        itemId: args.itemId,
        userToken: mockDb.viewerUserId,
        createdAt: Date.now(),
      };
      mockDb.listItems.set(k, { ...existing, ...value });
    } else if (name === 'globals:get') {
      mockDb.globals.set(args.key, value);
    } else if (name === 'scheduled_updates:getPendingTarget') {
      const t = args.target;
      const k = `${mockDb.viewerUserId}${t.targetType}${t.key}${t.itemId ?? ''}`;
      mockDb.schedTargets.set(k, { _id: k, ...value });
    }
  },
};

export interface MockMutationFn {
  (args?: any): Promise<any>;
  withOptimisticUpdate(
    optimisticUpdate: (ls: LocalStore, args: any) => void
  ): (args: any) => Promise<any>;
}

// append the write key so reports show WHICH var/list each mutation hits —
// this makes the mount-time write storm readable
const labelArgs = (name: string, args: any) => {
  const key = typeof args?.key === 'string' ? args.key : null;
  const itemId = typeof args?.itemId === 'string' ? args.itemId : null;
  return key ? `${name}[${itemId ? `${key}:${itemId}` : key}]` : name;
};

export function useMutation(fnRef: any): MockMutationFn {
  const name = getFunctionName(fnRef);
  const run = (args: any) => {
    const t0 = performance.now();
    const result = mockDb.runMutation(name, args);
    perfLog.logMutation(labelArgs(name, args), performance.now() - t0);
    return Promise.resolve(result);
  };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const fn = useCallback(run, [name]) as MockMutationFn;
  fn.withOptimisticUpdate = (optimisticUpdate: (ls: LocalStore, args: any) => void) => {
    return (args: any) => {
      const t0 = performance.now();
      try {
        optimisticUpdate(localStore, args);
      } catch {
        // optimistic update is best-effort in the mock
      }
      const result = mockDb.runMutation(name, args);
      perfLog.logMutation(labelArgs(name, args), performance.now() - t0);
      return Promise.resolve(result);
    };
  };
  return fn;
}

export function useAction(fnRef: any) {
  const name = getFunctionName(fnRef);
  return useCallback((args: any) => mockDb.runAction(name, args), [name]);
}

export function usePaginatedQuery(fnRef: any, options: any, args: any) {
  const name = getFunctionName(fnRef);
  const results = useSyncExternalStore(
    (cb) => mockDb.subscribe(`${name}:paginated`, args ?? {}, cb),
    () => mockDb.getSnapshot(`${name}:paginated`, args ?? {}),
    () => undefined
  );
  return {
    results: results ?? [],
    status: 'Exhausted',
    isLoading: results === undefined,
    loadMore: () => {},
  };
}
