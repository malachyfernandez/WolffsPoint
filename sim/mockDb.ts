/**
 * sim/mockDb.ts
 *
 * In-memory re-implementation of the WolffsPoint Convex backend.
 * Only exists in the perf-audit copy — replaces the real network backend
 * so the app runs with no auth, no network, and deterministic dummy data.
 *
 * Semantics intentionally mirror convex/user_vars.ts, user_vars_get.ts,
 * user_lists.ts, user_lists_get.ts, globals.ts and scheduled_updates.ts.
 */

export type PrimitiveIndexValue = string | number | boolean;
export type Privacy = 'PUBLIC' | 'PRIVATE' | { allowList: string[] };
type AccessScope = 'PUBLIC' | 'PRIVATE' | 'SHARED';

type Doc = Record<string, any> & { _id: string };

const SEP = '';
export const keyOf = (...parts: (string | undefined)[]) => parts.join(SEP);

let idCounter = 0;
const nextId = () => `sim_${++idCounter}`;

// ---------------------------------------------------------------------------
// Derived-field helpers (mirrors convex/user_vars.ts)
// ---------------------------------------------------------------------------

const DEFAULT_SORT_KEY = 'PROPERTY_LAST_MODIFIED';

function isPrimitiveIndexValue(value: unknown): value is PrimitiveIndexValue {
  return (
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  );
}

function normalizePropertyRef(reference: string) {
  return reference.trim().toUpperCase();
}

function shouldIgnoreSelfReference(reference: string, kind: 'filter' | 'search' | 'sort') {
  const normalized = normalizePropertyRef(reference);
  if (kind === 'filter') {
    return normalized === 'PROPERTY_FILTER_KEY' || normalized === 'PROPERTY_FILTER_VALUE';
  }
  if (kind === 'search') {
    return normalized === 'PROPERTY_SEARCH_KEYS' || normalized === 'PROPERTY_SEARCH_VALUE';
  }
  return normalized === 'PROPERTY_SORT_KEY' || normalized === 'PROPERTY_SORT_VALUE';
}

function getPropertyValue(context: any, reference: string) {
  const normalized = normalizePropertyRef(reference);
  switch (normalized) {
    case 'PROPERTY_ID':
    case 'PROPERTY__ID':
      return context.id ?? context._id;
    case 'PROPERTY_ITEMID':
      return context.itemId;
    case 'PROPERTY_CREATED_AT':
    case 'PROPERTY_TIME_CREATED':
      return context.createdAt;
    case 'PROPERTY_FILTER_KEY':
      return context.filterKey;
    case 'PROPERTY_FILTER_VALUE':
      return context.filterValue;
    case 'PROPERTY_KEY':
      return context.key;
    case 'PROPERTY_LAST_MODIFIED':
      return context.lastModified;
    case 'PROPERTY_PRIVACY':
      return context.privacy;
    case 'PROPERTY_SEARCH_KEYS':
      return context.searchKeys;
    case 'PROPERTY_SEARCH_VALUE':
      return context.searchValue;
    case 'PROPERTY_SORT_KEY':
      return context.sortKey;
    case 'PROPERTY_SORT_VALUE':
      return context.sortValue;
    case 'PROPERTY_USER_TOKEN':
      return context.userToken;
    case 'PROPERTY_VALUE':
      return context.value;
    default:
      return undefined;
  }
}

function resolveConfiguredValue(
  reference: string,
  context: any,
  kind: 'filter' | 'search' | 'sort'
) {
  if (!reference || !reference.trim()) return undefined;
  if (shouldIgnoreSelfReference(reference, kind)) return undefined;
  const normalized = normalizePropertyRef(reference);
  if (normalized.startsWith('PROPERTY_')) return getPropertyValue(context, normalized);
  return context.value?.[reference];
}

function buildFilterValue(context: any) {
  if (!context.filterKey) return undefined;
  const resolved = resolveConfiguredValue(context.filterKey, context, 'filter');
  return isPrimitiveIndexValue(resolved) ? resolved : undefined;
}

