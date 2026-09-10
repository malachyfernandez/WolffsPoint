import { useMemo } from 'react';
import { useFindListItems, useFindValues } from '../../../hooks/useData';
import {
    NewserAccepted,
    NewserAssignment,
    NewspaperControlState,
    PublicUserData,
    getNewspaperDayControlItemId,
    getNewserAcceptedKey,
    getNewserAssignmentKey,
    getNewspaperControlKey,
    normalizeNewserEmail,
    resolveNewspaperOwnerUserId,
    resolveValidNewserAssignment,
} from '../../../utils/newspaperControl';

interface UseNewspaperDayOwnerArgs {
    gameId: string;
    dayIndex: number;
    disabled?: boolean;
}

export const useNewspaperDayOwner = ({ gameId, dayIndex, disabled = false }: UseNewspaperDayOwnerArgs) => {
    const gameRows = useFindListItems("games", {
        itemId: gameId,
        returnTop: 1,
    });
    const operatorUserId = gameRows?.[0]?.userToken ?? '';
    const userDataRecords = useFindValues<PublicUserData>("userData", {
        returnTop: 500,
    });
    const assignmentRecords = useFindValues<NewserAssignment>(getNewserAssignmentKey(gameId), {
        userIds: operatorUserId ? [operatorUserId] : undefined,
        returnTop: 1,
    });
    const controlRecords = useFindListItems<NewspaperControlState>(getNewspaperControlKey(gameId), {
        itemId: getNewspaperDayControlItemId(dayIndex),
        userIds: operatorUserId ? [operatorUserId] : undefined,
        returnTop: 1,
    });
    const acceptedRecords = useFindValues<NewserAccepted>(getNewserAcceptedKey(gameId), {
        returnTop: 50,
    });

    const validNewser = useMemo(() => {
        const assignment = assignmentRecords?.[0]?.value;
        const userDatas = userDataRecords?.map((record) => record.value) ?? [];
        const accepted = acceptedRecords?.map((record) => record.value) ?? [];
        return resolveValidNewserAssignment({
            assignment,
            userDatas,
            acceptedRecords: accepted,
        });
    }, [assignmentRecords, userDataRecords, acceptedRecords, gameId, dayIndex, operatorUserId]);

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
        || acceptedRecords === undefined
    );

    return {
        isLoading,
        operatorUserId,
        ownerUserId,
        validNewser,
        control: controlRecords?.[0]?.value ?? null,
    };
};
