# Responsive Design Refactor Summary

This document outlines the comprehensive responsive design changes implemented across the Wolffspoint codebase to improve mobile and tablet layouts.

## Overview

A major refactor was performed to standardize responsive patterns throughout the application, focusing on:
- Converting gap props to Tailwind classes for better responsive control
- Implementing width-based conditional rendering using `useWindowDimensions`
- Adding responsive breakpoints for better mobile/tablet experiences
- Standardizing button sizing and layout patterns

## Key Changes

### 1. Gap Prop Standardization

**Problem**: Mixed usage of `gap={number}` props and Tailwind gap classes made responsive behavior inconsistent.

**Solution**: Replaced all `gap={number}` props with Tailwind `gap-{size}` classes for better responsive control.

**Examples**:

```tsx
// Before
<Column gap={4}>
<Row gap={2}>

// After  
<Column className='gap-4'>
<Row className='gap-2'>
```

**Files Changed**:
- `app/components/layout/Row.tsx` - Removed gap prop, added `mergeGapStyle` utility
- `app/components/ui/PaperContainer.tsx`
- `app/components/game/AllGamesPage.tsx`
- `app/components/game/ProfileInfo.tsx`
- `app/components/game/NewWolffspointButtonAndDialogue.tsx`
- `app/components/game/PlayerAccessGate.tsx`
- And many more...

### 2. Responsive Button Layouts

**TownSquareThreadListView** - Implemented width-based conditional rendering:

```tsx
const { width } = useWindowDimensions();
const isLargeScreen = width >= 400;

{isLargeScreen ? (
    // Horizontal layout for larger screens
    <Row className='gap-4 justify-between sm:justify-end flex-1 items-center'>
        <AppButton variant='secondary' className='px-0' onPress={onNewAnnouncement}>
            {/* Announcement button with details */}
        </AppButton>
        <AppButton variant='accent' className='px-0' onPress={onNewThread}>
            {/* Thread button */}
        </AppButton>
    </Row>
) : (
    // Vertical layout for smaller screens  
    <Column className='gap-0 justify-between sm:justify-end flex-1 items-center'>
        <AppButton variant='accent' className='px-0 w-full' onPress={onNewThread}>
            {/* Thread button full width */}
        </AppButton>
        <AppButton variant='secondary' className='px-0 w-full' onPress={onNewAnnouncement}>
            {/* Announcement button full width */}
        </AppButton>
    </Column>
)}
```

**PhoneBookPagePLAYER** - Added responsive edit button:

```tsx
const { width } = useWindowDimensions();
const showEditButton = width >= 410;

// Conditional edit button in header
{showEditButton && (
    <AppButton variant='accent' className='w-40' onPress={onEditProfile}>
        <FontText weight='medium' color='white'>Edit profile</FontText>
    </AppButton>
)}

// Full-width edit button for mobile when not shown in header
{!showEditButton && (
    <Row className='-mt-2'>
        <AppButton variant='accent' className='w-full' onPress={() => setIsProfileDialogOpen(true)}>
            <FontText weight='medium' color='white'>Edit profile</FontText>
        </AppButton>
    </Row>
)}
```

### 3. Responsive Button Sizing

Standardized button widths across dialogs and forms:

```tsx
// Small screens
<AppButton variant='outline' className='w-20' onPress={onCancel}>
    <FontText weight='medium'>Cancel</FontText>
</AppButton>

// Large screens  
<AppButton variant='outline' className='w-20 sm:w-36' onPress={onCancel}>
    <FontText weight='medium'>Cancel</FontText>
</AppButton>
```

**Files**:
- `app/components/game/markdownEditor/ActionButtons.tsx`
- `app/components/game/PlayerProfileDialogNEW.tsx`

### 4. Mobile-First Layout Adjustments

**TownSquareThreadDetailView** - Responsive author information layout:

