import { useMemo } from 'react';
import { useFindValues } from './useData';
import { useGameOperatorUserId } from './useGameOperatorUserId';
import {
    NewserAssignment,
    PublicUserData,
    getNewserAssignmentKey,
    resolveValidNewserAssignment,
} from '../utils/newspaperControl';

/**
 * Returns true if the current user is the game operator or the assigned newser.
 * These are the only users who should see the "code editor" option in markdown
 * editor dialogs.
 */
export const useCanEditScripts = (gameId: string, currentUserId: string) => {
    const { operatorUserId, isLoading: isOperatorLoading } = useGameOperatorUserId(gameId);

    const newserAssignmentRecords = useFindValues<NewserAssignment>(
        getNewserAssignmentKey(gameId),
        {
            userIds: operatorUserId ? [operatorUserId] : undefined,
            returnTop: 1,
        }
    );

    const userDataRecords = useFindValues<PublicUserData>('userData', {
        returnTop: 500,
    });

    return useMemo(() => {
        if (isOperatorLoading || !operatorUserId) return false;
        const isOperator = operatorUserId === currentUserId;
        if (isOperator) return true;

        const validNewser = resolveValidNewserAssignment({
            assignment: newserAssignmentRecords?.[0]?.value,
            userDatas: userDataRecords?.map((record) => record.value) ?? [],
        });
        return validNewser?.userId === currentUserId;
    }, [operatorUserId, currentUserId, isOperatorLoading, newserAssignmentRecords, userDataRecords]);
};
