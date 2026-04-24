# Context on Current Session: Migration to DataProvider (Part 2)

## Goal
Complete the migration of the `PlayerGamePage`, `NewserGamePage`, and associated components from legacy `useUserVariable`/`useUserList` hooks to the centralized `DataProvider` system (`useValue`, `useList`, `useFindValues`, `useFindListItems`).

## Accomplishments
- **Player Page Migration**: Fully migrated `PlayerGamePage.tsx` and its tabs (`TownSquare`, `Newspaper`, `Rule Book`, `Your Eyes Only`, `Phone Book`). Added `Animated.View` transitions for tab switching.
- **Access Gates**: Migrated `PlayerAccessGate.tsx` and `ParticipantAccessGate.tsx` to use `useValue` for profiles and user data.
- **Newser Page Migration**: Confirmed `NewserGamePage.tsx` and its tabs are utilizing the DataProvider.
- **Bug Fixes**: Resolved critical TypeScript errors in `NewspaperWritingView.tsx` where a typo (`setUsepaper`) was breaking the undo/redo logic.
- **All Games Page**: Migrated `AllGamesPage.tsx` to use the new data hooks.

## Reverted Changes
- **MainPage Migration**: The migration of `MainPage.tsx` was attempted but reverted due to regressions. This file still uses legacy hooks and should be handled with caution in future sessions.

## Pending Work / Known Issues
- **TypeScript Errors**: There are approximately 30 strict-typing errors remaining in the codebase, primarily in `useTownSquareForum.ts` and Newspaper-related components. These are caused by implicit `any` types when mapping over results from `useFindListItems` and `useFindValues`.
- **Subscription Verification**: While logic is migrated, future sessions should verify in the Convex Dashboard that tab navigation no longer triggers redundant network requests for these specific components.
