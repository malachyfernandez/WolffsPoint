import { MarkdownInputState, PlayerActionValue, VoteValue } from './multiplayer';
import type { FieldProvenance } from '../utils/fieldProvenance';

export type PlayerData = {
  fieldProvenance?: FieldProvenance;
  livingState: 'alive' | 'dead';
  extraColumns?: string[];
};

export type DayData = {
  fieldProvenance?: FieldProvenance;
  /** Permanent game-day identity. Optional while legacy tables are adopted. */
  id?: string;
  vote?: VoteValue;
  voteInputs?: MarkdownInputState;
  voteInputKey?: string;
  voteMultiplier?: number;
  action?: PlayerActionValue;
  extraColumns?: string[];
};

export type UserTableItem = {
  /** Player-row identity; authentication IDs and email addresses are not row IDs. */
  id?: string;
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
  extraUserColumnTypes?: CellContentType[];
  extraDayColumnTypes?: CellContentType[];
  extraUserColumnIds?: string[];
  extraDayColumnIds?: string[];
  dayIds?: string[];
};

export type CellContentType = 'tags' | 'files';

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
