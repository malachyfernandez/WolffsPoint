import { MarkdownInputState, PlayerActionValue, VoteValue } from './multiplayer';

export type PlayerData = {
  livingState: 'alive' | 'dead';
  extraColumns?: string[];
};

export type DayData = {
  vote?: VoteValue;
  voteInputs?: MarkdownInputState;
  voteInputKey?: string;
  voteMultiplier?: number;
  action?: PlayerActionValue;
  extraColumns?: string[];
};

export type UserTableItem = {
  realName: string;
  email: string;
  userId: string | 'NOT-JOINED';
  role: string;
  playerData: PlayerData;
  days: DayData[];
};

export type UserTableTitle = {
  extraUserColumns: string[];
  extraDayColumns: string[];
};

export type UserTableColumnVisibility = {
  extraUserColumns: boolean[];
  extraDayColumns: boolean[];
};

/** Which extra columns should also appear in the nightly operator table.
 * Defaults to false (not shown in nightly) for each column. */
export type UserTableColumnNightlyVisibility = {
  extraUserColumns: boolean[];
  extraDayColumns: boolean[];
};
