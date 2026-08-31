export const DEFAULT_VOTE_MESSAGE = `/*script
CreateSelectVoteInput({
  LIST = players.Filter(Item => (Item.entry("isAlive") == true)),
  LABEL = "Vote",
  NUMSELECTABLE = 1,
  MULTIPLYER = 1,
});
script*/`;

export type RoleTableItem = {
  role: string;
  doesRoleVote: boolean;
  roleMessage: string;
  voteMessage?: string;
  aboutRole: string;
  isVisible: boolean;
  hiddenFromRulebook?: boolean;
};
