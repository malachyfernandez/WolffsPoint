# Context: Operator Rule Book loses scooped corners (web-only bug)

This file is a self-contained handoff. Read it in full before doing anything else.

## 1. The task

Fix a web-only visual bug in the Wolfspoint multiplayer game.

**Bug:** When the operator opens the Rule Book from inside the Config tab, the decorative "scooped corners" that normally surround the whole page (the container below the top nav tabs) disappear and the page appears to have square corners.

**Reproduction path (operator, web only):**
1. Open the operator game page.
2. Select the "Config" tab (internally named `rulebook` in `OperatorTab`).
3. The Config landing page renders inside a `PaperContainer` and shows the scooped corners correctly.
4. Tap the "Rule book" preview card inside Config.
5. The view animates to `RuleBookPageOPERATOR`. The outer `PaperContainer`'s scooped corners are now missing / square.

**Constraint:** Web-only. Do not change native mobile behavior. Do not redesign the frame. Preserve the existing CSS-mask-based scooped corners, the frame texture, outer shadows, the GameTabBar's intentional overlap, and the existing `LayoutStateAnimatedView` transitions.

**Do NOT** blanket-add `overflow: hidden` without checking effects on masks, outlines, shadows, texture, and the tab overlap.

## 2. What "scooped corners" are

The outer page frame is a `PaperContainer` → `GuildedFrame` → `GuildedFrameCore` (web). The scooped corners are NOT `border-radius`. They are produced by **CSS masks** on `.guilded-frame-shell` (and `::before`, `::after`, and `.guilded-frame-surface`). Each layer uses four `radial-gradient` masks (one per corner) with `mask-size: 51% 51%` and `mask-repeat: no-repeat`. The corner radius is `--r: 20px`. The frame has three ring thicknesses (`--t-out`, `--t-mid`, `--t-in`) and a surface background.

Anything that paints an opaque rectangular layer over the frame's transparent corner regions, or that changes the frame element's sizing/overflow/stacking, can visually cover or bypass the mask and make the corners look square.

## 3. Key file paths (repo root: `/Users/malachyfernandez/Documents/1-programing/apps-and-sites/wolfspoint/wolffspoint`)

### Frame implementation (web)
- `app/components/ui/PaperContainer.web.tsx` — wraps children in `FadeInAfterDelay` → `GuildedFrame` with `className="z-1"`, `contentClassName="py-4 px-2 sm:px-4"`, `backgroundToken="inner-background"`.
- `app/components/ui/chrome/GuildedFrame.web.tsx` — delegates to `GuildedFrameCore.web`, picks `gold`/`ghostly` variant based on `PlayerStatusContext.isPlayerDead`.
- `app/components/ui/chrome/GuildedFrameCore.web.tsx` — **the actual scooped-corner CSS lives here** in the `guildedFrameCSS` template string. Renders `.guilded-frame-root > .guilded-frame-shadow > .guilded-frame-shell > .guilded-frame-surface > (.guilded-frame-texture + .guilded-frame-content)`. The CSS is injected via `<style dangerouslySetInnerHTML>`. Read this file; the mask definitions are the source of truth for the corners.
- `app/components/ui/loading/FadeInAfterDelay.tsx` — wraps children in an `Animated.View` that fades opacity from 0.01 to 1 after a delay.

### Operator layout (the broken path)
- `app/components/game/GamePage.tsx` — top-level game page. Wraps everything in `ShadowScrollView` (heroui-native `ScrollShadow` + `Animated.ScrollView`). Renders `OperatorGamePage` for operators.
- `app/components/game/OperatorGamePage.tsx` — renders `<Column gap-4>` → `<GameTabBar>` → `<PaperContainer>` → `<Animated.View key={activeTab} entering={FadeIn.duration(300)} className="w-full min-w-0">` → tab content. The `rulebook` tab renders `<ConfigPageOPERATOR>`.
- `app/components/game/ConfigPageOPERATOR.tsx` — **primary suspect.** Renders `<Column className="min-h-[760px] flex-1 gap-0 py-3 sm:px-4">` containing a `LayoutStateAnimatedView.Container` with `className="flex-1"`. Two options: `config` (page 1) and an `OptionContainer` (page 2, `pushInAnimation={fromRight}`) holding `ruleBook` and `phoneBook` options. The `ruleBook` option renders `<RuleBookPageOPERATOR>`.
- `app/components/game/RuleBookPageOPERATOR.tsx` — renders `<Column className="gap-6 pb-6">` with a back button, a TOC button, a title `FontTextInput`, a markdown preview `Pressable` (`bg-text/5 min-h-[220px] flex-1 rounded-3xl p-4`), `RuleBookRoleDescriptions`, plus `MarkdownEditorDialog` and `TableOfContentsDialog` (both portal-based, rendered as siblings). It does NOT render its own outer frame — it relies on the surrounding `PaperContainer`.
- `app/components/game/RuleBookRoleDescriptions.tsx` — renders role description cards (`bg-text/10 ... rounded-xl`) and a `MarkdownEditorDialog`.