```tsx
// Mobile: Compact layout
<Row className='sm:hidden w-full items-center'>
    <TownSquareAuthorAvatar gameId={selectedThread.gameId} size={60} userId={selectedThread.authorUserId} />
    <Column className='flex-1 gap-2'>
        <TownSquareAuthorName gameId={selectedThread.gameId} userId={selectedThread.authorUserId} />
        <FontText variant='subtext'>{formatTimestamp(selectedThread.createdAt)}</FontText>
    </Column>
</Row>

// Desktop: Full layout with title
<Row className='gap-4 items-start'>
    <TownSquareAuthorAvatar gameId={selectedThread.gameId} size={60} userId={selectedThread.authorUserId} className="hidden sm:flex" />
    <Column className='gap-4 flex-1'>
        <FontText weight='bold' className='text-3xl leading-10'>{selectedThread.titleResolved}</FontText>
        <Column className='gap-1 hidden sm:flex'>
            <TownSquareAuthorName gameId={selectedThread.gameId} userId={selectedThread.authorUserId} />
            <FontText variant='subtext'>{formatTimestamp(selectedThread.createdAt)}</FontText>
        </Column>
    </Column>
</Row>
```

### 5. Dynamic Indent Sizing

**TownSquareReplyBranch** - Responsive comment threading:

```tsx
const { width: screenWidth } = useWindowDimensions();
const indentSize = useMemo(() => (screenWidth < 450 ? 16 : 24), [screenWidth]);

// Dynamic indent based on screen size
<Column key={node.commentId} className='gap-3'>
    <Row className='gap-4 items-start border-l-[1px] border-border/25 pl-4' style={{ marginLeft: depth * indentSize }}>
        {/* Comment content */}
    </Row>
</Column>
```

### 6. Responsive Tab Styling

**GameTabBar.web.tsx** - Added CSS for responsive tab behavior:

```css
/* Allow text wrapping for center nav tab only */
.guilded-game-tab-wrap.is-center .guilded-game-tab-label {
    white-space: normal;
    word-wrap: break-word;
}

/* Decrease font size for non-center tabs on small screens */
@media (max-width: 380px) {
    .guilded-game-tab-wrap:not(.is-center) .guilded-game-tab-label {
        font-size: 7px;
    }
}
```

### 7. Page-Level Responsive Padding

**PhoneBookPagePLAYER** - Mobile-first padding adjustment:

```tsx
// Before: Uniform padding on all screens
<Column className='gap-6 flex-1 p-4'>

// After: Reduced vertical padding, responsive horizontal padding
<Column className='gap-6 flex-1 py-3 sm:px-4'>
```

**RuleBookPagePLAYER** - Consistent padding pattern:

```tsx
// Responsive padding matching PhoneBook pattern
<Column className='gap-4 flex-1 py-3 sm:px-4'>
```

This pattern reduces vertical space usage on mobile while maintaining comfortable horizontal margins on larger screens.

### 8. Dialog Responsive Improvements

**PlayerProfileDialogNEW** - Mobile-friendly dialog sizing:

```tsx
// Reduced max height for mobile
<ConvexDialog.Content className='max-w-6xl max-h-[72vh]'>

// Responsive padding
<Column className='gap-6 px-2 sm:px-5 pb-2'>

// Responsive button sizing
<AppButton variant='outline' className='w-20 sm:w-36' onPress={handleAttemptClose}>
    <FontText weight='medium'>Cancel</FontText>
</AppButton>
```

### 9. TownSquare Avatar Component Enhancements

**TownSquareAvatar & TownSquareAuthorAvatar** - Added className prop support for responsive styling:

```tsx
// Updated interface to support className
interface TownSquareAvatarProps {
    className?: string;
    fallbackLabel?: string;
    size?: number;
    uri: string;
}

// Updated interface for author avatar wrapper
interface TownSquareAuthorAvatarProps {
    className?: string;
    gameId: string;
    size?: number;
    userId: string;
}

// Usage in responsive layouts
<TownSquareAuthorAvatar 
    gameId={selectedThread.gameId} 
    size={60} 
    userId={selectedThread.authorUserId} 
    className="hidden sm:flex" 
/>
```

