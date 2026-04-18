import { useMemo } from 'react';
import { useUserListGet } from './useUserListGet';

export const useGameOperatorUserId = (gameId: string) => {
    const gameRows = useUserListGet({
        key: 'games',
        itemId: gameId,
        returnTop: 1,
    });

    return useMemo(() => {
        return {
            operatorUserId: gameRows?.[0]?.userToken ?? '',
            isLoading: gameRows === undefined,
        };
    }, [gameRows]);
};
