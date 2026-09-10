# Context: Rule Book TOC + Newspaper Improvements

## Overview

This file captures the full context of an ongoing session working on the Wolfspoint multiplayer game (React Native / Expo / TypeScript / Convex). The session covered several independent features. The most recent active issue is that the **Table of Contents (TOC) scroll-to-section is not working** after a fix that was intended to prevent the page from being pushed up/off-screen.

---

## Active Bug: TOC scroll not working

### What's happening

On the Rule Book page (both operator and player views), there is a "Table of Contents" button (a `List` icon in the top-right). Clicking it opens a modal (`TableOfContentsDialog`) that lists:
1. The rule book title (top-level)
2. All markdown headings from the rule book content (indented by heading level)
3. The role descriptions title (top-level, after a divider)
4. Each role name (indented one level)

Clicking any entry should scroll the rule book page so the corresponding section is visible, with a ~24px buffer above it, then close the modal.

**Currently the modal closes but no scrolling happens.**

### History of the bug

1. **Original implementation** used `el.scrollIntoView({ behavior: 'smooth', block: 'start' })`. This worked for scrolling but also scrolled the **window** itself, pushing the entire page content up and cutting off the top of the operator page. The user reported: "somehow u made every page in the operator be higher then it should be sometimes cutting off the top."

2. **First fix attempt** added `requestAnimationFrame(() => scrollParent.scrollBy({ top: -24 }))` after `scrollIntoView`. This added the buffer but didn't fix the window-scroll issue.

3. **Second fix attempt** replaced `scrollIntoView` entirely with a manual approach: find the nearest scrollable ancestor via `findScrollParent()`, then `scrollParent.scrollTo({ top: offset })` where offset is calculated from `getBoundingClientRect()`. This fixed the page-pushed-up issue but **broke scrolling entirely** — the modal closes but nothing scrolls.

### Likely cause

The `findScrollParent()` function walks up the DOM looking for an element with `overflowY: auto/scroll/overlay` and `scrollHeight > clientHeight`. If the rule book content is **not** inside a scroll container with explicit overflow styling (i.e. the page relies on the window/body for scrolling), `findScrollParent` returns `null` and no scrolling happens.

The rule book pages render inside `PaperContainer` → `Column` → content. There may not be an explicit scroll container — the whole page might just grow and the window scrolls. In that case, we need to fall back to scrolling the window (but only the window, not via `scrollIntoView` which also scrolls intermediate containers).

### The fix needed

`scrollParentToElement` in `utils/parseHeadings.ts` needs to handle the case where there is no scrollable ancestor — it should scroll `window` (or `document.documentElement`) to the element's position with the buffer, without using `scrollIntoView` (which scrolls all ancestors).

### Relevant files

- **`utils/parseHeadings.ts`** — Contains `scrollToHeading`, `scrollToElement`, `findScrollParent`, `scrollParentToElement`. This is where the fix goes.
- **`app/components/game/ruleBook/TableOfContentsDialog.tsx`** — The TOC modal. Calls `scrollToElement(id)` and `scrollToHeading(prefix, blockIndex)` on press.
- **`app/components/game/RuleBookPageOPERATOR.tsx`** — Operator rule book page with editable title fields and TOC button.
- **`app/components/game/RuleBookPagePLAYER.tsx`** — Player rule book page (read-only titles, TOC button).
- **`app/components/game/RuleBookRoleDescriptions.tsx`** — Operator role descriptions section with editable title.
- **`app/components/game/RuleBookRoleDescriptionsPLAYER.tsx`** — Player role descriptions section.
- **`app/components/ui/markdown/MarkdownRenderer.tsx`** — Renders markdown. Has `headingIdPrefix` prop that wraps headings in `<View nativeID="...">` for scroll targets. Only wraps when `headingIdPrefix` is provided.
- **`app/components/ui/PaperContainer.tsx`** — The container wrapper used by game pages. Check if it or its children have overflow styles.

### Current `scrollParentToElement` implementation (the broken one)

```ts
const scrollParentToElement = (el: HTMLElement, buffer = 24) => {
    const scrollParent = findScrollParent(el);
    if (!scrollParent) return;  // <-- returns early if no scroll parent found

    const parentRect = scrollParent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = elRect.top - parentRect.top + scrollParent.scrollTop - buffer;
    scrollParent.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
};
```

### What the fix should do

When `findScrollParent` returns null, fall back to scrolling the window:
```ts
if (!scrollParent) {
    // No scroll container found — scroll the window
    const offset = el.getBoundingClientRect().top + window.scrollY - buffer;
    window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
    return;
}
```

---

## Completed Features (for context)

### 1. Customizable Rule Book Titles

- **`RuleBookData` type** (`types/ruleBook.ts`): Added `ruleBookTitle?` and `roleDescriptionsTitle?` fields.
- **Operator page**: Titles are always-visible `FontTextInput` fields with `variant="styled"` (border + background), full width, at heading-1 size (`text-3xl leading-9`). They update live as the operator types. Empty values fall back to "Rule Book" / "Role Descriptions" as placeholders.
- **Player pages**: Display the operator's custom titles as `FontText` (read-only).