function buildSearchValue(context: any) {
  if (!context.searchKeys || context.searchKeys.length === 0) return undefined;
  const parts: string[] = [];
  for (const key of context.searchKeys) {
    const resolved = resolveConfiguredValue(key, context, 'search');
    if (typeof resolved === 'string') {
      const trimmed = resolved.trim();
      if (trimmed) parts.push(trimmed);
      continue;
    }
    if (typeof resolved === 'number' || typeof resolved === 'boolean') {
      parts.push(String(resolved));
    }
  }
  const finalValue = parts.join(' ').trim();
  return finalValue.length > 0 ? finalValue : undefined;
}

function buildSortValue(context: any) {
  if (!context.sortKey) return undefined;
  const resolved = resolveConfiguredValue(context.sortKey, context, 'sort');
  return isPrimitiveIndexValue(resolved) ? resolved : undefined;
}

function privacyToAccessScope(privacy: Privacy): AccessScope {
  if (privacy === 'PUBLIC') return 'PUBLIC';
  if (privacy === 'PRIVATE') return 'PRIVATE';
  return 'SHARED';
}

function normalizePrivacy(privacy: Privacy): Privacy {
  if (privacy === 'PUBLIC' || privacy === 'PRIVATE') return privacy;
  const unique = Array.from(new Set(privacy.allowList.map((x) => x.trim()).filter(Boolean)));
  return { allowList: unique };
}

// ---------------------------------------------------------------------------
// Search-helpers (mirrors user_vars_get.ts / user_lists_get.ts)
// ---------------------------------------------------------------------------

function normalizeSearch(searchFor?: string) {
  const trimmed = searchFor?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}

function matchesFilter(doc: any, filterFor?: PrimitiveIndexValue) {
  if (filterFor === undefined) return true;
  return doc.filterValue === filterFor;
}

function matchesSearch(doc: any, searchFor?: string) {
  const normalized = normalizeSearch(searchFor);
  if (!normalized) return true;
  const haystack = String(doc.searchValue ?? '').toLowerCase();
  return haystack.includes(normalized);
}

function comparePrimitiveDesc(a: any, b: any) {
  const aMissing = a === undefined || a === null;
  const bMissing = b === undefined || b === null;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  if (typeof a === 'number' && typeof b === 'number') return b - a;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(b) - Number(a);
  return String(b).localeCompare(String(a));
}

function compareDocs(a: any, b: any) {
  const sortCompare = comparePrimitiveDesc(a.sortValue, b.sortValue);
  if (sortCompare !== 0) return sortCompare;
  return (b.lastModified ?? 0) - (a.lastModified ?? 0);
}

function applyStartAfter<T extends { _id: any }>(records: T[], startAfter?: string) {
  if (!startAfter) return records;
  const index = records.findIndex((record) => String(record._id) === startAfter);
  if (index === -1) return records;
  return records.slice(index + 1);
}

const shapeRecord = (record: any) => (record ? { ...record, id: record._id } : record);

const shapeListRecord = (record: any, definition: any) => ({
  ...record,
  id: record._id,
  privacy: definition?.privacy,
  filterKey: definition?.filterKey,
  searchKeys: definition?.searchKeys,
  sortKey: definition?.sortKey,
});

// ---------------------------------------------------------------------------
// Stable stringify for result equality (cheap deepEqual)
// ---------------------------------------------------------------------------

export function stableStringify(value: any): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, val) => {
    if (typeof val === 'function') return undefined;
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
      if (!Array.isArray(val)) {
        const sorted: Record<string, any> = {};
        for (const k of Object.keys(val).sort()) sorted[k] = val[k];
        return sorted;
      }
    }
    return val;
  });
}

// ---------------------------------------------------------------------------
// MockDb
// ---------------------------------------------------------------------------

type QueryEntry = {
  name: string;
  args: any;
  listeners: Set<() => void>;
  result: any;
  computed: boolean;
};

export class MockDb {
  viewerUserId: string = 'user_sim_operator';

  vars = new Map<string, Doc>();
  listDefs = new Map<string, Doc>();
  listItems = new Map<string, Doc>();
  varPermissions = new Set<string>(); // `${varId}|${userId}`
  listPermissions = new Set<string>(); // `${defId}|${userId}`
  globals = new Map<string, any>();
  schedTargets = new Map<string, Doc>();
  schedBatches = new Map<string, Doc>();

  private activeQueries = new Map<string, QueryEntry>();
  private pendingFlush = false;
  private pendingInitial = new Set<string>();

  /** Simulated network latency for query delivery (ms). */
  queryLatencyMs = 20;

