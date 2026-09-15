# WolffsPoint

A social deduction game platform built with React Native, Expo, Convex backend, and Clerk authentication. WolffsPoint brings the classic Mafia/Werewolf party game experience to mobile and web with real-time multiplayer synchronization, role management, and immersive storytelling tools.

---

## What is WolffsPoint?

WolffsPoint is a **social deduction game** (similar to Mafia or Werewolf) where players are secretly assigned roles and must figure out who among them are the villains while the villains try to eliminate the townsfolk undetected.

### Core Gameplay Loop

1. **Setup Phase** — An operator creates a game, defines custom roles, and invites players via join codes
2. **Day Phase** — Players discuss, form alliances, and cast votes to eliminate suspected villains
3. **Night Phase** — Players secretly submit actions and votes before deadlines; special roles use their abilities
4. **Morning Reveal** — Results are published in the newspaper; eliminated players are announced
5. **Repeat** — The game continues until one faction achieves their win condition

---

## Key Features

### For Players
- **Your Eyes Only** — Private dashboard showing your role, actions, vote history, and day-by-day story
- **Town Square** — Public forum for announcements, discussions, and social posts
- **Phone Book** — Player directory with profiles, contact info, and status
- **Rule Book** — Living document with role descriptions and game rules
- **Newspaper** — Daily digest of eliminations, vote tallies, and dramatic narratives

### For Operators (Game Masters)
- **Player Management** — Add/remove players, assign roles, track participation
- **Role Editor** — Create custom roles with unique abilities, voting rights, and descriptions
- **Day Scheduler** — Configure real-world dates mapping to in-game days with configurable deadlines
- **Nightly Tools** — Review and process night actions, generate morning messages
- **Newspaper Editor** — Write dramatic daily summaries for all players to read
- **Town Square Moderation** — Oversee public discourse

### For Newsers
- Dedicated role for writing and publishing the daily newspaper without full player access
- Access to player-facing tabs (Rule Book, Town Square, Phone Book)
- No access to Your Eyes Only content

---

## Technical Stack

- **Frontend**: React Native with Expo (mobile + web)
- **Backend**: Convex (real-time sync, serverless functions)
- **Authentication**: Clerk (Google OAuth, secure sessions)
- **Styling**: TailwindCSS with custom gold/silver guilded design system
- **State Management**: Custom atom store (`hooks/useAtom.ts`) + Convex real-time subscriptions

---

## Requirements

- **Node.js** (LTS recommended, e.g. 20.x)
- **npm** (comes with Node)
- **Git**
- Expo tooling will be installed as part of `npm install`

---

## Getting Started

1. **Clone the repo**

   ```bash
   git clone https://github.com/malachyfernandez/WolffsPoint.git
   cd WolffsPoint
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file with:
   ```
   EXPO_PUBLIC_CONVEX_URL=your_convex_url
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   ```

4. **Run the app**

   ```bash
   npm run start      # Start Metro dev server
   npm run android    # Run on Android
   npm run ios        # Run on iOS simulator
   npm run web        # Run on web
   ```

### Additional Scripts

```bash
npm run prebuild     # Generate native iOS/Android project files
npm run lint         # Check code with ESLint + Prettier (no writes)
npm run format       # Auto-fix lint issues and format with Prettier
```

---

## Project Structure

```
app/
  components/
    game/                  # Game-specific UI components
      townSquare/          # Town Square forum (threads, replies, composer)
      newspaperPageOperator/ # Operator newspaper editor
      markdownEditor/      # Markdown editor + input options
      config/              # Day/action/vote deadline scheduling
    ui/                    # Reusable design system
      buttons/             # AppButton variants
      chrome/             # App chrome / navigation
      daySelector/        # Day picker components
      dialog/             # ConvexDialog + confirmation dialogs
      forms/              # FontTextInput, AppDropdown
      icons/              # SVGR-generated icon components
      markdown/           # MarkdownRenderer
      alert/              # Toast / alert components
    layout/                # Layout primitives (Column, Row)
  script/                  # Custom scripting language editor + runtime
contexts/                  # React contexts (Toast, Generation, DataProvider, etc.)
convex/                     # Backend functions and schema
hooks/                     # Custom React hooks
types/                     # TypeScript type definitions
utils/                     # Utility functions
  about-parts-of-this-codebase/  # In-depth architecture docs
