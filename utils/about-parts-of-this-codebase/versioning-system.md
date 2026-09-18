# Versioning System

How the app knows when a player is running a stale bundle, and how to ship a new version.

## How it works

1. **Client version** — every bundle carries a build-time constant, `CLIENT_VERSION`, defined in [`utils/appVersion.ts`](../appVersion.ts). Because it's bundled, a loaded client can never silently become "newer" — it only updates on reload.
2. **Latest version** — the Convex `globals` table stores the newest released version under the key `latestClientVersion`.
3. **Comparison** — `useAppVersionStatus()` ([`hooks/useAppVersionStatus.ts`](../../hooks/useAppVersionStatus.ts)) subscribes to that global via `useGlobalVariable` and reports `isOutdated` when `latestClientVersion > CLIENT_VERSION`. While the query is loading (or if the key was never set), the client counts as up-to-date — the notice never flashes on load.
4. **The notice** — `VersionUpdateNotice` ([`components/ui/VersionUpdateNotice.tsx`](../../components/ui/VersionUpdateNotice.tsx)) is a standalone overlay rendered once in `app/_layout.tsx`. On web it portals to `document.body` as a `position: fixed` bottom-left card (the same technique `MinimizeRow` uses, so it floats above everything); on native it's an absolute-positioned view. It renders a guilded-frame card with:
   - a **Reload** button (`window.location.reload()` on web, `DevSettings.reload()` on native),
   - a **minimize** ("−") button that shrinks the card into a small "Update" pill — modeled on the minimize row's Hide/Show pills, with the same `FadeInDown`/`FadeOutDown` animations. Tapping the pill expands the card again.

   It stays on screen until reload — there is no way to fully dismiss it. When minimized dialogs occupy the bottom-left dock, the notice measures the dock's height (`data-minimize-dock` attribute on `MinimizeRow`) and stacks itself directly above it rather than overlapping.

## Releasing a new version

> **NEVER bump unless explicitly asked.** Most updates ship without forcing a reload — the prompt is disruptive by design. Committing/deploying alone never changes anything: `latestClientVersion` lives in the Convex database, not the repo.

```bash
npm run version:bump            # bump + push to the dev deployment
npm run version:bump -- --prod  # bump + push to production
npm run version:bump -- --no-push  # bump the constant only
```

The script ([`scripts/bump-version.mjs`](../../scripts/bump-version.mjs)) increments `CLIENT_VERSION` in `utils/appVersion.ts` and runs `convex run globals:set` to publish the new `latestClientVersion`. Then deploy the frontend (`vercel --prod`) so fresh loads get the new bundle.

Manual equivalent:

```bash
# 1. Increment CLIENT_VERSION in utils/appVersion.ts
# 2. Publish to Convex:
npx convex run globals:set '{"key":"latestClientVersion","value":3}'          # dev
npx convex run --prod globals:set '{"key":"latestClientVersion","value":3}'   # prod
```

**Only bump when you want connected clients to reload.** The notice appears within a second or two of the global being set (Convex subscriptions are live). If you deploy a frontend change without bumping, nothing happens for already-connected clients.

## Testing locally

With `npx convex dev` running, force the notice by publishing a version higher than the bundled one:

```bash
npx convex run globals:set '{"key":"latestClientVersion","value":999}'
```

Then set it back to match:

```bash
npx convex run globals:set '{"key":"latestClientVersion","value":1}'
```

## Files

- `utils/appVersion.ts` — `CLIENT_VERSION` constant + global key
- `hooks/useAppVersionStatus.ts` — client vs server comparison hook
- `components/ui/VersionUpdateNotice.tsx` — the overlay (card / pill UI), mounted in `app/_layout.tsx`
- `components/ui/minimize/MinimizeRow.tsx` — unrelated to versioning; only carries the `data-minimize-dock` attribute the notice stacks above
- `scripts/bump-version.mjs` — release helper (`npm run version:bump`)
