<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- svg-conversion-start -->

## SVG to React Native Component Conversion

This project uses SVGR for converting SVG files to React Native components.

### Conversion Process

1. **Convert SVG to React Native component:**

   ```bash
   npx @svgr/cli --native --typescript --out-dir app/components/icons/ path/to/svg/file.svg
   ```

2. **Key Options:**
   - `--native`: Essential for React Native compatibility (uses react-native-svg components)
   - `--typescript`: Generates .tsx files with proper types
   - `--out-dir`: Specifies where generated components should be saved
   - `--icon`: Scales SVG to standard icon size (usually 1em) - optional

3. **Usage in Components:**

   ```tsx
   import SvgComponent from '../icons/ConvertedSvg';

   // Use as container with centered text
   <View className="relative items-center justify-center">
     <SvgComponent width={154} height={60} />
     <Text className="absolute">Centered Text</Text>
   </View>;
   ```

4. **Requirements:**
   - Ensure `react-native-svg` is installed in the project
   - Generated components use `Svg`, `Path`, `Circle` from react-native-svg
   - Components accept standard SvgProps for customization

### Example Workflow

The GameTabBar component was updated to use SVG containers:

- SVG acts as the outer container
- Text is positioned absolutely in the center
- No icons displayed, text-only design
- Scalable and themeable through props
<!-- svg-conversion-end -->

<!-- unsaved-changes-confirmation-start -->

## Unsaved Changes Confirmation on Dialogs

**ALWAYS** add an "are you sure you want to leave?" confirmation to any dialog that has editable state (text inputs, tag selections, color pickers, etc.) when the user closes or cancels with unsaved changes. This is a required pattern for all editor dialogs in this project.

### Reference implementation

See `app/components/game/MarkdownEditorDialog.tsx` for the canonical implementation. The reusable confirmation dialog is `app/components/ui/dialog/UnsavedChangesDialog.tsx`.

### Required steps for every editor dialog

1. **Snapshot the initial state** when the dialog opens. Store it in dedicated `initial*` state variables (e.g. `initialTextValue`, `initialSelectedTagNames`) set inside the `useEffect` that runs on `isOpen`.

2. **Compute `hasUnsavedChanges`** by comparing the current draft state to the snapshot. Use `.trim()` on text comparisons. For arrays, compare sorted JSON strings.

3. **Intercept all dismiss paths:**
   - `handleAttemptClose()` — called by the Cancel button and the X close button. If `hasUnsavedChanges`, open the confirm dialog; otherwise close normally.
   - `handleOpenChange(open)` — passed to `ConvexDialog.Root`. If `!open && hasUnsavedChanges`, open the confirm dialog; otherwise pass through to `onOpenChange`. This catches overlay clicks and Escape key.

4. **Disable swipe-to-dismiss** by passing `isSwipeable={false}` to `ConvexDialog.Content`. HeroUI's swipe animation completes before `onOpenChange` fires, so intercepting the close after a swipe leaves the dialog stuck off-screen.

5. **Replace `ConvexDialog.Close` with a `Pressable`** that calls `handleAttemptClose`. The built-in `ConvexDialog.Close` auto-closes the dialog and bypasses the unsaved-changes check. Use a `Pressable` with the same styling and a lucide `X` icon instead:

   ```tsx
   <Pressable
     onPress={handleAttemptClose}
     className="bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 items-center justify-center rounded-full">
     <X size={18} color="rgb(246, 238, 219)" />
   </Pressable>
   ```

6. **Render `UnsavedChangesDialog`** alongside the main dialog (sibling, inside the fragment):

   ```tsx
   <UnsavedChangesDialog
     isOpen={isLeaveConfirmOpen}
     onOpenChange={setIsLeaveConfirmOpen}
     onStay={handleCancelLeave}
     onLeave={handleConfirmLeave}
   />
   ```

7. **`handleConfirmLeave`** closes both dialogs: `setIsLeaveConfirmOpen(false); onOpenChange(false);`

8. **`handleCancelLeave`** just closes the confirm: `setIsLeaveConfirmOpen(false);`

9. **Reset `isLeaveConfirmOpen` to `false`** in the open `useEffect` so stale state doesn't persist across reopens.

### Dialogs that already follow this pattern

- `MarkdownEditorDialog.tsx` (canonical)
- `TagCellEditor.tsx`
- `AddTagDialog.tsx`
<!-- unsaved-changes-confirmation-end -->
