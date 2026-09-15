# Color implementation — FontText class-based colors

## Request

Make the "Delete Section" control in the newspaper section options dialog red,
including the `Trash2` icon, while preserving the disabled/faded state. The
intended direction was to support class-based colors such as
`className="text-red-700"` in `FontText` and resolve them through Uniwind.

## Current implementation

### `app/components/ui/text/FontText.tsx`

`FontText` now parses a color token from `className`:

- It finds the last `text-*` class that is **not** a Tailwind text utility
  (`text-xs`, `text-center`, `text-red-700` is a color, `text-wrap` is a
  utility, etc.).
- It resolves that token through `useCSSVariable('--color-${token}')`.
- The resolved color is applied as the native `Text` style color.
- If no color class is present, it falls back to the explicit `color` prop,
  then to the default `text` color token.

Example usage:

```tsx
<FontText className="text-red-700">Delete Section</FontText>
```

The `color` prop is still supported for explicit tokens such as `red-700`.

### `app/components/game/newspaperPageOperator/NewspaperSectionOptionsDialog.tsx`

The Delete Section control currently:

- Resolves the red color once with `useCSSVariable('--color-red-700')` and
  passes that resolved color to the `Trash2` icon.
- Wraps the `Trash2` icon in a `View` with `opacity: 0.4` when `!canDelete`.
- Uses `FontText color="red-700"` with an `opacity-40` class when `!canDelete`.
- Shows the text "Delete Section" when `canDelete` is true and
  "The only section cannot be deleted" when it is not.

## Enabled / disabled behavior

- **Enabled** — `FontText` with the red color, `Trash2` at full opacity with
  the resolved red color.
- **Disabled** — `FontText` with the red color plus `opacity-40` class,
  `Trash2` wrapped in a `View` with `opacity: 0.4` using the same red color.

The visual is functionally disabled and visually faded.

## Relevant files

- `app/components/ui/text/FontText.tsx`
- `app/components/game/newspaperPageOperator/NewspaperSectionOptionsDialog.tsx`
- `app/components/ui/buttons/AppButton.tsx` (icon + text row container)
- `app/components/ui/minimize/MustSaveDialog.tsx` (related button sizing fix)

## Known limitations / follow-up

1. The dialog still uses the explicit `color="red-700"` prop and a direct
   `useCSSVariable('--color-red-700')` call for the icon. In a follow-up pass
   the icon color can be derived from the same `FontText` class-based token so
   the two never drift.
2. The `TEXT_UTIL_CLASSES` allow-list in `FontText` must be kept in sync if new
   Tailwind text utilities are introduced; otherwise they will be mistaken for
   color tokens.
3. `FontText` accepts arbitrary `color` strings; custom non-Uniwind colors will
   fall through as literal CSS color values.
