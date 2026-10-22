export const DEFAULT_VOTE_SCRIPT = `CreateSelectVoteInput({
  LIST = players.Filter(Item => (Item.entry("isAlive") == true)),
  LABEL = "Vote",
  NUMSELECTABLE = 1,
  MULTIPLYER = 1,
});`;

export const DEFAULT_VOTE_MESSAGE = `/*script\n${DEFAULT_VOTE_SCRIPT}\nscript*/`;

export type RoleTableItem = {
  role: string;
  doesRoleVote: boolean;
  roleMessage: string;
  voteMessage?: string;
  aboutRole: string;
  isVisible: boolean;
  hiddenFromRulebook?: boolean;
};
