import type { UserListRecord } from "../hooks/useUserList";

// Basic alias for convenience - this is the output schema from useUserListGet<string[]>
export type MyGames = UserListRecord<GameInfo>[] | undefined;

export type GameInfo = {
    id: string;
    name: string;
    description: string;
}

