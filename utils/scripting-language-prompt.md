# Prompt: Design a Scratch-Like Scripting Language for WolffsPoint Mafia Game Engine

## What You Are Building

You are designing a **block-based scripting language** (think Scratch / visual block coding) for an app called **WolffsPoint** — a mafia-style game creation and management tool. The operator (game host) uses this app to create a mafia game, invite players via join codes, manage multi-day gameplay, and author all game content in markdown. Players join, get assigned roles, submit nightly actions/votes, read newspapers, post in a town square, and manage their profiles.

The scripting language will **replace the existing inline markdown input system** and **extend it to allow arbitrary logic in any markdown field**. Instead of hardcoded input token types like `/["Target":SELECT_PLAYER_ALIVE]/`, the operator will be able to write expressive logic that dynamically computes what options a dropdown should show, how many items can be selected, what labels to use, and much more — all authored in a visual block language with a text-based representation underneath.

### Example of the Target Scripting Language

```
Variable ({NAME = "deadPlayers",
VALUE = players.Filter(Item => (Item.entry.isDead) == true)
});

CreateSelectInput ({
LIST = deadPlayers,
NUMSELECTABLE = (deadPlayers.length / 2).floor,
LABEL = "Back From Dead"
});
```

This would:
1. Define a variable `deadPlayers` that filters the game's player list to only dead players
2. Create a dropdown input labeled "Back From Dead" whose options are the dead players, where the player can select up to half of the currently dead players

The same logic would have a **block-code visual representation** (drag-and-drop blocks in a Scratch-like editor) and a **text representation** (shown above) that the blocks compile to/from.

The language should be **super customizable** — `CreateSelectInput` is just one of many functions. Other functions like `CreateMarkdown`, `CreateTextInput`, `CreateCheckbox`, `CreateConditional`, etc. should be designed. The operator should be able to write logic like this in **any markdown field** in the app.

---

## Project Architecture Overview

WolffsPoint is a **React Native + Expo** application (also deployed as a web app via Vercel). It uses:

- **React Native** with **Expo** for cross-platform mobile + web
- **Convex** as the backend database with real-time sync
- **Clerk** for authentication (Google OAuth)
- **Tailwind CSS** (NativeWind) for styling
- **React Native Reanimated** for animations
- **TypeScript** strict mode

### App Flow

```
app/index.tsx (Entry Point)
├── SignedOut → Auth Flow (Google OAuth via Clerk)
└── SignedIn → MainPage.tsx
    └── StateAnimatedView.Container
        ├── AllGamesPage (page 1) — list of games, join/create
        └── GamePage (page 2) — active game with tabbed interface
            ├── Operator tabs: Players, Roles/Config, Nightly, Town Square, Newspaper, Config
            └── Player tabs: Town Square, Newspaper, Your Eyes Only, Rule Book, Phone Book
```

### Component Philosophy

- **Componentize everything** — each component owns its state and behavior
- **Self-contained data subscriptions** — components subscribe directly to data hooks, no prop-drilling for persistent data
- **Modular architecture** — many small self-contained components that subscribe to their own data
- **Dialogs/modals preferred** over jumping layouts for editing flows
- **Operator-side and player-side code paths are separate**

---

## Data System (The Backbone)

### DataProvider Architecture

The app uses a **DataProvider** system with a global client-side cache (`DataStore`). Key principles:

- Components "register" and "unregister" from the DataStore cache
- Only **one Convex subscription per piece of data** — multiple components requesting the same data share the cached result
- Ref-count system: data stays in cache as long as at least one component is registered, with a grace period for tab switching
- **Never pass persistent data through props** to avoid redundant queries — each component subscribes independently

### Core Hooks (from `hooks/useData.ts`)

#### `useValue<T>(key: string)`
Persistent single value per user per key.
```ts
const [profile, setProfile] = useValue<Profile>("profile");
// profile.value: current UI value
// profile.confirmedValue: last server-confirmed value
// profile.state: sync + op status metadata
```

#### `useList<T>(key: string, itemId: string)`
Persistent single item in a keyed list.
```ts
const [post, setPost] = useList<Post>("posts", "post_123");
```

#### `useFindValues<T>(key: string, options)`
Reads accessible variable rows by key across multiple users. Requires exact filter configuration.
```ts
const profiles = useFindValues<Profile>("profile", {
  searchFor: "ali",
  filterFor: "admin",
  userIds: friendIds,
  returnTop: 10,
});
```

