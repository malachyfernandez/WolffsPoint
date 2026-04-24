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
  // Add your data definitions here. Example:
  /*
  profile: {
    type: "variable",
    privacy: "PUBLIC",
    defaultValue: { name: "", username: "" },
    searchKeys: ["username", "name"]
  },
  games: {
    type: "list",
    privacy: "PRIVATE",
    defaultValue: { score: 0 },
  }
  */
};
