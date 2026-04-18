# Guilded Button System - Complete Documentation

> **CRITICAL CONTEXT FOR NEW AGENTS**: This document contains EVERYTHING you need to know about the GuildedButton system. Read this entire file before making ANY changes to button components, tab bars, or visual styling in this codebase.

---

## 1. Overview & Design Philosophy

### What is the Guilded Button System?

The Guilded Button System is a sophisticated, multi-layered button component that creates a "guilded" (gold-trimmed, ornate) visual effect. It was designed to replace the boring, flat UI buttons with something that feels premium, tactile, and visually interesting.

### Core Visual Characteristics

The GuildedButton creates a **5-part visual structure**:

1. **Outer Drop Shadow** - A subtle shadow that animates on hover (moves closer to button)
2. **Outer Ring** - The outermost border with gradient coloring (dark→light on diagonal)
3. **Middle Ring** - A solid band between outer and inner
4. **Inner Ring** - Another gradient ring with the reverse diagonal
5. **Center Panel** - The content area with optional inner shadow

### Visual Scoop Effect

The signature "scooped corners" are created using CSS radial-gradient masks at each corner. The magic numbers:

```css
/* From testiongButton.html - the prototype file */
-webkit-mask:
    radial-gradient(circle at var(--offset) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top left,
    radial-gradient(circle at var(--offset-right) var(--offset), transparent var(--rad), black calc(var(--rad) + 0.5px)) top right,
    radial-gradient(circle at var(--offset) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom left,
    radial-gradient(circle at var(--offset-right) var(--offset-right), transparent var(--rad), black calc(var(--rad) + 0.5px)) bottom right;
-webkit-mask-size: 51% 51%;
-webkit-mask-repeat: no-repeat;
```

The `51% 51%` mask sizing is CRITICAL - it ensures each corner mask slightly overlaps to prevent gaps.

---

## 2. File Architecture

### The Three Core Files

The GuildedButton is split across three files using React Native's platform-specific extension pattern:

| File | Platform | Purpose |
|------|----------|---------|
| `GuildedButton.tsx` | Native (iOS/Android) | Fallback implementation with basic styling |
| `GuildedButton.web.tsx` | Web | Full-featured implementation with all CSS effects |
| `GuildedButton.shared.ts` | Both | Shared types, defaults, and ring presets |

### File Locations

```
/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/buttons/
├── GuildedButton.tsx              # Native fallback
├── GuildedButton.web.tsx          # Web implementation (394 lines)
├── GuildedButton.shared.ts        # Shared configuration
└── AppButton.tsx                  # Main button component that wraps GuildedButton
```

### Prototype File (Critical Reference)

```
/Users/malachyfernandez/Documents/1-programing/wolfspoint-extra/testiongButton.html
```

This HTML file is the ORIGINAL prototype that the React component replicates exactly. If you ever need to understand the visual effects, study this file. It contains:
- The exact CSS mask technique
- Safari-specific animation workarounds
- The 20-step keyframe animation for smooth shadow transitions

---

## 3. Shared Configuration (`GuildedButton.shared.ts`)

### Full File Content (as of current implementation)

```typescript
export type GuildedButtonBackground =
    | string
    | {
          from: string;
          to?: string;
      };

export type GuildedButtonVariant = 'gold' | 'silver';

export interface GuildedButtonRingPalette {
    outerDark: string;
    outerLight: string;
    middle: string;
    innerLight: string;
    innerDark: string;
}

export interface GuildedButtonProps {
    children: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    className?: string;
    rootClassName?: string;
    variant?: GuildedButtonVariant;
    radius?: number;
    outerThickness?: number;
    middleThickness?: number;
    innerThickness?: number;
    outerShadowYOffset?: number;
    outerShadowBlur?: number;
    outerShadowAlpha?: number;
    innerShadowYOffset?: number;
    innerShadowBlur?: number;
    innerShadowAlpha?: number;
    width?: number | string;
    height?: number | string;
    contentPaddingX?: number;
    contentPaddingY?: number;
    background?: GuildedButtonBackground;
}

export const guildedButtonRingPresets: Record<GuildedButtonVariant, GuildedButtonRingPalette> = {
    gold: {
        outerDark: '#bf6c18',
        outerLight: '#ecd9ab',
        middle: '#d9b458',
        innerLight: '#c79a2e',
        innerDark: '#ba681e',
    },
    silver: {
        outerDark: '#595f66',
        outerLight: '#dde3e8',
        middle: '#aeb5bd',
        innerLight: '#818a93',
        innerDark: '#6f7780',
    },
};

export const guildedButtonDefaults = {
    variant: 'gold' as GuildedButtonVariant,
    radius: 8,
    outerThickness: 1,
    middleThickness: 3,
    innerThickness: 1,
    outerShadowYOffset: 3,
    outerShadowBlur: 3,
    outerShadowAlpha: 0.4,
    innerShadowYOffset: 1,
    innerShadowBlur: 10,
    innerShadowAlpha: 0.3,
    contentPaddingX: 15,
    contentPaddingY: 8,
    background: 'inner-background' as GuildedButtonBackground,
};

export function getGuildedInnerHeight(height: number | string | undefined, totalThickness: number) {
    if (typeof height !== 'number') {
        return height;
    }

    return Math.max(height - totalThickness * 2, 0);
}
```