**Files**:
- `app/components/game/townSquare/TownSquareAvatar.tsx` - Added className prop support
- `app/components/game/townSquare/TownSquareAuthorIdentity.tsx` - Added className prop and pass-through
- `app/components/game/townSquare/TownSquareThreadDetailView.tsx` - Applied responsive className usage

## Responsive Breakpoints Used

- **400px**: Small screen threshold (TownSquare buttons)
- **410px**: Edit button visibility threshold (PhoneBook)
- **450px**: Comment indent sizing threshold (TownSquare replies)
- **500px**: Original breakpoint (updated to 400px)
- **sm (640px)**: Standard Tailwind small breakpoint

## Technical Implementation Details

### Gap Style Merging

Created utility function in `app/components/layout/Row.tsx`:

```tsx
import { mergeGapStyle } from './gapStyle';

// Usage
<View className={`flex-row ${className}`} style={mergeGapStyle(className, style)}>
```

### Width Detection Pattern

Standardized pattern for responsive behavior:

```tsx
import { useWindowDimensions } from 'react-native';

const { width } = useWindowDimensions();
const isLargeScreen = width >= [breakpoint];

// Conditional rendering
{isLargeScreen ? <LargeScreenComponent /> : <SmallScreenComponent />}
```

### Responsive Class Patterns

- **Padding**: `px-2 sm:px-4` for mobile-first padding
- **Button widths**: `w-20 sm:w-36` for responsive buttons
- **Visibility**: `hidden sm:flex` for desktop-only elements
- **Text wrapping**: Conditional text wrapping for long labels

## Files Modified

### Core Layout Components
- `app/components/layout/Row.tsx` - Removed gap prop, added gap style merging
- `app/components/ui/PaperContainer.tsx` - Added gap classes

### Game Components
- `app/components/game/TownSquareThreadListView.tsx` - Major responsive refactor
- `app/components/game/TownSquareThreadDetailView.tsx` - Responsive author layout
- `app/components/game/TownSquareReplyBranch.tsx` - Dynamic indent sizing
- `app/components/game/TownSquareThreadListItem.tsx` - Responsive timestamp display
- `app/components/game/PhoneBookPagePLAYER.tsx` - Responsive edit button
- `app/components/game/PlayerProfileDialogNEW.tsx` - Mobile-friendly dialog
- `app/components/game/PlayerAccessGate.tsx` - Added gap classes
- `app/components/game/AllGamesPage.tsx` - Gap class standardization
- `app/components/game/GamePage.tsx` - Gap class standardization
- `app/components/game/ProfileInfo.tsx` - Gap class standardization
- `app/components/game/NewWolffspointButtonAndDialogue.tsx` - Gap classes
- `app/components/game/RuleBookPagePLAYER.tsx` - Responsive padding
- `app/components/game/PlayerGamePage.tsx` - Gap classes

### TownSquare Components
- `app/components/game/townSquare/TownSquareAvatar.tsx` - Added className prop support
- `app/components/game/townSquare/TownSquareAuthorIdentity.tsx` - Added className prop and pass-through
- `app/components/game/townSquare/TownSquareThreadDetailView.tsx` - Applied responsive className usage

### Editor Components
- `app/components/game/markdownEditor/ActionButtons.tsx` - Responsive buttons
- `app/components/game/markdownEditor/MainContent.tsx` - Responsive padding
- `app/components/game/markdownEditor/EditorPane.tsx` - Gap classes
- `app/components/game/MarkdownEditorDialog.tsx` - Responsive button layout

### UI Components
- `app/components/layout/BottomBar.tsx` - Gap classes
- `app/components/game/TownSquareComposerToolbar.tsx` - Gap classes

### Web Components
- `app/components/game/GameTabBar.web.tsx` - Responsive tab CSS
- `app/index.tsx` - Gap classes in auth flow

### Recent Chat Responsive Changes (April 20, 2026)

#### GameTabBar.web.tsx - Tab Text Responsiveness
Added responsive text behavior for the game tab bar:

