# Context on Current Session: Optimizing Convex Subscriptions via DataProvider

## Overview of the Problem
The `OperatorGamePage` contains many tabs (Players, Config, Nightly, Town Square, Newspaper, Rulebook), along with numerous deeply nested UI components and Dialogs. Previously, switching between these tabs or opening dialogs caused React to unmount and remount components. This resulted in extreme "subscription churn" where Convex `useQuery` hooks would aggressively unsubscribe and resubscribe to the backend, causing UI flickering and excessive network/database reads.

To solve this, we implemented a centralized `DataProvider` architecture using React's `useSyncExternalStore`. All data fetching primitives in `hooks/useData.ts` (e.g., `useList`, `useSharedListValue`, `useFindListItems`) now register their queries with the `DataProvider` global store. The store keeps Convex subscriptions alive even when individual UI components unmount, effectively caching the data across tab switches and dialog toggles.

## The "Cache Miss" Investigation
During the migration of the `Newspaper` components within the Operator view, we noticed that Convex network queries were still appearing in the Convex Dashboard when switching between "Days". 

We instrumented both the frontend primitive hooks and the backend Convex handlers (`convex/user_lists_get.ts`) with verbose `console.log` statements to track the exact query arguments that were bypassing the cache.

**The Breakthrough:** We discovered that the frontend cache was actually working perfectly! The network query appearing in the dashboard (`user_lists_get:search` for `key=selectedDayIndex`) was not the frontend dropping the cache. Instead, when the Operator clicks to switch a day, the frontend fires a mutation (`user_lists:set`) to update the `selectedDayIndex`. Convex's reactive backend automatically detects this database change and *re-evaluates the active subscription on the server*, pushing the new value down the existing WebSocket. 

**Key Takeaway:** Do not confuse Convex server-side reactive re-evaluations (which log in the dashboard when the underlying data mutates) with frontend cache misses.

## Crucial Guidelines for Future Development

When working on any part of the Operator page, Player page, or nested Dialog components, you must adhere to the following rules to maintain the integrity of the `DataProvider` cache:

### 1. Stable Query Arguments are Mandatory
The `DataProvider` caches subscriptions using a `subId`, which is a JSON-stringified representation of the query arguments (`key`, `itemId`, `userIds`, etc.). 
* **NEVER** use dynamic fallback arrays that flip during a component's lifecycle. 
* **Bad Example:** `userIds: isLoading ? [''] : ['real-user-id']`
  * *Why it's bad:* This creates two entirely separate subscriptions in the cache. The first one fires a network request for `['']`, then a split-second later, the component re-renders and fires a *second* network request for `['real-user-id']`.
* **Good Example:** If data isn't ready, either return early, use `undefined`, or ensure the parent component delays rendering until the ID is known.

### 2. Dialogs and Modals
Dialogs (like `UserEditDialog`, `JoinedGameOptionsDialog`, etc.) are frequently mounted and unmounted by the user. 
* Under the old pattern, opening a dialog would trigger an expensive network hit. 
* Under the new pattern, you can freely use `useList` or `useFindListItems` inside dialogs. Because of the `DataProvider`, as long as the parent page is keeping the cache alive (or the cache hasn't hit its eviction threshold), the dialog will load instantly from memory without hitting the Convex backend.

### 3. Debugging Network Requests
If you suspect a cache miss is occurring:
1. Check the browser console for `[useFindListItems] Registering...` or `[useList] Registering...` logs.
2. If a component mounts and you see a registration for a `subId` that *should* already be cached, look at the JSON string. Usually, a deeply nested object or array reference is changing, or a loading state is altering the query arguments.
3. Check the Convex backend logs. If you see queries firing, check if they immediately follow a mutation. If they do, it's just Convex's reactive engine doing its job.
