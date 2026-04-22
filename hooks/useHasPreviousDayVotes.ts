import { useMemo } from 'react';
import { useUserListGet } from './useUserListGet';
import { useUserVariableGet } from './useUserVariableGet';
import { PlayerNightSubmission } from '../types/multiplayer';
import { UserTableItem } from '../types/playerTable';
import { getGameScopedKey } from '../utils/multiplayer';

export function useHasPreviousDayVotes(gameId: string, dayIndex: number): boolean | undefined {
  const gameRows = useUserListGet({
    key: 'games',
    itemId: gameId,
    returnTop: 1,
  });
  const operatorUserId = gameRows?.[0]?.userToken ?? '';

  const operatorUserTableRecords = useUserListGet<UserTableItem[]>({
    key: 'userTable',
    itemId: gameId,
    userIds: operatorUserId ? [operatorUserId] : undefined,
    returnTop: 1,
  });

  const submissionRecords = useUserVariableGet<PlayerNightSubmission>({
    key: getGameScopedKey(`playerNightSubmission-day-${dayIndex - 1}`, gameId),
    returnTop: 200,
  });

  return useMemo(() => {
    if (dayIndex <= 0) {
      return false;
    }

    const players = operatorUserTableRecords?.[0]?.value ?? [];
    const voteCounts = new Map<string, number>();

    (submissionRecords ?? []).forEach((record) => {
      const voteTargetEmail = record.value.vote?.trim();
      if (!voteTargetEmail) {
        return;
      }
      voteCounts.set(voteTargetEmail, (voteCounts.get(voteTargetEmail) ?? 0) + 1);
    });

    return players.some((player) => (voteCounts.get(player.email) ?? 0) > 0);
  }, [dayIndex, operatorUserTableRecords, submissionRecords]);
}