### 2. Table of Contents

- **`parseHeadings.ts`**: Extracts `#{1,3}` headings from markdown (matching MarkdownRenderer's parsing, skipping code fences and script blocks). Returns `{ blockIndex, level, text }[]`.
- **`MarkdownRenderer`**: `headingIdPrefix` prop wraps headings in `<View nativeID="${prefix}-heading-${index}">` — but ONLY when the prop is provided, so other pages are unaffected.
- **`TableOfContentsDialog`** (`app/components/game/ruleBook/TableOfContentsDialog.tsx`): Scrollable modal listing all headings (indented by level), rule book title (top), role descriptions title (top after divider), and role names (indented). All items use the same font styling — only indentation differs.
- **Anchor IDs**: `${prefix}-top` (rule book title), `${prefix}-roles-top` (role descriptions title), `${prefix}-role-${index}` (each role), `${prefix}-heading-${blockIndex}` (each markdown heading).

### 3. Newspaper Zoom Height Fix

- **`NewspaperZoomableView.tsx`**: Added `unscaledContentHeight` shared value measured via `onLayout`. The outer `Animated.View` now animates both `width` and `height` based on `unscaledContentHeight.value * animatedZoom.value`, so the container grows/shrinks with zoom (no gap when zoomed out, no cutoff when zoomed in).
- **Initial load zoom fix**: `hasInitializedRef` skips animation until `containerWidth > 0`, so the first real zoom value is set directly without animating.

### 4. Import Draft Modal Improvements

- **`ImportDraftDialog.tsx`**: Buttons wrap with `flex-wrap gap-x-4 gap-y-3`. Replace button is `sm:min-w-[320px] px-6`. Newspaper preview wrapped in vertical `ShadowScrollView` for scrolling.
- **`NewspaperDayView.tsx`**: Votes container has `sm:mx-0 -mx-2` matching the newspaper's small-screen negative margin.

### 5. Newser Resolution Fix

- **Problem**: Operator couldn't see newser's draft because `assignmentUserId` was empty (saved before newser joined) and the newser's email wasn't in the operator's `userData` query results.
- **Fix**: Added `NewserAccepted` record type. Newser writes their own acceptance record (`{ email, userId, gameId, acceptedAt }`) via `useValue` in `NewspaperPageNEWSER.tsx`. Operator reads it via `useFindValues` in `useNewspaperDayOwner.ts`. `resolveValidNewserAssignment` in `utils/newspaperControl.ts` now has three fallbacks: email→userData match, assignment.userId, accepted record email match.
- **Files**: `utils/newspaperControl.ts`, `app/components/game/useNewspaperDayOwner.ts`, `app/components/game/NewspaperPageNEWSER.tsx`, `app/components/game/NewserGamePage.tsx` (passes `currentEmail` prop).

### 6. Markdown Editor Scroll Jump Fix

- **`FontTextInput.tsx`**: `resizeTextarea` now saves/restores the parent scroll container's `scrollTop`/`scrollLeft` during the height measurement (setting height to 0 then scrollHeight). Added `findScrollParent` helper. This prevents the scroll-to-top glitch when editing markdown below a certain threshold.

---

## Key Architecture Notes

- **Data system**: `useValue` reads/writes the current user's own value. `useFindValues` reads across users. `useFindListItems` reads list items. All cached client-side. See `utils/about-parts-of-this-codebase/userVariables-system.md`.
- **Privacy**: `'PUBLIC'` = everyone can read. `'PRIVATE'` = owner only.
- **Game-scoped keys**: `getGameScopedKey('keyName', gameId)` generates keys like `gameId-keyName`.
- **Rule book data**: Stored as `RuleBookData` under `getGameScopedKey('ruleBook', gameId)`, owned by the operator. Players read it via `useFindValues` with the operator's userId.
- **Role table**: Stored as `RoleTableItem[]` under `useList('roleTable', gameId)`. Each role has `role`, `aboutRole`, `isVisible`, `hiddenFromRulebook`, etc.
- **Dialogs**: Use `ConvexDialog` from `app/components/ui/dialog/ConvexDialog.tsx`. Header via `DialogHeader`. Scrollable content via `ShadowScrollView`.
- **Layout**: `Column` and `Row` with `gap` prop (4px units). Tailwind classes via `className`.
- **Fonts**: `FontText` and `FontTextInput` use `LibreBaskerville` font. Heading 1 size = `text-3xl leading-9`.

## Verification

- Run `npx tsc --noEmit --pretty` from the project root to typecheck.
- Dev server runs on `http://localhost:8086` via `npx expo start --web --port 8086`.
- Test the TOC by opening the rule book page, clicking the List icon, and selecting entries.