#### `useFindListItems<T>(key: string, options)`
Reads accessible list rows by key, optionally across multiple users.
```ts
const posts = useFindListItems<Post>("posts", {
  itemId: "post_123",
  searchFor: "react",
  userIds: friendIds,
  returnTop: 10,
});
```

#### `useValueLength` / `useListLength`
Fast count lookups leveraging Convex index bounds without downloading actual data.

### Centralized Configuration (`utils/dataConfig.ts`)

All data keys are defined **once** in `utils/dataConfig.ts` with their type, privacy, default value, search keys, filter keys, and sort keys. If a key is missing from `DATA_CONFIG`, it falls back to empty config, but all keys should be registered there.

### Privacy Model

- `"PRIVATE"`: owner only
- `"PUBLIC"`: everyone
- `string[]`: stored as `{ allowList: string[] }`, owner always has access

### Game-Scoped Keys

Game-scoped variable keys are built with:
```ts
getGameScopedKey(baseKey, gameId) === `${baseKey}-${gameId}`
```

Day-scoped player submission keys:
```ts
getGameScopedKey(`playerNightSubmission-day-${dayIndex}`, gameId)
```

---

## Complete Data Schema (All User Variables and User Lists)

This is the authoritative reference for every data key in the app. The scripting language must be able to reference and manipulate these data sources.

### Value Types

#### `UserData`
```ts
type UserData = {
  email?: string;
  name?: string;
  userId?: string;
};
```

#### `GameInfo`
```ts
type GameInfo = {
  id: string;       // This is the join code
  name: string;
  description: string;
};
```

#### `PlayerProfile`
```ts
type PlayerProfile = {
  gameId: string;
  email: string;
  userId: string;
  inGameName: string;
  profileImageUrl: string;
  phoneNumber: string;
  instagram: string;
  discord: string;
  otherContact: string;
  bioMarkdown: string;
  claimedAt: number;
};
```

#### `GameSchedule`
```ts
type GameSchedule = {
  newspaperReleaseTime: string;
  nightlyDeadlineTime: string;
  nightlyResponseReleaseTime: string;
  wakeUpTime: string;
  actionDeadlineTime: string;
  voteDeadlineTime: string;
  numberOfRealDaysPerInGameDay: number;
};
```

#### `PlayerNightSubmission`
```ts
type PlayerNightSubmission = {
  gameId: string;
  gameDayId: string;
  dayIndex: number;
  playerEmail: string;
  playerUserId: string;
  vote: string;
  action: string | MarkdownInputState; // Can be structured
  submittedVoteAt: number | null;
  submittedActionAt: number | null;
};
```

#### `TownSquarePost`
```ts
type TownSquarePost = {
  gameId: string;
  postId: string;
  authorUserId: string;
  markdown: string;
  title?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  plainText?: string;
  createdAt: number;
};
```

#### `TownSquareComment`
```ts
type TownSquareComment = {
  gameId: string;
  postId: string;
  commentId: string;
  authorUserId: string;
  markdown: string;
  bodyHtml?: string;
  plainText?: string;
  parentCommentId?: string;
  replyToCommentId?: string;
  createdAt: number;
};
```

#### `UserTableItem` (Player Roster)
```ts
type PlayerData = {
  livingState: 'alive' | 'dead';
  extraColumns?: string[];
};

type DayData = {
  vote?: string;
  action?: string | MarkdownInputState;
  extraColumns?: string[];
};

type UserTableItem = {
  realName: string;
  email: string;
  userId: string | 'NOT-JOINED';
  role: string;
  playerData: PlayerData;
  days: DayData[];
};
```

#### `UserTableTitle`
```ts
type UserTableTitle = {
  extraUserColumns: string[];
  extraDayColumns: string[];
};
```

#### `UserTableColumnVisibility`
```ts
type UserTableColumnVisibility = {
  extraUserColumns: boolean[];
  extraDayColumns: boolean[];
};
```

#### `RoleTableItem`
```ts
type RoleTableItem = {
  role: string;
  doesRoleVote: boolean;
  roleMessage: string;    // Markdown with embedded input tokens — THIS IS A KEY FIELD FOR THE SCRIPTING LANGUAGE
  isVisible: boolean;
  aboutRole: string;      // Markdown describing the role
};
```