### Key Insight: Height Math

The `height` prop represents the **TOTAL outer button height**. The component automatically subtracts the border thickness from both top and bottom:

```typescript
// If you pass:
height={48}

// With default thicknesses (1+3+1 = 5px total):
totalThickness = 5

// Inner content area becomes:
innerHeight = 48 - (5 * 2) = 38px
```

This is handled by `getGuildedInnerHeight()` in the shared file.

---

## 4. Web Implementation (`GuildedButton.web.tsx`)

### Architecture Overview

The web implementation uses a nested div structure with CSS-in-JS (injected via `dangerouslySetInnerHTML`):

```
.guilded-button-root          → Root wrapper (keyboard handlers)
  └── .guilded-button-place   → Hover transform target (moves down 3px)
      └── .guilded-button-shadow-wrapper  → Drop shadow + CSS variables
          └── .guilded-button-frame       → Outer ring
              └── .guilded-button-inner-box  → Inner rings + content
                  └── .guilded-button-content  → Padding wrapper
```

### CSS Variables System

The web implementation uses CSS custom properties for dynamic theming:

```css
--r: 8px;              /* Radius */
--t-out: 1px;          /* Outer thickness */
--t-mid: 3px;          /* Middle thickness */
--t-in: 1px;           /* Inner thickness */
--out-y: 3px;          /* Shadow Y offset */
--out-blur: 3px;       /* Shadow blur */
--out-alpha: 0.4;      /* Shadow opacity */
--in-y: 1px;           /* Inner shadow Y */
--in-blur: 10px;       /* Inner shadow blur */
--in-alpha: 0.3;       /* Inner shadow opacity */
--content-padding-x: 15px;
--content-padding-y: 0px;
--center-bg-from: #2f2f2f;
--center-bg-to: #2f2f2f;
--ring-outer-dark: #bf6c18;
--ring-outer-light: #ecd9ab;
--ring-middle: #d9b458;
--ring-inner-light: #c79a2e;
--ring-inner-dark: #ba681e;
```

### Safari-Specific Animation Hack

Safari has bugs with CSS transitions on `filter: drop-shadow`. The solution is a 20-step keyframe animation:

```typescript
// From GuildedButton.web.tsx
@supports (-webkit-appearance: none) and (not (-ms-ime-align: auto)) {
    .guilded-button-shadow-wrapper {
        transition: none;  // Disable transition on Safari
    }

    .guilded-button-root:not(.is-disabled):hover .guilded-button-shadow-wrapper {
        animation: guilded-shadow-animation 0.3s ease forwards;
    }

    @keyframes guilded-shadow-animation {
        0% { --out-y: 3px; --out-blur: 3px; }
        5% { --out-y: 2.9px; --out-blur: 2.9px; }
        10% { --out-y: 2.8px; --out-blur: 2.8px; }
        /* ... 20 steps total ... */
        100% { --out-y: 1px; --out-blur: 1px; }
    }
}
```

### Ring Coloring Technique

The rings use CSS pseudo-elements with masks:

```css
/* Outer ring - the main frame */
.guilded-button-frame {
    background: linear-gradient(to top right, var(--ring-outer-dark) 50%, var(--ring-outer-light) 50%);
    /* Mask creates the scooped corners */
}

/* Middle ring - ::before pseudo-element */
.guilded-button-frame::before {
    inset: var(--t-out);  /* Pushed in by outer thickness */
    background: var(--ring-middle);
}

/* Inner ring - ::after pseudo-element */
.guilded-button-frame::after {
    inset: calc(var(--t-out) + var(--t-mid));  /* Pushed in further */
    background: linear-gradient(to top right, var(--ring-inner-light) 50%, var(--ring-inner-dark) 50%);
}
```

---

## 5. Native Implementation (`GuildedButton.tsx`)

### Simplified Fallback

The native version is a simplified approximation since CSS masks aren't fully supported:

```typescript
export const GuildedButton = ({
    children,
    onPress,
    disabled = false,
    variant = guildedButtonDefaults.variant,
    radius = guildedButtonDefaults.radius,
    outerThickness = guildedButtonDefaults.outerThickness,
    middleThickness = guildedButtonDefaults.middleThickness,
    innerThickness = guildedButtonDefaults.innerThickness,
    width,
    height,
    contentPaddingX = guildedButtonDefaults.contentPaddingX,
    contentPaddingY = guildedButtonDefaults.contentPaddingY,
    background = guildedButtonDefaults.background,
}: GuildedButtonProps) => {
    const effectiveRadius = radius + outerThickness + middleThickness + innerThickness;
    const backgroundColor = typeof background === 'string' ? background : background.from;
    const ringPalette = guildedButtonRingPresets[variant];
    const totalThickness = outerThickness + middleThickness + innerThickness;
    const resolvedWidth = width as DimensionValue | undefined;
    const resolvedHeight = getGuildedInnerHeight(height, totalThickness) as DimensionValue | undefined;

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            disabled={disabled}
            style={[
                nativeStyles.container,
                {
                    borderRadius: effectiveRadius,
                    borderWidth: outerThickness,
                    borderColor: ringPalette.outerDark,
                    backgroundColor: ringPalette.outerDark,
                    padding: middleThickness + innerThickness,
                },
                disabled && nativeStyles.disabled,
            ]}
        >
            <View
                style={[
                    nativeStyles.inner,
                    {
                        borderRadius: radius + middleThickness + innerThickness,
                        borderWidth: middleThickness,
                        borderColor: ringPalette.middle,
                        paddingHorizontal: contentPaddingX,
                        paddingVertical: contentPaddingY,
                        backgroundColor,
                        width: resolvedWidth,
                        height: resolvedHeight,
                    },
                ]}
            >
                {children}
            </View>
        </Pressable>
    );
};
```

---

## 6. AppButton Integration (`AppButton.tsx`)

### The Public API

`AppButton` is the component that the rest of the app uses. It has a `variant` prop that determines styling:

```typescript
interface AppButtonProps {
    children: React.ReactNode;
    variant?: 'outline-alt' | 'outline' | 'outline-accent' | 'outline-invert' | 
             'filled' | 'grey' | 'accent' | 'secondary' | 
             'red' | 'none' | 'black' | 'green';
    className?: string;
    onPress?: () => void;
    dropShadow?: boolean;
    disabled?: boolean;
    blurred?: boolean;
}
```

### Guilded Variants

Two variants use the GuildedButton internally:

```typescript
if (variant === 'accent' || variant === 'secondary') {
    const isSecondary = variant === 'secondary';
    const buttonContent = (
        <GuildedButton
            onPress={onPress}
            disabled={disabled}
            className={className}
            height={48}              // Total outer height
            contentPaddingX={15}
            contentPaddingY={0}
            background={isSecondary ? 'inner-background' : '#2f2f2f'}
            variant={isSecondary ? 'silver' : 'gold'}
        >
            <Row className="items-center justify-center w-full h-full" pointerEvents="none">
                {children}
            </Row>
        </GuildedButton>
    );
    // ...
}
```

### Variant Quick Reference

| Variant | Ring Color | Center Fill | Use Case |
|---------|-----------|-------------|----------|
| `accent` | **Gold** | `#2f2f2f` (dark grey) | Primary action buttons |
| `secondary` | **Silver** | `inner-background` (page bg) | Secondary/outline style |

---

## 7. Color System Integration

### Theme Color Resolution

The GuildedButton supports theme tokens from `global.css`:

