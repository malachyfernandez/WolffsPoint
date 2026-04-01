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

export type GameSchedule = {
    newspaperReleaseTime: string;
    nightlyDeadlineTime: string;
    nightlyResponseReleaseTime: string;
};

export type TownSquarePost = {
    gameId: string;
    postId: string;
    authorUserId: string;
    authorInGameName: string;
    authorImageUrl: string;
    markdown: string;
    createdAt: number;
};

export type TownSquareComment = {
    gameId: string;
    postId: string;
    commentId: string;
    authorUserId: string;
    authorInGameName: string;
    authorImageUrl: string;
    markdown: string;
    createdAt: number;
};

export type PlayerNightSubmission = {
    gameId: string;
    gameDayId: string;
    dayIndex: number;
    playerEmail: string;
    playerUserId: string;
    vote: string;
    action: string;
    submittedVoteAt: number | null;
    submittedActionAt: number | null;
};