#### `MarkdownInputState`
```ts
type MarkdownInputState = Record<string, string | undefined>;
// Example: { "Target": "PlayerName", "Note": "Night 3 elimination" }
```

### User Variables (single value per user per key)

| Key | Type | Privacy | Game-Scoped | Notes |
|-----|------|---------|-------------|-------|
| `userData` | `UserData` | PUBLIC | No | Other components query other users' userData by userId |
| `activeGameId` | `string` | PRIVATE | No | Currently opened game id |
| `gamesTheyJoined` | `string[]` | PRIVATE | No | List of game ids this user has joined |
| `aiGuidance` | `string` | PRIVATE | No | AI prompt guidance |
| `ruleBook-{gameId}` | `string` | PUBLIC | Yes | Markdown rule book content |
| `gameSchedule-{gameId}` | `GameSchedule` | PUBLIC | Yes | Timing configuration |
| `playerProfile-{gameId}` | `PlayerProfile` | PUBLIC | Yes | One profile per user per game |
| `playerNightSubmission-day-{N}-{gameId}` | `PlayerNightSubmission` | PUBLIC | Yes (day-scoped) | One submission per user per game day |
| `playerPageColumnSizes-{gameId}` | `PlayerPageColumnSizes` | PRIVATE | Yes | UI column width preferences |
| `nightlyPageColumnSizes-{gameId}` | `NightlyPageColumnSizes` | PRIVATE | Yes | Nightly page column widths |
| `townSquareReadState-{gameId}` | `Record<string, number>` | PRIVATE | Yes | Last-read timestamps by postId |

### User Lists (keyed list items per user)

| Key | Type | itemId | Privacy | Notes |
|-----|------|--------|---------|-------|
| `games` | `GameInfo` | gameId | PUBLIC | Join code is `value.id` |
| `dayDatesArray` | `string[]` (MM/DD/YYYY) | gameId | PUBLIC | Authoritative shared calendar for game's day sequence |
| `numberOfRealDaysPerInGameDay` | `number` | gameId | PUBLIC | Default: 2 |
| `startingDate` | `string` | gameId | — | Legacy setup-only data |
| `userTable` | `UserTableItem[]` | gameId | PUBLIC | Operator-maintained player roster + per-day outcomes |
| `userTableTitle` | `UserTableTitle` | gameId | PUBLIC | Extra column definitions |
| `userTableColumnVisibility` | `UserTableColumnVisibility` | gameId | PUBLIC | Column visibility toggles |
| `roleTable` | `RoleTableItem[]` | gameId | PUBLIC | All roles with markdown content |
| `selectedDayIndex` | `number` | gameId | PUBLIC | Currently selected day |
| `usepaper` | `Usepaper` | `${gameId}-day-${dayIndex}` | PUBLIC | Newspaper columns config |
| `nightlyResponseList` | `Record<string, string[]>` | gameId | PUBLIC | Map of playerEmail → day responses |
| `nightlyMessagesList` | `Record<string, string[]>` | gameId | PUBLIC | Map of playerEmail → day messages |
| `townSquarePosts-{gameId}` | `TownSquarePost` | postId | PUBLIC | Forum posts |
| `townSquareComments-{gameId}` | `TownSquareComment` | commentId | PUBLIC | Forum comments, filtered by postId |

### Join Code Flow

The join code is the game's `id` field from the `games` list. Players join by entering this code. The `games` list is indexed with `filterKey: 'id'`, and the join flow validates with `filterFor: gameCode`.

---

## Existing Markdown Input/Output System (What You Are Replacing)

The app currently has a markdown input system that embeds interactive form controls directly within markdown text. **This is the system your scripting language will replace and extend.**

### Current Syntax

```markdown
/["Killing":SELECT_PLAYER_ALIVE]/
/["Victim":SELECT_PLAYER_DEAD]/
/["Role":SELECT_ROLE]/
/["Note":TEXT]/
```

- **Label**: Human-readable identifier, used as the key in the state object and as placeholder text
- **TYPE**: Determines the kind of input control

### Current Supported Input Types