```typescript
// From GuildedButton.web.tsx
function useResolvedGuildedColor(value: string) {
    const isThemeToken = /^[a-zA-Z0-9-_]+$/.test(value);
    const resolvedThemeColor = useCSSVariable(isThemeToken ? `--color-${value}` : '--color-text');
    return isThemeToken ? String(resolvedThemeColor || value) : value;
}
```

This means you can pass:
- **Hex values**: `"#2f2f2f"`
- **Theme tokens**: `"inner-background"` → resolves to `--color-inner-background`

### Global CSS Theme (from `/Users/malachyfernandez/Documents/1-programing/wolffspoint/global.css`)

```css
@theme {
   --color-outer-background: rgb(30, 30, 30);
   --color-accent: #9a7a33;
   --color-accent-hover: #aa8a43;
   --color-text: #1a1a1a;
   --color-text-inverted: #ffffff;
   --color-background: rgb(165, 159, 150);
   --color-inner-background: rgb(165, 159, 150);  /* Page background */
   --color-muted-text: #888888;
   --color-border: #1a1a1a;
}
```

---

## 8. Current Usage Examples

### Town Square Thread List View

File: `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/townSquare/TownSquareThreadListView.tsx`

```tsx
<AppButton variant='secondary' className='px-0' onPress={onNewAnnouncement}>
    <Row className='items-center gap-2' gap={3}>
        <Plus size={20} color='black' />
        <Column className='items-start' gap={0}>
            <PoppinsText weight='medium' className='-mb-1'>Announcement</PoppinsText>
            <PoppinsText varient='subtext'>Just You; No Replies</PoppinsText>
        </Column>
    </Row>
</AppButton>

<AppButton variant='accent' className='px-0' onPress={onNewThread}>
    <Row className='items-center gap-2' gap={2}>
        <Plus size={20} color='white' />
        <PoppinsText weight='medium' color='white'>Thread</PoppinsText>
    </Row>
</AppButton>
```

---

## 9. The PaperContainer Context

### Current Implementation

File: `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/PaperContainer.tsx`

```tsx
const PaperContainer = ({ children }: PaperContainerProps) => {
    return (
        <Column className='w-full relative bg-inner-background outline-accent outline-2 outline-offset-2 rounded-xl'>
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 12,
                    opacity: 0.5,
                    backgroundImage: "url('https://dydrl5o9tb.ufs.sh/f/6bPCFkuBjl92dnXGroFLInwCTmuU48v7QcbPaXDEgKZzYeBq')",
                    backgroundRepeat: 'repeat',
                    backgroundSize: '642px 642px',
                    mixBlendMode: 'multiply',
                }}
            />
            <Column className='w-full bg-none rounded-xl p-4 m-0'>
                {children}
            </Column>
        </Column>
    );
};
```

The PaperContainer has a simple `outline-accent` border. The user wants to replace this with the guilded design language.

---

## 10. The GameTabBar System

### Current Architecture

File: `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/GameTabBar.tsx`

```tsx
export type GameTabDefinition<TTab extends string> = {
    label: string;
    condensedLabel: string;
    value: TTab;
    icon: React.ReactNode;
};

interface GameTabBarProps<TTab extends string> {
    activeTab: TTab;
    onTabPress: (tab: TTab) => void;
    tabs: GameTabDefinition<TTab>[];
}
```

### Usage in Game Pages

**OperatorGamePage.tsx:**
```tsx
const operatorTabs: GameTabDefinition<OperatorTab>[] = [
    { label: 'Players', condensedLabel: 'Players', value: 'players', icon: <GameUserIcon /> },
    { label: 'Roles', condensedLabel: 'Roles', value: 'config', icon: <Shield size={20} /> },
    { label: 'Nightly', condensedLabel: 'Nightly', value: 'nightly', icon: <Users size={20} /> },
    { label: 'Town Square', condensedLabel: 'Town Sq', value: 'forum', icon: <MessageSquare size={20} /> },
    { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <Newspaper size={20} /> },
    { label: 'Config', condensedLabel: 'Config', value: 'rulebook', icon: <ScrollText size={20} /> },
];

// In component:
<GameTabBar activeTab={activeTab} onTabPress={setActiveTab} tabs={operatorTabs} />
```

