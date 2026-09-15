import { useEffect, useMemo } from 'react';
import { useFindListItems } from './useData';

export const useGameOperatorUserId = (gameId: string) => {
    const gameRows = useFindListItems("games", {
        itemId: gameId,
        returnTop: 1,
    });

    const result = useMemo(() => {
        return {
            operatorUserId: gameRows?.[0]?.userToken ?? '',
            isLoading: gameRows === undefined,
        };
    }, [gameRows]);

    useEffect(() => {
        console.log(`[YourEyesOnly][PROD-DIAG][OperatorId] gameId=${gameId} gameRows=${gameRows === undefined ? 'undefined' : (gameRows.length === 0 ? 'empty' : gameRows.length)} operatorUserId=${result.operatorUserId ? 'set' : 'missing'}`);
    }, [gameId, gameRows, result.operatorUserId]);

    return result;
};