| Type | Aliases | Renders As | Data Source |
|------|---------|------------|-------------|
| `TEXT` | `text`, `textbox` | Text input field | N/A |
| `SELECT_PLAYER_ALIVE` | `player_alive` | Dropdown of alive players | `userTable` (livingState = 'alive') |
| `SELECT_PLAYER_DEAD` | `player_dead` | Dropdown of dead players | `userTable` (livingState = 'dead') |
| `SELECT_PLAYER_ALL` | `player_all`, `PLAYER_SELECT` | Dropdown of all players | `userTable` (all) |
| `SELECT_ROLE` | `role` | Dropdown of visible roles | `roleTable` (isVisible = true) |

### Current Architecture

1. **MarkdownRenderer** (`app/components/ui/markdown/MarkdownRenderer.tsx`) — main entry point for all markdown rendering, handles parsing of input tokens, manages rendering of both static markdown and interactive inputs
2. **MarkdownRendererInputDataProvider** — context provider that injects dropdown option data (playerOptions, roleOptions)
3. **MarkdownInputField** — renders individual input controls (text or dropdown)
4. **MarkdownInputBuilderDialog** — separate component for building input tokens with live preview
5. **State management** — simple key-value object: `{ [label]: value }`, undefined for unfilled inputs
6. **Inputs are disabled** when no `setState` is provided

### Where It's Used

- **Role messages** (`roleTable[].roleMessage`) — the operator writes markdown with embedded input tokens as the role's nightly action prompt. Players see this in "Your Eyes Only" and interact with the inputs to submit their action.
- **Player submissions** (`PlayerNightSubmission.action`) — can be either plain text or a structured `MarkdownInputState` object
- **Town Square posts** — markdown with optional input tokens
- **Rule Book** — operator-authored markdown content

### Current Data Flow

```
Parent Component (e.g., YourEyesOnlyPagePLAYER)
    |
    |--- Fetches userTable and roleTable via data hooks
    |--- Wraps with MarkdownRendererInputDataProvider (provides playerOptions & roleOptions)
    |
    v
MarkdownRenderer
    |--- Consumes options from context
    |--- Parses markdown tokens
    |--- Renders MarkdownInputField instances
    |
    v
MarkdownInputField
    |--- Renders AppDropdown or PoppinsTextInput
    |--- Calls onChange with value updates
    |
    v
Parent setState callback → updates PlayerNightSubmission
```

### Limitations of the Current System

1. **Fixed input types** — only 5 hardcoded types (TEXT, PLAYER_ALIVE, PLAYER_DEAD, PLAYER_ALL, ROLE)
2. **No logic** — can't filter, compute, or dynamically determine options
3. **No variables** — can't reference computed values across inputs
4. **No conditionals** — can't show/hide inputs based on other input values
5. **No math** — can't compute "half of dead players" or similar
6. **No custom data sources** — can't build a dropdown from arbitrary data

---

## Player Eyes-Only Screen (Key Integration Point)

This is the primary screen where the scripting language will be used. It's the private interface where players:

1. **View their role details** — rendered from `roleData.aboutRole` markdown
2. **Receive morning messages** — navigation through released morning messages, locked by `wakeUpTime`
3. **Submit nightly votes** — vote dropdown for selecting target player, respects `roleData.doesRoleVote`
4. **Submit nightly actions** — live markdown action panel rendering `roleData.roleMessage` with interactive inputs

### How Actions Currently Work

- `roleData.roleMessage` is markdown with embedded input tokens
- When rendered with `state` and `setState` props, inputs become interactive
- Player input updates `PlayerNightSubmission.action` as a `MarkdownInputState` object
- Submission window is time-locked by `gameSchedule` deadlines
- Old string actions still work for backward compatibility
- Operator sees action summaries via `normalizePlayerActionState()` and `getPlayerActionSummary()` helpers

### Time/Deadline System

- `isNightWindowOpen()` — checks if submission window is still open
- `getLatestReleasedDayIndex()` — finds newest day whose morning message has been released
- `getDayEndDate()` — resolves end date for an in-game day
- `getDayRangeLabel()` — formats an in-game day as a date range like `4/11 - 4/12`
- In-game days can span multiple real-world days based on `numberOfRealDaysPerInGameDay`
- Morning messages for Day N unlock on Day N+1 after `wakeUpTime`

---

## UI Component System

The scripting language's rendered output must use these existing UI components:

### Text
- **`PoppinsText`** — default text component. Props: `weight` ('regular'|'medium'|'bold'), `varient` ('default'|'heading'|'subtext'|'cardHeader'|'lowercaseCardHeader'), `color`, `className`

