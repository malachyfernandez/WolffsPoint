import type { TableUpdate } from '../app/script/registry';

/** A planned cell update computed at input time. Unlike TableUpdate (which
 * stores the final value), PlannedUpdate stores a partially-evaluated
 * expression string where all variables (currentDay, Inputs, etc.) have been
 * resolved to their values, but function calls (tag(), .append(), etc.) are
 * kept as-is. At certify time, the expression is evaluated with the cell
 * variable bound to the current cell value. */
export interface PlannedUpdate {
  /** Index into the users array, or null to apply to all players */
  playerIndex: number | null;
  /** Day index (0-based), or null for player-level extra columns */
  dayIndex: number | null;
  /** Column title */
  column: string;
  /** Whether this is a user-level or day-level column */
  columnType: 'user' | 'day';
  /** Partially evaluated update expression, e.g. `cellContents.append(tag("Infected"))`
   * or `cellContents.append(2)`. Variables are resolved but functions are kept. */
  updateExpression: string;
  /** The cell variable name (e.g. "cellContents") */
  itemName: string;
}

export type PlayerProfile = {
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

export type MarkdownInputState = Record<string, string | undefined>;

export type PlayerActionValue = string | MarkdownInputState;

export type GameSchedule = {
  nightlyDeadlineTime?: string;
  actionDeadlineTime?: string;
  voteDeadlineTime?: string;
  wakeUpTime: string;
  nightlyResponseReleaseTime?: string;
  newspaperReleaseTime?: string;
  /** Number of IRL days (24h) before the final day end that actions are due. 0 = on the final day (default). */
  actionDayOffset?: number;
  /** Number of IRL days (24h) before the final day end that votes are due. 0 = on the final day (default). */
  voteDayOffset?: number;
  /** When true, players can see who voted for whom on the newspaper screen. */
  publicVoting?: boolean;
};

export type TownSquarePost = {
  gameId: string;
  postId: string;
  authorUserId: string;
  markdown: string;
  title?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  plainText?: string;
  createdAt: number;
  postType?: 'thread' | 'announcement';
};

export type TownSquareComment = {
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

export type PlayerNightSubmission = {
  gameId: string;
  gameDayId: string;
  dayIndex: number;
  playerEmail: string;
  playerUserId: string;
  vote: string;
  action: PlayerActionValue;
  submittedVoteAt: number | null;
  submittedActionAt: number | null;
  /** Planned table updates computed from role message scripts at input time.
   * Stores partially-evaluated expressions that are executed at certify time. */
  plannedUpdates?: PlannedUpdate[];
};
