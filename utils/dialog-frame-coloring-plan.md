# Dialog Frame Coloring Plan: Gold vs Ghostly

## Current State (Working Checkpoint)

All dialogs currently render with **gold** frame coloring always. They do NOT dynamically switch to ghostly when the player is dead. This is intentional — we reverted dynamic coloring to establish a stable baseline.

## The Core Problem We Hit

`GuildedFrame` (used inside dialogs) transitively calls hooks that require `ConvexProviderWithClerk`:

```
GuildedFrame.web.tsx
  -> usePlayerStatus() [PlayerStatusContext]
       OR
  -> GuildedButton (as part of dialog chrome)
       -> useUserVariable() -> useConvexAuth() [requires Clerk+Convex provider]
```

Inside a `Dialog.Portal`, the React tree is **teleported to a portal host** that sits **outside** the `ConvexProviderWithClerk` wrapper in `_layout.tsx`. This breaks any hook that depends on Clerk-authenticated Convex context.

### What We Tried That Failed

1. **Re-providing `ConvexProviderWithClerk` inside dialog Content** — `useConvexAuth` requires the full Clerk OAuth flow context (not just a `ConvexReactClient`). Cannot construct that inside a dialog.
2. **Re-providing plain `ConvexProvider` + `useConvex()` to get client** — `useConvex()` itself returned `undefined` or crashed when called inside the portal tree. The portal host appears to sever context chains.
3. **Creating a fresh `ConvexReactClient`** inside `ConvexDialog.web.tsx` module scope — this is the **only pattern that works** for `useAction` inside dialogs. It does NOT carry Clerk auth, but `uploadthing.generatePublicImageUploadUrl` is a public action that doesn't need auth.

### The Winning Architecture (Current)

```tsx
// ConvexDialog.web.tsx
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const ConvexDialogContent = ({ children }: { children: React.ReactNode }) => {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
};

// Content wraps Dialog.Content with GuildedFrame + ConvexProvider
Content: ({ children, className, ...props }: any) => {
    return (
        <ConvexDialogContent>
            <Dialog.Content className={...} {...props}>
                <GuildedFrame contentClassName='overflow-hidden p-5' backgroundToken='inner-background'>
                    {children}
                </GuildedFrame>
            </Dialog.Content>
        </ConvexDialogContent>
    );
},
```

