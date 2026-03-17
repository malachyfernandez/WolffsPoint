# User Data Variables Tracking

**userData** -- User profile data
```ts
const [userData, setUserData] = useUserVariable<UserData>({
    key: "userData",
    defaultValue: {},
    privacy: "PUBLIC",
    searchKeys: ["name"],
});

// MainPage.tsx
// AllGamesPage.tsx
```

**activeGameId** -- Current game ID
```ts
const [activeGameId, setActiveGameId] = useUserVariable<string>({
    key: "activeGameId",
    defaultValue: "",
});

// MainPage.tsx
```

**gamesTheyJoined** -- Joined game IDs
```ts
const [gamesTheyJoined, setGamesTheyJoined] = useUserVariable<string[]>({
    key: "gamesTheyJoined",
    defaultValue: [],
});

// AllGamesPage.tsx
```

**games** -- Game info per user
```ts
const setUserListItem = useUserListSet();

setUserListItem({
    key: "games",
    itemId: newGameId,
    value: { id: newGameId, name: "Game 1", description: "Description 1" },
    filterKey: "id",
    privacy: "PUBLIC",
});

// MainPage.tsx
```

**playerTable** -- Player data per game
```ts
const [playerTable, setPlayerTable] = useUserList<PlayerTableItem[]>({
    key: "playerTable",
    itemId: gameId,
    defaultValue: [],
    privacy: "PUBLIC",
});

// PlayerPageOPERATOR.tsx
```

**userTable** -- User data per game
```ts
const [userTable, setUserTable] = useUserList<UserTableItem[]>({
    key: "userTable",
    itemId: gameId,
    defaultValue: [],
    privacy: "PUBLIC",
});

// PlayerPageOPERATOR.tsx
```

**startingDate** -- Game start date
```ts
const [startingDate, setStartingDate] = useUserList({
    key: "startingDate",
    itemId: gameId,
    privacy: "PUBLIC",
    defaultValue: "Unset",
});

// PlayerPageOPERATOR.tsx
// ChangeDateInfo.tsx - MISSING: privacy, defaultValue
```

**realDaysPerInGameDay** -- Days per game day
```ts
const [realDaysPerInGameDay, setRealDaysPerInGameDay] = useUserList({
    key: "realDaysPerInGameDay",
    itemId: gameId,
    privacy: "PUBLIC",
    defaultValue: "2",
});

// PlayerPageOPERATOR.tsx
// ChangeDateInfo.tsx - MISSING: privacy
// GetStartedButton.tsx - MISSING: privacy, defaultValue
```
