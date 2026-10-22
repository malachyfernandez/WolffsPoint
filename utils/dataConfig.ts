import { Privacy } from '../hooks/useUserVariable';

export type DataVariableConfig<T = any> = {
  type: 'variable';
  defaultValue?: T;
  privacy?: Privacy;
  filterKey?: keyof T | string;
  searchKeys?: (keyof T | string)[];
  sortKey?: keyof T | string;
  unloadedChangesThreshold?: number;
  /**
   * When false, a missing record resolves to `defaultValue` without writing it
   * to the backend. Set this on records that are seeded with real content at
   * creation time so a mounted subscriber can't clobber the seed with the
   * default before it lands.
   */
  autoCreate?: boolean;
};

export type DataListConfig<T = any> = {
  type: 'list';
  defaultValue?: T;
  privacy?: Privacy;
  filterKey?: keyof T | string;
  searchKeys?: (keyof T | string)[];
  sortKey?: keyof T | string;
  unloadedChangesThreshold?: number;
  autoCreate?: boolean;
};

export type DataConfigType = {
  [key: string]: DataVariableConfig | DataListConfig;
};

/**
 * Central dictionary for all userVariables.
 * Defining them here prevents mismatched configurations across the app.
 */
export const DATA_CONFIG: DataConfigType = {
  cellModuleVersion: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: 0,
    autoCreate: false,
  },
  'private-fields:userTable': {
    type: 'list',
    privacy: 'PRIVATE',
    defaultValue: [],
  },
  userTable: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: [],
  },
  dayDatesArray: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: [],
    // Seeded with the chosen start date at game creation; auto-creating []
    // would overwrite that write when a subscriber mounts before it lands.
    autoCreate: false,
  },
  selectedDayIndex: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: 0,
  },
  // Indexes into dayDatesArray marking days with no vote/action deadline.
  skipVotingDays: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: [],
  },
  skipActionsDays: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: [],
  },
  numberOfRealDaysPerInGameDay: {
    // Canonical duration in days; hours/minutes use fractional days.
    // Timed dayDatesArray entries snapshot their own start and duration.
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: 2,
  },
  startingDate: {
    type: 'list',
    privacy: 'PUBLIC',
  },
  userData: {
    type: 'variable',
    privacy: 'PUBLIC',
    defaultValue: { name: '', email: '', userId: '' },
    searchKeys: ['name'],
  },
  activeGameId: {
    type: 'variable',
    privacy: 'PRIVATE',
    defaultValue: '',
  },
  gamesTheyJoined: {
    type: 'variable',
    privacy: 'PRIVATE',
    defaultValue: [],
  },
  archivedGames: {
    type: 'variable',
    privacy: 'PRIVATE',
    defaultValue: [],
  },
  customUserInfo: {
    type: 'variable',
    privacy: 'PUBLIC',
    defaultValue: { name: '', photoUrl: '' },
    searchKeys: ['name'],
  },
  games: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: {},
    // Game rows carry id/name; an auto-created {} row would clobber the
    // creation write and add junk entries to other users' game lists.
    autoCreate: false,
  },
  userTableTitle: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: { extraUserColumns: [], extraDayColumns: [] },
  },
  userTableColumnVisibility: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: { extraUserColumns: [], extraDayColumns: [] },
  },
  userTableColumnNightlyVisibility: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: { extraUserColumns: [], extraDayColumns: [] },
  },
  morningMessagesList: {
    type: 'list',
    privacy: 'PUBLIC',
    defaultValue: {},
  },
  tagDefinitions: {
    type: 'variable',
    privacy: 'PUBLIC',
    defaultValue: [],
  },
  tagTriggers: {
    type: 'variable',
    privacy: 'PUBLIC',
    defaultValue: {},
  },
  newspaperSectionDefaults: {
    type: 'variable',
    privacy: 'PRIVATE',
    defaultValue: { titleFont: 'libreBaskerville', dividerStyle: 'thin' },
  },
  savedFunctions: {
    type: 'variable',
    privacy: 'PRIVATE',
    defaultValue: [],
  },
  saveHistory: {
    type: 'variable',
    privacy: 'PRIVATE',
    defaultValue: [],
  },
};