  // Counters surfaced in the perf report
  stats = {
    queriesRun: 0,
    mutationsRun: 0,
    actionCalls: 0,
    lastRevalidateMs: 0,
    lastRevalidateQueries: 0,
    mutationLog: [] as { name: string; ms: number; at: number }[],
    queryLog: [] as { name: string; ms: number; at: number }[],
  };

  resetStats() {
    this.stats.queriesRun = 0;
    this.stats.mutationsRun = 0;
    this.stats.actionCalls = 0;
    this.stats.mutationLog = [];
    this.stats.queryLog = [];
  }

  // ----- subscription machinery ---------------------------------------------

  private queryKey(name: string, args: any) {
    return name + SEP + stableStringify(args ?? {});
  }

  subscribe(name: string, args: any, listener: () => void) {
    const qk = this.queryKey(name, args);
    let entry = this.activeQueries.get(qk);
    if (!entry) {
      entry = { name, args, listeners: new Set(), result: undefined, computed: false };
      this.activeQueries.set(qk, entry);
      this.pendingInitial.add(qk);
      // Async delivery mimics the network round-trip
      setTimeout(() => {
        const e = this.activeQueries.get(qk);
        if (!e || e.computed) return;
        e.result = this.runQuery(e.name, e.args);
        e.computed = true;
        e.listeners.forEach((fn) => fn());
      }, this.queryLatencyMs);
    }
    entry.listeners.add(listener);
    return () => {
      const e = this.activeQueries.get(qk);
      if (!e) return;
      e.listeners.delete(listener);
      if (e.listeners.size === 0) this.activeQueries.delete(qk);
    };
  }

  getSnapshot(name: string, args: any) {
    const entry = this.activeQueries.get(this.queryKey(name, args));
    if (!entry || !entry.computed) return undefined;
    return entry.result;
  }

  getActiveQueryCount() {
    return this.activeQueries.size;
  }

  /** Re-run every active query; notify listeners whose result changed. */
  private revalidate() {
    const t0 = performance.now();
    let changed = 0;
    for (const entry of this.activeQueries.values()) {
      const next = this.runQuery(entry.name, entry.args);
      if (stableStringify(next) !== stableStringify(entry.result)) {
        entry.result = next;
        changed++;
        entry.listeners.forEach((fn) => fn());
      }
    }
    this.stats.lastRevalidateMs = performance.now() - t0;
    this.stats.lastRevalidateQueries = this.activeQueries.size;
    this.pendingFlush = false;
  }

  private scheduleRevalidate() {
    if (this.pendingFlush) return;
    this.pendingFlush = true;
    // Mutations resolve in a microtask-ish window, mirroring the realtime push.
    setTimeout(() => this.revalidate(), this.queryLatencyMs);
  }

  // ----- function dispatch ----------------------------------------------------

  runQuery(name: string, args: any): any {
    const t0 = performance.now();
    const result = this.dispatch(name, args);
    const ms = performance.now() - t0;
    this.stats.queriesRun++;
    this.stats.queryLog.push({ name, ms, at: t0 });
    if (this.stats.queryLog.length > 5000) this.stats.queryLog.shift();
    return result;
  }

  runMutation(name: string, args: any): any {
    const t0 = performance.now();
    const result = this.dispatch(name, args);
    const ms = performance.now() - t0;
    this.stats.mutationsRun++;
    // include the write key so reports show WHICH var/list each write hits —
    // this is what makes the mount-time write storm readable
    const key = typeof args?.key === 'string' ? args.key : null;
    const itemId = typeof args?.itemId === 'string' ? args.itemId : null;
    const label = key ? `${name}[${itemId ? `${key}:${itemId}` : key}]` : name;
    this.stats.mutationLog.push({ name: label, ms, at: t0 });
    if (this.stats.mutationLog.length > 5000) this.stats.mutationLog.shift();
    this.scheduleRevalidate();
    return result;
  }

  runAction(name: string, args: any): Promise<any> {
    this.stats.actionCalls++;
    if (name === 'uploadthing:generatePublicImageUploadUrl') {
      return Promise.resolve({ url: 'about:blank#sim-upload', key: 'sim-key' });
    }
    if (name === 'mathAi:convertMathImageToMarkdown') {
      return Promise.resolve({ markdown: '_(simulated AI markdown)_' });
    }
    return Promise.resolve(null);
  }