1. **Center Tab Text Wrapping**: Added CSS rule to allow text wrapping specifically for the centered nav tab only:
   ```css
   .guilded-game-tab-wrap.is-center .guilded-game-tab-label {
       white-space: normal;
       word-wrap: break-word;
   }
   ```

2. **Non-Center Tab Font Scaling**: Added media query to decrease font size for non-center tabs on small screens:
   ```css
   @media (max-width: 380px) {
       .guilded-game-tab-wrap:not(.is-center) .guilded-game-tab-label {
           font-size: 7px;
       }
   }
   ```

**Breakpoint**: 380px (adjusted from 500px during chat)

**Impact**: 
- Center tab text can now wrap to prevent overflow on long labels
- Non-center tabs use smaller font size (7px) on screens under 380px
- Maintains visual hierarchy while improving mobile usability

#### PlayerProfileDialogNEW - Responsive Button Scaling and Padding

Applied responsive scaling treatment to the dialog's action buttons and content padding:

1. **Responsive Button Widths**: Standardized button sizing pattern from `ActionButtons.tsx`
   ```tsx
   // Before: Fixed widths
   <AppButton variant='outline' className='w-36' onPress={handleAttemptClose}>
   <AppButton variant='black' className='w-40' onPress={handleSave}>

   // After: Responsive widths with mobile-first approach
   <AppButton variant='outline' className='w-20 sm:w-36' onPress={handleAttemptClose}>
   <AppButton variant='black' className='w-28 sm:w-40' onPress={handleSave}>
   ```
   - **Cancel**: `w-20` (80px) on mobile → `sm:w-36` (144px) on sm+
   - **Save**: `w-28` (112px) on mobile → `sm:w-40` (160px) on sm+
   - Added `pt-1` for consistent vertical spacing

2. **Responsive Content Padding**: Mobile-first padding adjustments
   ```tsx
   // Before: Uniform padding
   <Column className='gap-4 flex-1 max-h-[70vh] min-h-0 pt-5 -mx-5'>
   <Column className='gap-6 px-5 pb-2'>

   // After: Responsive padding (desktop only when needed)
   <Column className='gap-4 flex-1 max-h-[70vh] min-h-0 sm:pt-5 -mx-5'>
   <Column className='gap-6 px-2 sm:px-5 pb-2'>
   ```
   - `pt-5` → `sm:pt-5`: Only apply top padding on larger screens
   - `px-5` → `px-2 sm:px-5`: Reduced horizontal padding (8px) on mobile, standard (20px) on sm+

**Impact**:
- More compact button bar on mobile devices
- Better space utilization in narrow viewports
- Consistent responsive scaling pattern across dialog components

## Impact

### Mobile Experience
- Better button layouts on small screens
- Improved dialog sizing and scrolling
- Responsive text wrapping and sizing
- Touch-friendly button targets

### Tablet Experience  
- Optimized layouts for medium screens
- Conditional element visibility
- Better space utilization

### Desktop Experience
- Maintained existing functionality
- Improved consistency across components
- Better responsive behavior

### Code Quality
- Standardized responsive patterns
- Reduced prop usage in favor of classes
- Improved maintainability
- Better TypeScript support for responsive classes

## Future Considerations

1. **Component Library**: Consider creating responsive button components to reduce duplication
2. **Breakpoint Standardization**: Establish consistent breakpoint values across the app
3. **Testing**: Add responsive testing to the test suite
4. **Documentation**: Create responsive design guidelines for future development

## Migration Guide

For future responsive changes:

1. Use `useWindowDimensions()` for width-based conditional rendering
2. Prefer Tailwind gap classes over gap props
3. Use responsive class prefixes (`sm:`, `md:`, `lg:`) for progressive enhancement
4. Follow the established breakpoint patterns
5. Test on actual devices, not just browser resizing

This refactor establishes a solid foundation for responsive design across the Wolffspoint application while maintaining backward compatibility and improving code maintainability.
