import { useMemo } from 'react';
import { useFindListItems } from './useData';
import { UserTableItem } from '../types/playerTable';

export function useHasPreviousDayVotes(gameId: string, dayIndex: number): boolean | undefined {
  const gameRows = useFindListItems("games", {
    itemId: gameId,
    returnTop: 1,
  });
  const operatorUserId = gameRows?.[0]?.userToken ?? '';

  const operatorUserTableRecords = useFindListItems<UserTableItem[]>("userTable", {
    itemId: gameId,
    userIds: operatorUserId ? [operatorUserId] : undefined,
    returnTop: 1,
  });

  return useMemo(() => {
    if (dayIndex <= 0) {
      return false;
    }

    const players = operatorUserTableRecords?.[0]?.value ?? [];
    const targetDay = dayIndex - 1;

    return players.some((player) => {
      const vote = player.days?.[targetDay]?.vote?.trim() ?? '';
      return vote.length > 0;
    });
  }, [dayIndex, operatorUserTableRecords]);
}