**PlayerGamePage.tsx:**
```tsx
const playerTabs: GameTabDefinition<PlayerTab>[] = [
    { label: 'Town Square', condensedLabel: 'Town Sq', value: 'townSquare', icon: <MessageSquare size={20} /> },
    { label: 'Newspaper', condensedLabel: 'News', value: 'newspaper', icon: <Newspaper size={20} /> },
    { label: 'Your Eyes Only', condensedLabel: 'Your Eyes Only', value: 'eyesOnly', icon: <Eye size={20} /> },
    { label: 'Rule Book', condensedLabel: 'Rule Bk', value: 'ruleBook', icon: <BookUser size={20} /> },
    { label: 'Phone Book', condensedLabel: 'Phone Bk', value: 'phoneBook', icon: <Phone size={20} /> },
];
```

---

## 11. Implementation Notes for New Agents

### When to Use Which Variant

| Scenario | Variant | Notes |
|----------|---------|-------|
| Primary action ("Save", "Submit") | `accent` | Gold ring, dark center |
| Secondary action ("Cancel", "Announcement") | `secondary` | Silver ring, page background |
| Dialog buttons | Keep existing | Don't change modal/dialog buttons |
| List of 2 main actions | Mix both | Primary = accent, Secondary = secondary |

### The 48px Height Standard

All guilded buttons should use `height={48}` as the total outer height. This:
- Matches the app's standard `h-12` (48px) button height
- Accounts for border thickness automatically
- Centers content properly with `contentPaddingY={0}`

### Critical Code Patterns

**Pattern 1: Basic Usage**
```tsx
<AppButton variant='accent' onPress={handlePress}>
    <PoppinsText color='white'>Click Me</PoppinsText>
</AppButton>
```

**Pattern 2: With Icon**
```tsx
<AppButton variant='accent' className='px-0'>
    <Row className='items-center gap-2'>
        <Plus size={20} color='white' />
        <PoppinsText color='white'>Add Item</PoppinsText>
    </Row>
</AppButton>
```

**Pattern 3: Two-Action Layout**
```tsx
<Row className='items-center gap-2'>
    <AppButton variant='secondary' onPress={handleCancel}>
        <PoppinsText>Cancel</PoppinsText>
    </AppButton>
    <AppButton variant='accent' onPress={handleSave}>
        <PoppinsText color='white'>Save</PoppinsText>
    </AppButton>
</Row>
```

---

## 12. Files That Need Updating (Known List)

### Primary Buttons to Convert

Based on grep search, these files use `variant='accent'` and should be reviewed:

1. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/ArchivedGamesDialog.tsx`
2. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/ChangeDateInfo.tsx`
3. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/DaysTable.tsx`
4. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/ForegroundControls.tsx`
5. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/GetStartedButton.tsx`
6. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/JoinGameButton.tsx`
7. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/NewspaperPage.tsx`
8. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/PlayerDaysSection.tsx`
9. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/PlayerTable.tsx`
10. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/TownSquarePageOPERATOR.tsx`
11. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/TownSquarePostDialog.tsx`

### Tab Bar Files (Major Change)

1. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/GameTabBar.tsx` - Complete redesign
2. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/OperatorGamePage.tsx` - Uses GameTabBar
3. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/PlayerGamePage.tsx` - Uses GameTabBar

### Container Files

1. `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/PaperContainer.tsx` - Update border to guilded style

---

## 13. Tab Design Specification

### The User's Requirements for Tabs

From the prompt:

> "I DONT want the corner-shape: scoop type of look of the buttons on the main tabs. instead u should translate this look of the outline (but with a more normal just sides and top outline with rounded top left and right corners)"

### Translation

