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
- **State Management**: Jotai atoms + Convex real-time subscriptions

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
   git clone https://github.com/malachyfernandez/wolffspoint.git
   cd wolffspoint
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

---

## Project Structure

```
app/
  components/game/     # Game-specific UI components
  components/ui/       # Reusable design system
  components/layout/   # Layout primitives
contexts/              # React contexts (Toast, Generation, etc.)
convex/                # Backend functions and schema
hooks/                 # Custom React hooks
types/                 # TypeScript type definitions
utils/                 # Utility functions
```

---

## License

Private — All rights reserved.