### The animated transition container (primary suspect)
- `app/components/ui/LayoutStateAnimatedView.tsx` — compound component. `Container` is `flex: 1, position: relative`. On state change it keeps the previous content as `leavingContent` rendered in an absolute-fill `Animated.View` (`pointerEvents="none"`, `StyleSheet.absoluteFillObject`) and renders the new content in an `Animated.View` with `flex: 1`. The leaving overlay is removed after the exit animation duration. The entering/leaving animated styles only set `opacity` and `transform` (translateX/Y, scale). **This nested relative/absolute layering inside the masked frame is the most likely cause** — an absolute-fill or flex child could paint a rectangular surface over the transparent corner regions, or the transition could change the frame's measured size.

### Player layout (the working comparison)
- `app/components/game/PlayerGamePage.tsx` — renders `<Column gap-5>` → `<GameTabBar>` → `<PaperContainer>` → `<Animated.View key={activeTab} entering={FadeIn.duration(300)} className="w-full min-w-0">` → tab content directly. The `ruleBook` tab renders `<RuleBookPagePLAYER>`. **No nested `LayoutStateAnimatedView`** — this is the key structural difference from the operator path.
- `app/components/game/RuleBookPagePLAYER.tsx` — renders `<Animated.View entering={FadeIn.duration(300)} className="flex-1 min-h-[760px]">` → `<Column className="gap-4 flex-1 py-3 sm:px-4">` with title, TOC button, `MarkdownRenderer`, `RuleBookRoleDescriptionsPLAYER`, and `TableOfContentsDialog`.

### Tab bar (intentional overlap)
- `app/components/game/GameTabBar.web.tsx` — `.guilded-game-tab-bar` uses `margin-bottom: calc(-32px - var(--tab-bottom-extension) - var(--tab-bottom-buffer))` to overlap the `PaperContainer` below. `--tab-bottom-extension: 28px`, `--tab-bottom-buffer: 22px`. The `PaperContainer` gets `z-1` so it sits above the tab bar. Do not break this overlap.

### Dialogs (portal-based, should not affect the closed frame)
- `app/components/ui/dialog/ConvexDialog.tsx` and `ConvexDialog.web.tsx` — `ConvexDialog.Root` wraps heroui-native `Dialog`; `ConvexDialog.Portal` only renders children when `isOpen`; `ConvexDialog.Content` wraps in a `DialogGuildedFrame` (separate frame instance).
- `app/components/game/MarkdownEditorDialog.tsx` — uses `ConvexDialog.Root`/`Portal`; renders a `<ConvexDialog.Trigger asChild><View /></ConvexDialog.Trigger>` (an empty trigger) plus the portal content. When closed, the portal renders nothing.
- `app/components/game/ruleBook/TableOfContentsDialog.tsx` — same pattern; portal only renders when open.

### Supporting
- `app/components/layout/Column.tsx` — `<View className={\`flex-col ${className}\`}>` with `mergeGapStyle`.
- `app/components/layout/gapStyle.ts` — `mergeGapStyle` always includes a default `gap: 16` plus parsed gap tokens.
- `app/components/ui/ShadowScrollView.tsx` — wraps heroui-native `ScrollShadow` around a `ScrollView`.
- `global.css` — Tailwind/Uniwind theme tokens. No frame-specific CSS here; the frame CSS is entirely in `GuildedFrameCore.web.tsx`.
- `app/_layout.tsx` — root providers; sets `html`/`body` background to `--color-outer-background` (`rgb(30, 30, 30)`).

## 4. Architecture / how the pieces fit

