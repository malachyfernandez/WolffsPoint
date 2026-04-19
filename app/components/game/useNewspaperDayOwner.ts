import { useMemo } from 'react';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import {
    NewserAssignment,
    NewspaperControlState,
    PublicUserData,
    getNewspaperDayControlItemId,
    getNewserAssignmentKey,
    getNewspaperControlKey,
    resolveNewspaperOwnerUserId,
    resolveValidNewserAssignment,
} from '../../../utils/newspaperControl';

interface UseNewspaperDayOwnerArgs {
    gameId: string;
    dayIndex: number;
    disabled?: boolean;
}

export const useNewspaperDayOwner = ({ gameId, dayIndex, disabled = false }: UseNewspaperDayOwnerArgs) => {
    const gameRows = useUserListGet({
        key: 'games',
        itemId: gameId,
        returnTop: 1,
    });
    const operatorUserId = gameRows?.[0]?.userToken ?? '';
    const userDataRecords = useUserVariableGet<PublicUserData>({
        key: 'userData',
        returnTop: 500,
    });
    const assignmentRecords = useUserVariableGet<NewserAssignment>({
        key: getNewserAssignmentKey(gameId),
        userIds: operatorUserId ? [operatorUserId] : undefined,
        returnTop: 1,
    });
    const controlRecords = useUserListGet<NewspaperControlState>({
        key: getNewspaperControlKey(gameId),
        itemId: getNewspaperDayControlItemId(dayIndex),
        userIds: operatorUserId ? [operatorUserId] : undefined,
        returnTop: 1,
    });

    const validNewser = useMemo(() => {
        return resolveValidNewserAssignment({
            assignment: assignmentRecords?.[0]?.value,
            userDatas: userDataRecords?.map((record) => record.value) ?? [],
        });
    }, [assignmentRecords, userDataRecords]);

    const ownerUserId = useMemo(() => {
        if (disabled || !operatorUserId) {
            return '';
        }

        return resolveNewspaperOwnerUserId({
            control: controlRecords?.[0]?.value,
            operatorUserId,
            validNewserUserId: validNewser?.userId,
        });
    }, [controlRecords, disabled, operatorUserId, validNewser?.userId]);

    const isLoading = !disabled && (
        gameRows === undefined
        || assignmentRecords === undefined
        || userDataRecords === undefined
        || controlRecords === undefined
    );

    return {
        isLoading,
        operatorUserId,
        ownerUserId,
        validNewser,
        control: controlRecords?.[0]?.value ?? null,
    };
};
