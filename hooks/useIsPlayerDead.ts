import { useMemo } from 'react';
import { useValue } from './useData';
import { useSharedListValue } from './useSharedListValue';
import { useGameOperatorUserId } from './useGameOperatorUserId';
import { UserTableItem } from '../types/playerTable';

interface UserData {
    name: string;
    email: string;
    userId: string;
}

export function useIsPlayerDead(gameId?: string) {
    const [userData] = useValue<UserData>('userData', {
        defaultValue: { name: '', email: '', userId: '' },
        privacy: 'PUBLIC',
    });

    const safeGameId = gameId || '';
    const { operatorUserId, isLoading: isOperatorLoading } = useGameOperatorUserId(safeGameId);
    const { value: userTable, isLoading: isUserTableLoading } = useSharedListValue<UserTableItem[]>({
        key: 'userTable',
        itemId: safeGameId,
        defaultValue: [],
        userIds: operatorUserId ? [operatorUserId] : undefined,
    });

    const currentEmail = userData.value.email ?? '';

    const matchingPlayer = useMemo(() => {
        if (!safeGameId || !currentEmail) return undefined;
        return userTable.find(
            (player) => player.email.trim().toLowerCase() === currentEmail.trim().toLowerCase()
        );
    }, [currentEmail, userTable, safeGameId]);

    if (!safeGameId || isOperatorLoading || isUserTableLoading) {
        return false;
    }

    return matchingPlayer?.playerData?.livingState === 'dead';
}