```
GamePage
  ShadowScrollView (Animated.ScrollView, h-screen)
    View (max-w-[1000px] mx-auto pt-60)
      OperatorGamePage
        Column (gap-4)
          GameTabBar (negative margin, overlaps below)
          PaperContainer (z-1)
            FadeInAfterDelay
              GuildedFrame -> GuildedFrameCore  <-- scooped corners via CSS masks
                guilded-frame-content (py-4 px-2 sm:px-4)
                  Animated.View (key=activeTab, FadeIn 300ms, w-full min-w-0)
                    [activeTab === 'rulebook']
                    ConfigPageOPERATOR
                      Column (min-h-[760px] flex-1 py-3 sm:px-4)
                        LayoutStateAnimatedView.Container (flex-1, position: relative)
                          [leavingContent? absolute-fill Animated.View, pointerEvents none]
                          Animated.View (flex: 1, entering style: opacity+transform)
                            [stateValue === 'ruleBook']
                            RuleBookPageOPERATOR
                              Column (gap-6 pb-6)
                                ...content...
                                MarkdownEditorDialog (portal, closed)
                                TableOfContentsDialog (portal, closed)
```

The player path is the same up to `PaperContainer` but swaps the nested `ConfigPageOPERATOR`/`LayoutStateAnimatedView` for a direct `RuleBookPagePLAYER` render. The player path is not reported broken.

## 5. Most likely causes (investigate in this order)

1. **`LayoutStateAnimatedView` layering inside the masked frame.** The `Container` is `flex: 1, position: relative` and renders an absolute-fill leaving overlay plus a `flex: 1` entering child. One of these layers may paint a rectangular surface over the frame's transparent corner regions, or the transition may resize the frame so the mask no longer covers the corners. Compare computed styles of `.guilded-frame-shell` / `.guilded-frame-surface` / the `LayoutStateAnimatedView` container and its animated children between the Config state (corners OK) and the Rule Book state (corners broken).
2. **A child with an opaque background or its own stacking context** covering the corner mask regions. `RuleBookPageOPERATOR`'s `border-y` section, the `bg-text/5` preview card, or `RuleBookRoleDescriptions`'s `bg-text/10` cards are candidates, but they are interior and shouldn't reach the frame corners — verify in the inspector.
3. **Transition-only vs persistent.** Determine whether the corners are missing only during the `fromRight` transition (while `leavingContent` is mounted) or persist after the transition completes. The leaving overlay is removed after the exit duration (~250ms).
4. **Stacking-context / z-index interaction** with `PaperContainer`'s `z-1` and the tab bar's `z-index: 0`. A new stacking context created by the animated `transform`/`opacity` could reorder layers.

## 6. Constraints and decisions already made

- Web-only. Prefer `.web.tsx` components and browser CSS behavior.
- Do NOT redesign the frame. Preserve the CSS mask and its layering.
- Be careful with `overflow: hidden` — it can clip shadows, mask effects, texture, or the tab overlap.
- Do NOT add debug logging to shipped code unless explicitly asked.
- Do NOT change Convex code for this issue (it is UI-only). If Convex code is touched, read `convex/_generated/ai/guidelines.md` first.
- Editor dialogs with editable state must preserve the unsaved-changes confirmation pattern (see `AGENTS.md` and `MarkdownEditorDialog.tsx`/`UnsavedChangesDialog.tsx`). Not directly relevant to this bug, but keep in mind if touching dialogs.
- The TOC scroll work from the previous thread is complete and committed; do not regress it. TOC behavior: closes dialog, clears body/html overflow lock, finds target, scrolls nearest scrollable ancestor via direct `scrollTop`, ~80px buffer, no smooth-scroll fallback.

## 7. Verification expectations

- Compare operator Config page (corners OK) vs operator Rule Book page (corners broken) in the running web preview.
- Check all four outer corners.
- Check during the transition and after it settles.
- Inspect computed styles of `.guilded-frame-shell`, `.guilded-frame-surface`, `.guilded-frame-content`, the `LayoutStateAnimatedView` container, the active animated child, and any leaving absolute overlay.
- Run the project's typecheck/build after changes (Expo web; the dev server was previously started on port 8085 because 8081 was occupied).
- Confirm no temporary debug logs remain.

## 8. What has NOT been done yet

- No code change has been made for this bug. The previous thread only investigated.
- The root cause has not been confirmed. The suspects in section 5 are hypotheses.
- No fix has been implemented or verified.

## 9. Dev server note

The Expo web dev server was previously started on port 8085 (port 8081 was occupied by another project). The operator game page requires authentication (Clerk) and real user data, so direct automated navigation is limited; the user reproduces manually in the browser preview.

## 10. Goal of the new thread

Diagnose the root cause, implement the smallest web-specific fix that preserves the scooped corners and all the constraints in section 6, verify in the browser, run typecheck, and report the changed files and verification results. Do not claim any PR state without authoritative evidence.
