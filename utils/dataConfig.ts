import { Privacy } from "../hooks/useUserVariable";

export type DataVariableConfig<T = any> = {
  type: "variable";
  defaultValue?: T;
  privacy?: Privacy;
  filterKey?: keyof T | string;
  searchKeys?: (keyof T | string)[];
  sortKey?: keyof T | string;
  unloadedChangesThreshold?: number;
};

export type DataListConfig<T = any> = {
  type: "list";
  defaultValue?: T;
  privacy?: Privacy;
  filterKey?: keyof T | string;
  searchKeys?: (keyof T | string)[];
  sortKey?: keyof T | string;
  unloadedChangesThreshold?: number;
};

export type DataConfigType = {
  [key: string]: DataVariableConfig | DataListConfig;
};

/**
 * Central dictionary for all userVariables.
 * Defining them here prevents mismatched configurations across the app.
 */
export const DATA_CONFIG: DataConfigType = {
  userTable: {
    type: "list",
    privacy: "PUBLIC",
    defaultValue: [],
  },
  dayDatesArray: {
    type: "list",
    privacy: "PUBLIC",
    defaultValue: [],
  },
  selectedDayIndex: {
    type: "list",
    privacy: "PUBLIC",
    defaultValue: 0,
  },
  numberOfRealDaysPerInGameDay: {
    type: "list",
    privacy: "PUBLIC",
    defaultValue: 2,
  },
  startingDate: {
    type: "list",
    privacy: "PUBLIC",
  },
  userData: {
    type: "variable",
    privacy: "PUBLIC",
    defaultValue: { name: "", email: "", userId: "" },
    searchKeys: ["name"],
  },
  activeGameId: {
    type: "variable",
    privacy: "PRIVATE",
    defaultValue: "",
  },
  gamesTheyJoined: {
    type: "variable",
    privacy: "PRIVATE",
    defaultValue: [],
  },
  archivedGames: {
    type: "variable",
    privacy: "PRIVATE",
    defaultValue: [],
  },
  customUserInfo: {
    type: "variable",
    privacy: "PUBLIC",
    defaultValue: { name: "", photoUrl: "" },
    searchKeys: ["name"],
  },
  games: {
    type: "list",
    privacy: "PUBLIC",
    defaultValue: {},
  },
};
