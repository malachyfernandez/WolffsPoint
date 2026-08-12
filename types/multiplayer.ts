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
  /** Number of days before the final day that actions are due. 0 = on the final day (default). */
  actionDayOffset?: number;
  /** Number of days before the final day that votes are due. 0 = on the final day (default). */
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
};