  // ----- access --------------------------------------------------------------

  private canViewVar(doc: Doc | undefined) {
    if (!doc) return false;
    if (doc.userToken === this.viewerUserId) return true;
    if (doc.privacy === 'PUBLIC') return true;
    if (this.varPermissions.has(keyOf(doc._id, this.viewerUserId))) return true;
    return false;
  }

  private canViewDef(def: Doc | undefined) {
    if (!def) return false;
    if (def.userToken === this.viewerUserId) return true;
    if (def.privacy === 'PUBLIC') return true;
    if (this.listPermissions.has(keyOf(def._id, this.viewerUserId))) return true;
    return false;
  }

  private allVarDocs() {
    return Array.from(this.vars.values());
  }

  private allListItems() {
    return Array.from(this.listItems.values());
  }

  private defForItem(item: Doc) {
    return this.listDefs.get(keyOf(item.userToken, item.key));
  }

  // ----- dispatcher ------------------------------------------------------------

  private dispatch(name: string, args: any): any {
    switch (name) {
      // ---- user_vars
      case 'user_vars:get': {
        const doc = this.vars.get(keyOf(this.viewerUserId, args.key));
        return shapeRecord(doc) ?? null;
      }
      case 'user_vars:set':
        return this.varSet(args);
      case 'user_vars:updatePrivacy': {
        const doc = this.vars.get(keyOf(this.viewerUserId, args.key));
        if (doc) {
          doc.privacy = args.privacy;
          doc.lastModified = Date.now();
        }
        return null;
      }
      case 'user_vars:length': {
        return this.allVarDocs().filter(
          (d) => d.key === args.key && matchesFilter(d, args.filterFor) && this.canViewVar(d)
        ).length;
      }
      case 'user_vars_get:search':
        return this.varSearch(args);

      // ---- user_lists
      case 'user_lists:get': {
        const item = this.listItems.get(keyOf(this.viewerUserId, args.key, args.itemId));
        if (!item) return null;
        return shapeListRecord(item, this.defForItem(item));
      }
      case 'user_lists:set':
        return this.listSet(args);
      case 'user_lists:remove': {
        this.listItems.delete(keyOf(this.viewerUserId, args.key, args.itemId));
        return null;
      }
      case 'user_lists:updatePrivacy': {
        const def = this.listDefs.get(keyOf(this.viewerUserId, args.key));
        if (def) {
          def.privacy = args.privacy;
          def.lastModified = Date.now();
          const scope = privacyToAccessScope(args.privacy);
          for (const item of this.listItems.values()) {
            if (item.definitionId === def._id) {
              item.accessScope = scope;
              item.lastModified = Date.now();
            }
          }
        }
        return null;
      }
      case 'user_lists:length': {
        return this.allListItems().filter(
          (i) =>
            i.key === args.key &&
            matchesFilter(i, args.filterFor) &&
            (args.itemId === undefined || i.itemId === args.itemId) &&
            this.canViewDef(this.defForItem(i))
        ).length;
      }
      case 'user_lists:lengthSharedItemIdWarning':
        return false;
      case 'user_lists_get:search':
        return this.listSearch(args);

      // ---- globals
      case 'globals:get':
        return this.globals.get(args.key) ?? null;
      case 'globals:set':
        this.globals.set(args.key, args.value);
        return null;

      // ---- scheduled_updates
      case 'scheduled_updates:getPendingTarget': {
        const t = args.target;
        const row = this.schedTargets.get(
          keyOf(this.viewerUserId, t.targetType, t.key, t.itemId ?? '')
        );
        return row ?? null;
      }
      case 'scheduled_updates:stageTarget': {
        const t = args.target;
        const rowKey = keyOf(this.viewerUserId, t.targetType, t.key, t.itemId ?? '');
        const existing = this.schedTargets.get(rowKey);
        const row = {
          ...(existing ?? {}),
          _id: existing?._id ?? nextId(),
          ownerUserToken: this.viewerUserId,
          targetType: t.targetType,
          key: t.key,
          itemId: t.targetType === 'list' ? t.itemId : undefined,
          encodedValue: args.encodedValue,
          batchId: args.batchId,
          scheduledTime:
            existing && existing.batchId === args.batchId ? existing.scheduledTime : undefined,
          updatedAt: Date.now(),
        };
        this.schedTargets.set(rowKey, row);
        const batchKey = keyOf(this.viewerUserId, args.batchId);
        if (!this.schedBatches.has(batchKey)) {
          this.schedBatches.set(batchKey, {
            _id: nextId(),
            ownerUserToken: this.viewerUserId,
            batchId: args.batchId,
            state: 'staged',
            scheduledTime: undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        return row._id;
      }
      case 'scheduled_updates:scheduleBatch': {
        const batchKey = keyOf(this.viewerUserId, args.batchId);
        const batch = this.schedBatches.get(batchKey);
        if (batch) {
          batch.state = 'scheduled';
          batch.scheduledTime = args.scheduledTime;
          batch.updatedAt = Date.now();
        }
        for (const t of this.schedTargets.values()) {
          if (t.ownerUserToken === this.viewerUserId && t.batchId === args.batchId) {
            t.scheduledTime = args.scheduledTime;
          }
        }
        return null;
      }
      case 'scheduled_updates:publishBatchNow': {
        const targets = Array.from(this.schedTargets.values()).filter(
          (t) => t.ownerUserToken === this.viewerUserId && t.batchId === args.batchId
        );
        for (const t of targets) {
          if (t.targetType === 'variable') {
            this.varSet({ key: t.key, value: t.encodedValue });
          } else {
            this.listSet({ key: t.key, itemId: t.itemId, value: t.encodedValue });
          }
          this.schedTargets.delete(
            keyOf(this.viewerUserId, t.targetType, t.key, t.itemId ?? '')
          );
        }
        this.schedBatches.delete(keyOf(this.viewerUserId, args.batchId));
        return null;
      }
      case 'scheduled_updates:cancelBatch': {
        for (const [k, t] of Array.from(this.schedTargets.entries())) {
          if (t.ownerUserToken === this.viewerUserId && t.batchId === args.batchId) {
            this.schedTargets.delete(k);
          }
        }
        this.schedBatches.delete(keyOf(this.viewerUserId, args.batchId));
        return null;
      }
      case 'scheduled_updates:getBatchState': {
        const batch = this.schedBatches.get(keyOf(this.viewerUserId, args.batchId));
        const targetCount = Array.from(this.schedTargets.values()).filter(
          (t) => t.ownerUserToken === this.viewerUserId && t.batchId === args.batchId
        ).length;
        if (!batch) return null;
        return {
          batchId: batch.batchId,
          state: batch.state,
          scheduledTime: batch.scheduledTime ?? null,
          targetCount,
        };
      }

      // ---- dev utils
      case 'devUtils:getTableCounts':
        return {
          user_vars: this.vars.size,
          user_lists: this.listItems.size,
          user_list_definitions: this.listDefs.size,
          globals: this.globals.size,
        };
      case 'devUtils:nukeAllTables':
        return null;

      default:
        return null;
    }
  }

  // ----- mutation bodies -------------------------------------------------------

  private varSet(args: any) {
    const rowKey = keyOf(this.viewerUserId, args.key);
    const existing = this.vars.get(rowKey);
    const now = Date.now();

    const base = existing ?? {
      _id: nextId(),
      key: args.key,
      userToken: this.viewerUserId,
      createdAt: now,
      privacy: 'PRIVATE',
    };

    const overwriteConfig = args.overwriteStoredConfig ?? true;
    const overwritePrivacy = args.overwriteStoredPrivacy ?? false;

    const context = {
      ...base,
      value: args.value,
      lastModified: now,
      filterKey: overwriteConfig || !base.filterKey ? args.filterKey ?? base.filterKey : base.filterKey,
      searchKeys:
        overwriteConfig || !base.searchKeys ? args.searchKeys ?? base.searchKeys : base.searchKeys,
      sortKey:
        overwriteConfig || !base.sortKey
          ? args.sortKey ?? base.sortKey ?? DEFAULT_SORT_KEY
          : base.sortKey,
    };

    const doc: Doc = {
      ...base,
      value: args.value,
      privacy:
        args.privacy !== undefined && (overwritePrivacy || !existing)
          ? normalizePrivacy(args.privacy)
          : base.privacy,
      filterKey: context.filterKey,
      searchKeys: context.searchKeys,
      sortKey: context.sortKey,
      filterValue: buildFilterValue(context),
      searchValue: buildSearchValue(context),
      sortValue: buildSortValue(context),
      lastModified: now,
      createdAt: base.createdAt,
    };

    this.vars.set(rowKey, doc);

    if (doc.privacy && typeof doc.privacy === 'object') {
      for (const uid of doc.privacy.allowList) {
        this.varPermissions.add(keyOf(doc._id, uid));
      }
    }
    return doc._id;
  }

  private ensureListDef(key: string, config: { privacy?: Privacy; filterKey?: string; searchKeys?: string[]; sortKey?: string }) {
    const defKey = keyOf(this.viewerUserId, key);
    let def = this.listDefs.get(defKey);
    const now = Date.now();
    if (!def) {
      def = {
        _id: nextId(),
        userToken: this.viewerUserId,
        key,
        privacy: config.privacy !== undefined ? normalizePrivacy(config.privacy) : 'PRIVATE',
        filterKey: config.filterKey,
        searchKeys: config.searchKeys,
        sortKey: config.sortKey ?? DEFAULT_SORT_KEY,
        lastModified: now,
        createdAt: now,
      };
      this.listDefs.set(defKey, def);
    } else {
      if (config.privacy !== undefined && false) {
        // overwriteStoredPrivacy default false — sticky
      }
      if (config.filterKey !== undefined) def.filterKey = config.filterKey;
      if (config.searchKeys !== undefined) def.searchKeys = config.searchKeys;
      if (config.sortKey !== undefined) def.sortKey = config.sortKey;
      def.lastModified = now;
    }
    if (def.privacy && typeof def.privacy === 'object') {
      for (const uid of def.privacy.allowList) {
        this.listPermissions.add(keyOf(def._id, uid));
      }
    }
    return def;
  }

  private listSet(args: any) {
    const def = this.ensureListDef(args.key, {
      privacy: args.privacy,
      filterKey: args.overwriteStoredConfig === false ? undefined : args.filterKey,
      searchKeys: args.overwriteStoredConfig === false ? undefined : args.searchKeys,
      sortKey: args.overwriteStoredConfig === false ? undefined : args.sortKey,
    });

    const rowKey = keyOf(this.viewerUserId, args.key, args.itemId);
    const existing = this.listItems.get(rowKey);
    const now = Date.now();

    const context = {
      ...existing,
      id: existing?._id,
      key: args.key,
      itemId: args.itemId,
      userToken: this.viewerUserId,
      value: args.value,
      privacy: def.privacy,
      filterKey: def.filterKey,
      searchKeys: def.searchKeys,
      sortKey: def.sortKey,
      lastModified: now,
      createdAt: existing?.createdAt ?? now,
    };

    const doc: Doc = {
      _id: existing?._id ?? nextId(),
      definitionId: def._id,
      key: args.key,
      itemId: args.itemId,
      userToken: this.viewerUserId,
      value: args.value,
      accessScope: privacyToAccessScope(def.privacy),
      filterValue: buildFilterValue(context),
      searchValue: buildSearchValue(context),
      sortValue: buildSortValue(context),
      lastModified: now,
      createdAt: context.createdAt,
    };

    this.listItems.set(rowKey, doc);
    return doc._id;
  }

  // ----- searches --------------------------------------------------------------

  private varSearch(args: any) {
    const limit = Math.max(1, Math.min(args.returnTop ?? 10, 200));
    const resultMap = new Map<string, Doc>();
    const viewer = this.viewerUserId;

    const addIfEligible = (doc: Doc | undefined) => {
      if (!doc) return;
      if (doc.key !== args.key) return;
      if (!matchesFilter(doc, args.filterFor)) return;
      if (!matchesSearch(doc, args.searchFor)) return;
      resultMap.set(String(doc._id), doc);
    };

    const requestedUserIds =
      args.userIds !== undefined ? (Array.from(new Set(args.userIds)) as string[]) : undefined;
    if (requestedUserIds && requestedUserIds.length === 0) return [];

    if (requestedUserIds && requestedUserIds.length > 0) {
      for (const userId of requestedUserIds) {
        const doc = this.vars.get(keyOf(userId, args.key));
        if (doc && this.canViewVar(doc)) addIfEligible(doc);
      }
      const sorted = Array.from(resultMap.values()).sort(compareDocs);
      return applyStartAfter(sorted, args.startAfter).slice(0, limit).map(shapeRecord);
    }

    // public + own
    for (const doc of this.allVarDocs()) {
      if (doc.key !== args.key) continue;
      if (doc.userToken === viewer || doc.privacy === 'PUBLIC') {
        addIfEligible(doc);
      } else if (this.varPermissions.has(keyOf(doc._id, viewer))) {
        addIfEligible(doc);
      }
    }

    const sorted = Array.from(resultMap.values()).sort(compareDocs);
    return applyStartAfter(sorted, args.startAfter).slice(0, limit).map(shapeRecord);
  }

  private listSearch(args: any) {
    const limit = Math.max(1, Math.min(args.returnTop ?? 10, 200));
    const resultMap = new Map<string, { doc: Doc; def: Doc }>();
    const viewer = this.viewerUserId;

    const addIfEligible = (doc: Doc | undefined) => {
      if (!doc) return;
      const def = this.defForItem(doc);
      if (!def || !this.canViewDef(def)) return;
      if (doc.key !== args.key) return;
      if (args.itemId && doc.itemId !== args.itemId) return;
      if (!matchesFilter(doc, args.filterFor)) return;
      if (!matchesSearch(doc, args.searchFor)) return;
      resultMap.set(String(doc._id), { doc, def });
    };

    const requestedUserIds =
      args.userIds !== undefined ? (Array.from(new Set(args.userIds)) as string[]) : undefined;
    if (requestedUserIds && requestedUserIds.length === 0) return [];

    if (requestedUserIds && requestedUserIds.length > 0) {
      for (const userId of requestedUserIds) {
        for (const item of this.allListItems()) {
          if (item.userToken !== userId || item.key !== args.key) continue;
          addIfEligible(item);
        }
      }
    } else {
      for (const item of this.allListItems()) {
        addIfEligible(item);
      }
    }

    const sorted = Array.from(resultMap.values()).sort((a, b) => compareDocs(a.doc, b.doc));
    const paged = applyStartAfter(
      sorted.map((e) => e.doc),
      args.startAfter
    );
    return paged
      .slice(0, limit)
      .map((doc) => shapeListRecord(doc, this.defForItem(doc)));
  }

  // ----- seeding API -----------------------------------------------------------

  /** Directly insert a variable owned by an arbitrary user (used by seed). */
  seedVar(userToken: string, key: string, value: any, config: Partial<Doc> = {}) {
    const saved = this.viewerUserId;
    this.viewerUserId = userToken;
    try {
      this.varSet({
        key,
        value,
        privacy: config.privacy ?? 'PUBLIC',
        filterKey: config.filterKey,
        searchKeys: config.searchKeys,
        sortKey: config.sortKey,
      });
      const doc = this.vars.get(keyOf(userToken, key))!;
      if (config.filterValue !== undefined) doc.filterValue = config.filterValue;
      if (config.searchValue !== undefined) doc.searchValue = config.searchValue;
      if (config.sortValue !== undefined) doc.sortValue = config.sortValue;
      if (config.createdAt !== undefined) doc.createdAt = config.createdAt;
      if (config.lastModified !== undefined) doc.lastModified = config.lastModified;
    } finally {
      this.viewerUserId = saved;
    }
  }

  /** Directly insert a list item owned by an arbitrary user (used by seed). */
  seedListItem(
    userToken: string,
    key: string,
    itemId: string,
    value: any,
    config: Partial<Doc> = {}
  ) {
    const saved = this.viewerUserId;
    this.viewerUserId = userToken;
    try {
      this.listSet({
        key,
        itemId,
        value,
        privacy: config.privacy ?? 'PUBLIC',
        filterKey: config.filterKey,
        searchKeys: config.searchKeys,
        sortKey: config.sortKey,
      });
      const item = this.listItems.get(keyOf(userToken, key, itemId))!;
      if (config.filterValue !== undefined) item.filterValue = config.filterValue;
      if (config.searchValue !== undefined) item.searchValue = config.searchValue;
      if (config.sortValue !== undefined) item.sortValue = config.sortValue;
      if (config.createdAt !== undefined) item.createdAt = config.createdAt;
      if (config.lastModified !== undefined) item.lastModified = config.lastModified;
    } finally {
      this.viewerUserId = saved;
    }
  }
}

export const mockDb = new MockDb();
// debug handle for probes — lets scripts inspect query/mutation logs directly
if (typeof window !== 'undefined') (window as any).__simDb = mockDb;
