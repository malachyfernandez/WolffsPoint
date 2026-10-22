import type { TableUpdate } from '../script/registry';
import type { GameDayUnit } from '../utils/gameDayDuration';

/** A planned cell update computed at input time. Unlike TableUpdate (which
 * stores the final value), PlannedUpdate stores a partially-evaluated
 * expression string where all variables (currentDay, Inputs, etc.) have been
 * resolved to their values, but function calls (tag(), .append(), etc.) are
 * kept as-is. At certify time, the expression is evaluated with the cell
 * variable bound to the current cell value. */
export interface PlannedUpdate {
  /** Bound at submission time once stable identities have been adopted.
   * All-player plans capture their actual membership, not future row positions. */
  targetIds?: {
    playerIds: string[];
    dayId: string | null;
    columnId: string;
  };
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
  /** Operation kind. Absent = 'each' (legacy: evaluate expression → replace).
   * 'add'/'remove'/'replace' append provenance markers instead. */
  op?: 'each' | 'add' | 'remove' | 'replace';
  allowDuplicates?: boolean;
  autoRemove?: boolean;
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

export type VoteValue = string | string[];

export type GameSchedule = {
  /** 'hour' = hour game: each day is a clock-time start that runs until the
   * next day's start. Absent/'calendar' keeps the usual schedule. */
  dayMode?: 'calendar' | 'hour';
  /** Calendar days retain wall-clock scheduling; hours/minutes are fixed timed rounds. */
  dayDurationUnit?: GameDayUnit;
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
  /** Hour games: minutes before the day ends that actions close. 0/absent =
   * actions stay open until the next day starts. */
  actionDeadlineLeadMinutes?: number;
  /** Hour games: minutes before the day ends that votes close. */
  voteDeadlineLeadMinutes?: number;
  /** Hour games: minutes after a day starts before the previous day's morning
   * messages and newspaper unlock. 0/absent = right when the day starts. */
  wakeUpOffsetMinutes?: number;
  /** When true, players can see who voted for whom on the newspaper screen. */
  publicVoting?: boolean;
  /** IANA timezone name, e.g. "America/New_York". All schedule wall-clock
   * times (wakeUpTime, deadlines) are interpreted in this zone for every
   * player, regardless of device timezone. Absent = device-local (legacy). */
  timezone?: string;
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
  isPinned?: boolean;
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
  vote: VoteValue;
  voteInputs?: MarkdownInputState;
  voteInputKey?: string;
  voteMultiplier?: number;
  action: PlayerActionValue;
  submittedVoteAt: number | null;
  submittedActionAt: number | null;
  /** Planned table updates computed from role message scripts at input time.
   * Stores partially-evaluated expressions that are executed at certify time. */
  plannedUpdates?: PlannedUpdate[];
  votePlannedUpdates?: PlannedUpdate[];
};