The tabs should use the guilded ring colors but with a DIFFERENT shape:
- **NO** scooped corners (don't use the radial-gradient mask technique)
- **YES** to the ring color system (gold/silver presets)
- Shape: Normal rounded corners, only on top-left and top-right
- Border: Outline on sides and top only (no bottom border - it connects to content)

### Visual Concept

```
Current button:        Tab should be:
┌─╮   ╭─┐            ╭──────────╮
│ │╭──╮│ │            │  Tab     │
│ ╰┘  └╯ │            │          │
│ Content│            ├──────────┘
└────────┘            │ Content  │
                      └──────────┘
  (scooped)            (rounded top, outline sides+top)
```

---

## 14. Quick Reference: The Complete System

### File Path Summary

| Component | Path |
|-----------|------|
| GuildedButton (Web) | `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/buttons/GuildedButton.web.tsx` |
| GuildedButton (Native) | `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/buttons/GuildedButton.tsx` |
| Shared Config | `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/buttons/GuildedButton.shared.ts` |
| AppButton (Public API) | `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/buttons/AppButton.tsx` |
| GameTabBar | `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/GameTabBar.tsx` |
| PaperContainer | `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/PaperContainer.tsx` |
| Operator Game Page | `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/OperatorGamePage.tsx` |
| Player Game Page | `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/game/PlayerGamePage.tsx` |
| Prototype HTML | `/Users/malachyfernandez/Documents/1-programing/wolfspoint-extra/testiongButton.html` |

### Color Values (Current)

**Gold Ring:**
- outerDark: `#bf6c18`
- outerLight: `#ecd9ab`
- middle: `#d9b458`
- innerLight: `#c79a2e`
- innerDark: `#ba681e`

**Silver Ring:**
- outerDark: `#595f66`
- outerLight: `#dde3e8`
- middle: `#aeb5bd`
- innerLight: `#818a93`
- innerDark: `#6f7780`

### Thickness Defaults

```typescript
outerThickness: 1,    // px
middleThickness: 3,   // px
innerThickness: 1,    // px
totalThickness: 5,    // sum of all
```

---

## 15. Final Notes

### What Makes This System Special

1. **Platform-aware**: Different implementations for web vs native
2. **Theme-integrated**: Supports CSS theme tokens via uniwind
3. **Preset-based**: Simple `variant="gold" | "silver"` API
4. **Height-intelligent**: Pass total height, inner area auto-calculated
5. **Safari-hardened**: 20-step animation workaround for browser bugs
6. **CSS-variable driven**: All styling through CSS custom properties

### Common Pitfalls to Avoid

1. **Don't manually calculate heights** - Use `height={48}` and let the component do the math
2. **Don't pass `px` suffix** - Pass numbers like `15`, not `"15px"`
3. **Don't forget `contentPaddingY={0}`** - Required for proper centering with fixed height
4. **Don't change dialog buttons** - The user said modal/dialog buttons should stay as-is
5. **Don't use scooped corners on tabs** - Tabs should use rounded corners, not the scoop mask

---

## 16. Historical Failures & What NOT to Do

### The CSS Mask Problem

The scooped corner effect is EXTREMELY fragile. The original HTML prototype (`testiongButton.html`) uses `-webkit-mask` with radial gradients to create the cutout corners. This works in the HTML file but has serious issues when translated to React Native Web:

**❌ DON'T: Try to use CSS mask properties directly in React Native styles**
```javascript
// This does NOT work - RN doesn't support CSS masks
style={{
    WebkitMask: 'radial-gradient(...)',  // Won't render
    mask: 'radial-gradient(...)'         // Won't render
}}
```

**✅ DO: Inject CSS via `dangerouslySetInnerHTML`**
```javascript
// This is the ONLY way to get masks working in RN Web
<style dangerouslySetInnerHTML={{ __html: cssString }} />
```

### The Unistyles Mistake

Early attempts used `react-native-unistyles` for styling:

```javascript
// ❌ WRONG - This library is NOT in the project dependencies
import { createStyleSheet, useStyles } from 'react-native-unistyles';
```

This failed because `unistyles` isn't installed. The project uses:
- **Native**: Standard `StyleSheet.create` from React Native
- **Web**: CSS-in-JS via `dangerouslySetInnerHTML` + injected CSS string

### The Platform-Specific File Confusion

The biggest source of bugs: **Editing `GuildedButton.tsx` and expecting changes on web**.

| File | When It Runs | Common Mistake |
|------|--------------|----------------|
| `GuildedButton.tsx` | Native (iOS/Android) | Changing this does NOTHING on web |
| `GuildedButton.web.tsx` | Web (Browser) | This is where web changes must go |
| `GuildedButton.shared.ts` | Both | Safe place for shared logic |

**The Rule**: If you're testing in a browser and changes aren't showing, you're editing the wrong file.

### The Height Calculation Confusion

Multiple failed attempts at height handling:

**❌ Attempt 1: Naive height passing**
```javascript
height={48}  // Inner box was 48px, outer button became 48 + borders = 58px
```

**❌ Attempt 2: Manual subtraction**
```javascript
height={48 - 2 - 6 - 2}  // Magic numbers, fragile if defaults change
```

**✅ Solution: `getGuildedInnerHeight()` helper**
```javascript
// height prop = total outer height
// component internally computes inner height
height={48}  // Results in 38px inner area (48 - 5*2)
```

### The Color String vs Theme Token Confusion

**❌ Early bug: Hardcoded colors**
```typescript
centerBackgroundFrom="#3a3a3a"
centerBackgroundTo="#2a2a2a"
```

**❌ Second bug: Invented theme tokens**
```typescript
background="page-background"  // This isn't a real CSS variable
```

**✅ Solution: Use real theme tokens from `global.css`**
```typescript
background="inner-background"  // Resolves to --color-inner-background
```

Real available tokens:
- `background`
- `inner-background`
- `text`
- `text-inverted`
- `accent`
- `border`

### The Safari Animation Bug

Safari has a long-standing bug where `filter: drop-shadow()` doesn't animate smoothly with CSS transitions. Early attempts:

**❌ Failed attempt: Standard transition**
```css
.shadow-wrapper {
    transition: filter 0.3s ease;
}
.shadow-wrapper:hover {
    filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.4));
}
```

This caused Safari to either:
- Not animate at all
- Flicker between states
- Lag during the transition

**✅ Solution: 20-step keyframe animation**
```css
@supports (-webkit-appearance: none) and (not (-ms-ime-align: auto)) {
    /* Safari detected - use keyframes instead of transition */
    .shadow-wrapper { transition: none; }
    
    @keyframes guilded-shadow-animation {
        0% { --out-y: 3px; --out-blur: 3px; }
        5% { --out-y: 2.9px; --out-blur: 2.9px; }
        /* ... 20 incremental steps ... */
        100% { --out-y: 1px; --out-blur: 1px; }
    }
}
```

The 20-step animation forces Safari to recalculate each frame, creating the illusion of smooth interpolation.

### The Native vs Web Prop Drift

At one point, `GuildedButton.tsx` (native) had completely different props than `GuildedButton.web.tsx` (web). This meant:

- Components using `centerBackgroundFrom` worked on web but crashed on native
- Default values were different between platforms
- The "same" button looked different on web vs mobile

**✅ Solution: Shared `GuildedButtonProps` interface in `.shared.ts`**

Both files now import the same interface and defaults, ensuring consistency.

---

## 17. Intimate Details: What We're Actually Trying to Achieve

### The Vision

The user wants to replace the boring, flat Material Design-style buttons with something that feels:

1. **Premium** - Like a high-end physical object
2. **Tactile** - You can almost feel the layers
3. **Old-world craftsmanship** - The "guilded" (gold-trimmed) aesthetic
4. **Consistent** - Same design language across the entire app

### The Psychological Effect

The scooped corners + triple border + gradient rings create an illusion of:
- **Depth** - Multiple layers receding into the button
- **Bevel** - Like a 3D embossed surface
- **Craftsmanship** - Suggests hand-tooled detail, not machine-stamped

### The Technical Achievement

What makes this impressive:

1. **Pure CSS** - No images, SVGs, or canvas
2. **Variable-driven** - All dimensions controllable via props
3. **Cross-platform** - Works on web AND native (simplified on native)
4. **Theme-aware** - Colors resolve from CSS variables
5. **Accessible** - Keyboard navigation, screen reader support

### The "Magic" Numbers Explained

| Value | Why It Works |
|-------|--------------|
| `51% 51%` mask size | Slight overlap prevents subpixel gaps between corner masks |
| `+0.5px` in mask calc | Creates hard edge at radius boundary |
| `--t-out: 1px` | Thin outer ring - delicate gold foil look |
| `--t-mid: 3px` | Thick middle - the "body" of the frame |
| `--t-in: 1px` | Thin inner ring - echoes outer, creates sandwich effect |
| `20px` radius (prototype) | Was too large, now `8px` for tighter look |
| `48px` total height | Matches `h-12` Tailwind standard |

### The Gold vs Silver Psychology

| Variant | Use Case | Emotional Response |
|---------|----------|-------------------|
| **Gold** | Primary actions | "This is important", "Reward", "Premium" |
| **Silver** | Secondary actions | "This is safe", "Alternative", "Supporting" |

### Why We Don't Use It Everywhere

The user specifically said:

> "the ones in modals (dialogues) can probably stay"

**Reason**: The guilded effect is VISUALLY LOUD. It demands attention. If every button screams, nothing stands out. Reserve it for:

- Primary actions on main screens
- "Hero" buttons (the ONE thing you want users to do)
- Navigation tabs (the gateway to entire sections)

Dialog buttons stay flat because:
- They're temporary/interruptive
- User just wants to dismiss and get back to the main UI
- Too much ornamentation in a dialog feels cluttered

---

## 18. The Tab Design Philosophy

### Why Tabs Are Special

The current `GameTabBar` uses `NavTab` and `MiddleNavTab` components. The user wants to replace this with the guilded design language BUT with a different shape.

### The Tab Shape Problem

**Buttons have:**
- Full scoop on all 4 corners
- Complete border (all sides)
- Standalone visual unit

**Tabs should have:**
- Rounded top corners only
- Border on sides + top only
- Bottom connects to content (no border)
- Active tab should feel "highlighted"

### Visual Comparison

```
Button (GuildedButton):          Tab (GuildedTab concept):
┌─╮      ╭─┐                    ╭──────────╮
│ │ ╭──╮ │ │                    │  Label   │
│ ╰─┘  └─╯ │                    │    ★     │
│          │                    ├──────────┤  ← No bottom border
│ Content  │                    │          │    (connects to content)
└──────────┘                    │ Content  │
                                 └──────────┘
[4 scooped corners]             [Rounded top only]
[Full border ring]              [Ring on sides+top]
```

### The Implementation Challenge

Tabs need:
1. **Active state styling** - Which tab is selected?
2. **Connected visual** - Tab connects to content area
3. **Responsive layout** - Condensed labels on narrow screens
4. **Multiple tabs** - Handle 5-6 tabs gracefully

Current `GameTabBar` handles:
- Condensed labels at `< 600px` width
- Icon + text layout
- Active tab tracking

The guilded version must preserve these behaviors while adding the visual polish.

### The Color Strategy for Tabs

Suggested approach:

| Tab State | Ring Variant | Center Fill |
|-----------|--------------|-------------|
| **Active** | Gold | Dark grey (`#2f2f2f`) |
| **Inactive** | Silver | Transparent or page bg |
| **Hover** | Gold (brighter) | Slightly darker |

This creates a visual hierarchy where the active tab "pops" and inactive tabs recede.

---

## 19. The PaperContainer Connection

### Current State

`PaperContainer` has a simple border:

```tsx
<Column className='... outline-accent outline-2 outline-offset-2 rounded-xl'>
```

This is a single-color outline, not the guilded multi-layer effect.

### The Vision

The main content container should also use the guilded ring system, creating a frame around the entire game page content. This unifies:
- The tab bar (top)
- The content area (middle)
- The border (surrounding)

### Implementation Complexity

**Challenge**: The PaperContainer is a COLUMN layout, not a button. The CSS would need to:

1. Apply the triple-ring effect to a container, not a button
2. Handle the content area inside the ring
3. Work with the textured background overlay

**Current workaround**: The outline stays simple, tabs get the guilded treatment.

**Future possibility**: Create a `GuildedContainer` component using the same ring presets but for layout containers.

---

## 20. What Success Looks Like

### After Implementation

1. **Primary buttons** (Save, Submit, Create, etc.) use `variant='accent'` → Gold ring
2. **Secondary buttons** (Cancel, Announcement) use `variant='secondary'` → Silver ring
3. **Tabs** (Town Square, Newspaper, etc.) have gold/silver rings with rounded top corners
4. **Visual consistency** - Everything feels like part of the same design language
5. **No modal changes** - Dialog buttons stay flat (per user instruction)

### The User's Test Criteria

From the prompt images, the user wants:

- The "I am alone" button to look premium
- The "Edit profile" button to stand out
- The "Town Sq", "News", "Your Eyes Only" tabs to feel crafted
- The border around the Phone Book section to have the guilded treatment

Everything should feel **intentional** and **crafted**, not **default** and **boring**.

---

**End of Documentation**