**Key insight**: The `Dialog.Content` itself lives inside `ConvexDialogContent` (which is NOT a portal — it's regular JSX). But `Dialog.Portal`/`Dialog.Overlay` are the portal parts. The critical discovery is that `Dialog.Content` in `@rn-primitives/dialog` **IS rendered through a portal** by the library internally, so even wrapping it with `ConvexProvider` before passing it to `Dialog.Content` may not be sufficient. The working version places `ConvexProvider` inside the Content wrapper at the JSX level where it survives.

## The Plan to Add Dynamic Coloring Back

### Goal

Dialogs should show **gold** when player is alive, **ghostly** when player is dead.

### Constraints

1. **Cannot call `useConvexAuth` or `useUserVariable` inside dialog frame** — these crash inside portal trees.
2. **Cannot call `usePlayerStatus` inside `GuildedFrame` when used in dialogs** — `PlayerStatusContext` is available (it's a plain React context), BUT `GuildedFrame.web.tsx` also contains `GuildedButton` chrome which calls `useUserVariable`.
3. **The dialog frame must be colorable without any Convex-Auth-dependent hooks**.

### Recommended Architecture

#### Option A: Pass `variant` as a prop (Explicit)

1. Add a `variant?: 'gold' | 'ghostly'` prop to `ConvexDialog.Root`.
2. Store it in a `DialogVariantContext` (plain React context, no Convex).
3. `ConvexDialog.Content` reads the context and passes `variant` to `GuildedFrame`.
4. **`GuildedFrame` must accept an explicit `variant` prop and skip its internal `usePlayerStatus()` when used inside dialogs**.

```tsx
// In dialog files
<ConvexDialog.Root variant="ghostly">
  ...
</ConvexDialog.Root>
```

Pros: Simple, explicit, no hooks inside portal.
Cons: Every dialog file must compute/pass the variant.

#### Option B: Dialog-Safe `GuildedFrame` Wrapper (Preferred)

Create a `DialogGuildedFrame` component that is **identical** to `GuildedFrame` but:
- Accepts `variant: 'gold' | 'ghostly'` as a **required** prop
- Does NOT call `usePlayerStatus()`
- Does NOT render any `GuildedButton` chrome (only the frame border)

```tsx
// DialogGuildedFrame.web.tsx
interface DialogGuildedFrameProps {
    children: React.ReactNode;
    variant: 'gold' | 'ghostly';
    className?: string;
    contentClassName?: string;
    backgroundToken?: string;
}

export function DialogGuildedFrame({ variant, ...props }) {
    // Uses GuildedFrameCore directly, no usePlayerStatus, no GuildedButton
    return <GuildedFrameCore variant={variant} {...props} />;
}
```

Then in `ConvexDialog.web.tsx`:

```tsx
<Dialog.Content ...>
    <DialogGuildedFrame variant={frameVariant} ...>
        {children}
    </DialogGuildedFrame>
</Dialog.Content>
```

And `frameVariant` comes from a plain React context set at `ConvexDialog.Root`:

```tsx
const DialogVariantContext = createContext<'gold' | 'ghostly'>('gold');

// In dialog usage
const isPlayerDead = usePlayerStatus(); // called OUTSIDE portal, safe
<ConvexDialog.Root frameVariant={isPlayerDead ? 'ghostly' : 'gold'}>
```

Pros: Clean separation of concerns. Dialog frame is a pure component.
Cons: Need to create `DialogGuildedFrame`, update all dialog call sites to pass variant.

### Files That Must Change

| File | Role |
|------|------|
| `app/components/ui/dialog/ConvexDialog.web.tsx` | Add `frameVariant` prop to Root, context, pass to DialogGuildedFrame |
| `app/components/ui/dialog/ConvexDialog.tsx` | Same for native |
| `app/components/ui/chrome/DialogGuildedFrame.web.tsx` | NEW: Frame without auth hooks, accepts explicit variant |
| `app/components/ui/chrome/DialogGuildedFrame.tsx` | NEW: Native version |
| `app/components/ui/chrome/GuildedFrameCore.web.tsx` | Already exists — uses explicit `variant` prop, no hooks |
| `app/components/ui/chrome/GuildedFrameCore.tsx` | Already exists — native version |
| `~31 dialog files` | Add `frameVariant={isPlayerDead ? 'ghostly' : 'gold'}` to each `<ConvexDialog.Root>` |

### What NOT to Do

- **Do NOT** call `useUserVariable()`, `useConvexAuth()`, or any hook that reads Clerk-authenticated Convex state inside any component rendered inside `Dialog.Portal` / `Dialog.Content`.
- **Do NOT** try to re-provide `ConvexProviderWithClerk` inside the dialog. It requires Clerk auth state that cannot be reconstructed.
- **Do NOT** try-catch React hooks. It violates rules of hooks and creates inconsistent behavior.

### What IS Safe Inside Dialogs

- Plain React contexts (e.g., `PlayerStatusContext` if provided high enough)
- `useConvex()` — ONLY if the dialog uses the **module-level fresh client pattern** (current working approach)
- `useAction` with a public action (using the module-level client)
- `useState`, `useEffect`, `useContext` with non-Clerk contexts

### Context About `GuildedFrame` vs `DialogGuildedFrame`

`GuildedFrame.web.tsx` (used on main pages) is allowed to call `usePlayerStatus()` because it renders inside the normal app tree, NOT inside a portal.

`DialogGuildedFrame` (used inside dialogs) must be **auth-hook-free** because dialogs render through portals.

The shared rendering core is `GuildedFrameCore.web.tsx` which is already platform-agnostic and takes an explicit `variant` prop — this is the correct building block for both.

## Open Question

Should `PlayerStatusContext` itself be safe inside dialogs? It is a plain React context created at app root. If `Dialog.Portal` preserves React context (it uses ReactDOM.createPortal which DOES preserve context), then `usePlayerStatus()` inside `GuildedFrame` would actually work IF `GuildedFrame` didn't also transitively call `useUserVariable` through its `GuildedButton` chrome.

The actual crash happens from `GuildedButton` → `useUserVariable` → `useConvexAuth`, not from `usePlayerStatus` itself. So theoretically, a `GuildedFrame` that ONLY calls `usePlayerStatus` (and skips `GuildedButton` chrome) could work inside dialogs. But the safer design is explicit `variant` prop via `DialogGuildedFrame`.

## Testing Checklist for When We Implement

- [ ] Open any dialog (e.g., profile edit, image upload)
- [ ] Verify frame renders with correct gold/ghostly color
- [ ] Click image upload button inside dialog — must NOT throw `useAction` error
- [ ] Verify `tsc --noEmit --skipLibCheck` passes
- [ ] Test on both web and native builds