scripts/                   # Top-level utility scripts (SVG rescaling, migrations)
```

---

## Backend Architecture

The Convex backend is a custom, privacy-aware **user-scoped key/value + list storage service**. It is **not** the default Convex boilerplate — see `convex/schema.ts` for the full schema.

### Core Tables

- **`globals`** — Simple global key/value store
- **`user_vars`** — Per-user key/value variables with privacy, filter/search/sort caches
- **`permissions`** — `user_vars` allow-list entries (for shared access)
- **`user_var_public_counts`** / **`user_var_owner_counts`** / **`user_var_shared_counts`** — Denormalized count tables for performant reads
- **`user_list_definitions`** — One row per `userToken + key`; list-level config
- **`user_lists`** — Actual list items, tied to a definition
- **`list_permissions`** — `user_list_definitions` allow-list entries
- **`user_list_public_counts`** / **`user_list_owner_counts`** / **`user_list_shared_counts`** — Denormalized count tables for list items

### Privacy Model

Each var/list can be `PUBLIC`, `PRIVATE`, or `SHARED` via an `allowList`. The schema uses many denormalized count tables and composite indexes to serve public/owner/shared queries efficiently. Values are pre-normalized into `searchValue`, `filterValue`, and `sortValue` columns backed by `searchIndex`/`index` definitions.

### Main Modules

| File | Purpose |
|---|---|
| `convex/schema.ts` | `defineSchema` with all tables |
| `convex/auth.config.ts` | Two Clerk auth providers (dev & prod domains) |
| `convex/user_vars.ts` | `get`, `length`, `set`, `updatePrivacy` for user-scoped vars |
| `convex/user_vars_get.ts` | `search` query (public/shared scoped, filter/search/pagination) |
| `convex/user_lists.ts` | `get`, `length`, `set`, `remove`, `updatePrivacy` for list items |
| `convex/user_lists_get.ts` | `search` query for list items |
| `convex/globals.ts` | `get` / `set` for the globals table |
| `convex/mathAi.ts` | `convertMathImageToMarkdown` action (OpenRouter) |
| `convex/uploadthing.ts` | `generatePublicImageUploadUrl` action (UploadThing) |
| `convex/migrations.ts` | Dev/admin mutations (`migrateUserVars`, `resetDevData`, `rebuildUserListCounts`) |
| `convex/devUtils.ts` | Dev-only `nukeAllTables`, `getTableCounts` |

Authentication is handled by Clerk; functions use `ctx.auth.getUserIdentity()` / `identity.subject` as the `userToken`. The project does not use Convex components (`defineComponent`).

---

## Data System (DataProvider)

The app uses a custom `DataProvider` system (replacing the legacy `useUserVariable` / `useUserList` hooks) with a global client cache to eliminate redundant Convex subscriptions. Core hooks live in `hooks/useData.ts`:

- **`useValue`** — Persistent single value per user per key
- **`useList`** — Persistent single item in a keyed list (by `itemId`)
- **`useFindValues`** — Read accessible variable rows by key across multiple users
- **`useFindListItems`** — Read accessible list rows by key, optionally across users
- **`useValueCount`** / **`useListCount`** — Fast count lookups via Convex index bounds

Data shapes, privacy, and defaults are defined centrally in `utils/dataConfig.ts`. For full documentation, see [`utils/about-parts-of-this-codebase/userVariables-system.md`](./utils/about-parts-of-this-codebase/userVariables-system.md).

### Search Hook

`useListSearch` (in `hooks/useListSearch.ts`) is a generic real-time search hook built on `useFindListItems`:

```typescript
import { useListSearch } from 'hooks/useListSearch';

const { items, additionalItems, isLoading, hasResults, resultCount } = useListSearch<MathDocument>({
    searchQuery: 'math homework',
    userIds: ['user123'],
    searchKey: 'mathDocuments',
    additionalKeys: ['mathDocumentPages'], // optional; only the first key is used
    preserveResultsDuringLoading: true,    // default; caches last results to avoid flicker
});
```

Parameters:
- `searchQuery` (string): The search query to filter items
- `userIds` (string[]): Array of user IDs to search within
- `searchKey` (string): The key of the list to search (required)
- `additionalKeys` (`[string]`, optional): A single additional key to fetch related data (e.g. pages)
- `preserveResultsDuringLoading` (boolean, optional): Maintains last successful results during loading (default: `true`)

Returns:
- `items` (`T[] | undefined`): Matching items from the primary search
- `additionalItems` (`any[][] | undefined`): Related data (one array per additional key)
- `isLoading` (boolean): Whether the search is in progress
- `hasResults` (boolean): Whether there are any search results
- `resultCount` (number): Number of items found

The deprecated `useDocumentSearch` (same file) is a thin wrapper kept for backward compatibility — prefer `useListSearch`.

---

## Game Architecture

### Roles
Roles define a player's abilities, voting rights, and faction allegiance. The operator creates and assigns roles before the game begins.

### Days & Deadlines
Games span multiple in-game days, each mapped to real-world date ranges. Players must submit votes and actions before configurable deadlines (action deadline, vote deadline).

### The Nightly Flow
Each night, players:
1. Receive their role-specific instructions
2. Submit actions (if their role has them)
3. Cast votes for elimination
4. Wait for morning reveal

The operator reviews submissions and releases results at the configured wake-up time.

### Scripting System
The app includes a custom scripting language (`app/script/`) with a block-based editor and runtime interpreter. Scripts run in two places:
1. **Role messages** — embedded in markdown via `/*script ... script*/` blocks, with input/dropdown/selector support
2. **Tag triggers** — run immediately when a tag is added to a cell, using special globals (`placedTag`, `placedUser`, `placedDay`, `placedColumn`)

See [`utils/about-parts-of-this-codebase/about-this-codebase.md`](./utils/about-parts-of-this-codebase/about-this-codebase.md) for the full architecture guide.

---

## License

Private — All rights reserved.