### Buttons
- **`AppButton`** — main button primitive. Variants: `outline`, `outline-alt`, `outline-accent`, `outline-invert`, `filled`, `grey`, `accent` (gold guilded), `secondary` (silver guilded), `red`, `none`, `black`, `green`
- **`DisableableButton`** — wraps enabled/disabled states with explanatory text
- **`StatusButton`** — press shows temporary alternate feedback text

### Forms
- **`AppDropdown`** — main dropdown/select component. Supports web portal positioning, disabled state, customizable styling. **This is what dropdown inputs should render as.**
- **`PoppinsTextInput`** — default text input. Supports `varient='styled'` for bordered style, `autoGrow` on web, multiline
- **`PoppinsNumberInput`** — numeric input with bounds validation, returns `(displayValue, isValid, numericValue)`
- **`PoppinsTimeInput`** — hour/minute/AM-PM dropdowns, writes canonical `HH:mm`
- **`PoppinsDateInput`** — date entry with formatting
- **`InlineEditableText`** — inline text editing without full dialog

### Layout
- **`Column`** — vertical layout with gap spacing (gap prop uses 4px units)
- **`Row`** — horizontal layout with gap spacing
- **`Divider`** — horizontal divider with configurable inset

### Dialogs
- **`ConvexDialog`** — standard dialog wrapper (Root, Portal, Overlay, Content, Close)
- **`DialogHeader`** — branded header row for dialogs
- **`UnsavedChangesDialog`** — leave/stay confirmation

### Markdown
- **`MarkdownRenderer`** — main markdown rendering primitive. Supports headings, paragraphs, lists, quotes, rules, images, and inline input tokens. Can become interactive with `state`/`setState` props.

### Animation
- **`StateAnimatedView`** — state-based micro-animation (small swaps, labels, icons)
- **`LayoutStateAnimatedView`** — compound animated view for page-like state transitions (Container, Option, OptionContainer with pushInAnimation presets like `fromRight`)

### Day Selectors
- **`ComprehensiveDaySelector`** — main day selector for multiplayer screens (horizontal scrolling day ribbon)
- **`DaySelector`** — simpler day-selection strip

### Styling System
- **Tailwind CSS** (NativeWind) for all styling
- Color tokens: `background`, `inner-background`, `text`, `text-inverted`, `border`, `subtle-border`, `accent`, `accent-hover`, `muted-text`, `outer-background`
- Gap system: 4px base units
- Pages prefer **no background** or light treatment, borders/dividers for structure
- Interactive cards: `rounded-3xl bg-text/5 px-4 py-4`
- Section dividers: `border-b border-border/15` or `border-y border-border/15`
- GuildedButton system for premium CTAs (gold/silver ring variants)

---

## Newser Role (Special Case)

The operator can assign a separate email as "Newser" — this user gets player-like access to all player tabs except "Your Eyes Only", has a profile, appears in participant-facing identity surfaces (rule book, town square, phone book), and owns newspaper functionality — all without being in the player list or userTable. The scripting language should account for this role when filtering players.

---

## Design Requirements for the Scripting Language

### 1. Block-Based Visual Editor
- Scratch-like drag-and-drop block interface
- Each block represents a function call, variable, operator, or control flow
- Blocks snap together vertically (sequential execution) and nest (for arguments)
- Block categories: Variables, Inputs, Logic, Math, Data Sources, Text, Control Flow
- Blocks compile to/from a text representation for storage

### 2. Text Representation
- Clean, readable syntax that mirrors the block structure
- Storable as a string in markdown fields (alongside regular markdown text)
- Parseable back into block structure for the visual editor
- Example syntax shown in the opening section

### 3. Core Function Library

Design at minimum these functions (and propose additional ones):

- **`Variable`** — define a named variable with a computed value
- **`CreateSelectInput`** — dropdown/multi-select from a list
- **`CreateTextInput`** — text input field
- **`CreateMarkdown`** — render markdown content (possibly dynamic)
- **`CreateCheckbox`** — boolean toggle
- **`CreateConditional`** — show/hide content based on a condition
- **`CreateNumberInput`** — numeric input with optional min/max

### 4. Data Source Functions

The language must be able to access the game's data:

- **`players`** — the game's `userTable` (all players with their data)
- **`roles`** — the game's `roleTable`
- **`currentPlayer`** — the viewing player's data
- **`currentDay`** — the current day index
- **`dayDates`** — the `dayDatesArray` for the game
- **`schedule`** — the `GameSchedule` for the game
- **`submissions`** — all `PlayerNightSubmission` data for the current day
- **`townSquarePosts`** — posts from the town square
- **`profiles`** — all `PlayerProfile` data for the game

Each data source should expose filterable/queryable properties. For example, `players` items should expose:
- `entry.realName`, `entry.email`, `entry.userId`, `entry.role`
- `entry.playerData.livingState` ('alive' | 'dead')
- `entry.days[dayIndex].vote`, `entry.days[dayIndex].action`
- `entry.days[dayIndex].extraColumns`

### 5. Operators and Expressions

- **Comparison**: `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Logical**: `AND`, `OR`, `NOT`
- **Math**: `+`, `-`, `*`, `/`, `.floor`, `.ceil`, `.round`, `.abs`, `.min`, `.max`
- **String**: `.length`, `.concat`, `.contains`, `.startsWith`, `.endsWith`
- **List**: `.length`, `.filter`, `.map`, `.sort`, `.first`, `.last`, `.get(index)`, `.contains`

### 6. Control Flow
- **`If`/`Else`** — conditional execution
- **`ForEach`** — iterate over a list
- **`Switch`** — multi-branch conditional

### 7. State and Output
- The result of executing the script is a set of rendered UI elements (inputs, text, etc.)
- Input state is collected into a `MarkdownInputState`-compatible object (key-value pairs)
- The script execution context has access to the current game, current player, current day, and all shared game data
- Scripts are **reactive** — when underlying data changes (a player dies, a new day starts), the rendered inputs update automatically

### 8. Integration Points

The scripting language should be usable in **any markdown field**, but primarily:

- **Role messages** (`roleTable[].roleMessage`) — the nightly action prompt for each role
- **Rule book** (`ruleBook-{gameId}`) — general game rules, possibly with interactive examples
- **Town Square posts** — forum posts with embedded interactive elements
- **Newspaper content** — newspaper articles with embedded inputs
- **Morning messages** — daily messages to players

### 9. Backward Compatibility

- Existing `/["Label":TYPE]/` syntax should still work (compiled to equivalent script blocks internally)
- Existing `MarkdownInputState` objects should be readable by the new system
- Old string actions in `PlayerNightSubmission` should still be handled

### 10. Execution Model

- Scripts run **client-side** in the React Native app
- Scripts have access to the DataProvider cache (same data the components see)
- Scripts are **sandboxed** — no access to arbitrary code execution
- Scripts are **declarative** — they describe what to render, not how to render it
- The runtime evaluates the script and produces a React component tree
- The runtime is **reactive** — subscribes to the data sources used by the script and re-renders when data changes

---

## Deliverables

1. **Language specification** — complete syntax reference for all functions, operators, data sources, and control flow
2. **Block editor design** — how blocks look, snap together, and map to text representation
3. **Runtime architecture** — how scripts are parsed, evaluated, and rendered as React components
4. **Data source mapping** — how each game data type is exposed to the scripting language
5. **Integration plan** — how the scripting language embeds in markdown fields and replaces the existing input token system
6. **Example scripts** — at least 5 practical examples showing real game logic:
   - Filter dead players and allow selecting up to half
   - Show different inputs based on the player's role
   - Create a vote dropdown that excludes the current player
   - Conditionally show a text input only if a certain role exists in the game
   - Display a dynamic summary of alive vs dead players

---

## Summary of Key Constraints

- The app is React Native + Expo (web + mobile), using Convex backend, Clerk auth, Tailwind/NativeWind styling
- All data is accessed through the DataProvider hook system (`useValue`, `useList`, `useFindValues`, `useFindListItems`)
- Components subscribe directly to their own data — no prop-drilling for persistent data
- The existing markdown input system uses `/["Label":TYPE]/` syntax with 5 hardcoded types — this is being replaced
- Input state is stored as `MarkdownInputState` = `Record<string, string | undefined>`
- The primary use case is role messages where operators define what inputs players see for their nightly actions
- All rendered UI must use existing components (AppDropdown, PoppinsTextInput, MarkdownRenderer, etc.)
- The Newser role exists outside the player list but has player-like access
- In-game days can span multiple real-world days; timing is controlled by `GameSchedule`
- The operator authors all game content; players interact with it
- Scripts must be reactive and update when game state changes
