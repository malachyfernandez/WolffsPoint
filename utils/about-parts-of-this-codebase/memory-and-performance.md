# Adaptive Memory & Navigation Performance

This document covers the memory-culling and tab-lifecycle system added to keep
the app alive on memory-constrained devices (old iPhones in particular, where
iOS Safari's Jetsam kills tabs around ~200–400MB with no warning).

## Why

iOS Safari exposes **no** memory APIs (`deviceMemory` is blocked for
anti-fingerprinting). A tab that grows too large is killed instantly —
backgrounded tabs are culled first, and the foreground tab gets
"This webpage was reloaded because a problem occurred." So we infer device
capability from the signals Safari *does* expose, and proactively shrink our
resident footprint when pressure is high or the page is backgrounded.

## Pieces

### `utils/memoryTier.ts`

- `DeviceTier` — `high | medium | low`, detected once from:
  `navigator.deviceMemory` (Chromium only), `navigator.hardwareConcurrency`,
  iOS UA + OS version, and `document.wasDiscarded` (a previously-killed tab
  permanently downgrades the tier).
  - iOS: ≤4 cores or iOS <15 → `low`; ≤6 cores or iOS <17 → `medium`.
- `MemoryPressure` — `none | elevated | high | critical`.
- `MemoryPolicy` — per (tier, pressure): `maxHiddenTabs`, `tabEvictDelayMs`,
  `keepMinimizedSnapshots`.
- `readHeapPressure()` — Chrome `performance.memory` ratio → pressure, or
  `null` where unsupported (Safari/Firefox).

### `contexts/MemoryPressureContext.tsx`

- `MemoryPressureProvider` (mounted in `app/_layout.tsx`) computes tier,
  polls heap on a 5s interval where supported, and **escalates to `high`
  while the page is hidden/backgrounded** (`visibilitychange`, `pagehide`,
  `freeze`) — being small while backgrounded is what prevents iOS Jetsam
  kills. Background pressure lifts instantly on return.
- `MemoryScope` labels a subtree (one per tab pane); minimized dialogs record
  their host scope so eviction can be made safe.
- Pin registry: `MinimizeProvider` registers a pin per **dirty** minimized
  dialog; `pinnedScopes` then protects that scope from eviction.

### `hooks/useBoundedMountedTabs.ts`

Keeps visited tabs mounted for instant warm revisits, but bounds the hidden
set under pressure: LRU order updates on activation, eviction waits
`tabEvictDelayMs` so quick back-and-forth stays warm, the active tab and
pinned scopes are never evicted, and `onEvict` notifies callers (game pages
use it to drop dead minimized cards via `removeByScope`). An evicted tab
re-mounts on revisit, same as a first visit.

### `components/layout/TabPane.tsx`

Single wrapper for tab content: `active` toggles web
`position:absolute + visibility:hidden` (kept laid out → switching back is a
paint flip, not a re-layout of thousands of nodes) vs native `display:none`;
`mounted` lazy-mounts the subtree; `scopeId` registers the MemoryScope.

## Protections

- **Dirty editors are never evicted** — dialogs pass `pinned: () => hasUnsavedChanges`
  to `useMinimizeTarget`; pinning is evaluated at minimize time.
- **Minimized snapshots are droppable** — under pressure `domClone` is nulled;
  the card stays in the row (title-only) and restores normally.
- **Dead cards don't linger** — evicting a scope removes its non-pinned
  minimized entries.

## Debugging

Append `?debugmem=1` to the URL (web) — a bottom-right badge shows
tier/pressure/heap/policy. See `components/dev/MemoryDebugBadge.tsx`.

## Related perf changes (same pass)

- `useValue`/`useList` accept `enabled` (skip registering a subscription) and
  `autoCreate` (skip the create-missing-record write). `useSaveHistory` uses
  both — the ~500-write/~480-subscription mount burst on game open is gone.
- Per-row/per-cell editor dialogs mount on first open
  (`{mounted || isOpen && <Dialog/>}` pattern in `DayUserRow`,
  `NightlyDayUserRow`, `TagCellDisplay`, `RoleRow`).
- `useProgressiveCount` mounts table rows in batches across frames.
- `hooks/useNow.ts` — shared ticker; pauses in hidden panes and while the
  document is hidden.
- `components/MainPage.tsx` — `useDeferredValue` on the screen swap so game
  mount is a non-urgent render.
- `StickyTocButton.web.tsx` — IntersectionObserver + rare re-measure instead
  of a 200ms `elementFromPoint` scan.
- `ConvexDialog.web.tsx` — Escape closes the top-most dialog (module stack).
