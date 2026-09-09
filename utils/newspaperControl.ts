import { getGameScopedKey } from './multiplayer';

export type NewserAssignment = {
    email: string;
    userId: string;
    assignedAt: number;
};

export type NewserAccepted = {
    email: string;
    userId: string;
    gameId: string;
    acceptedAt: number;
};

export type PublicUserData = {
    email?: string;
    name?: string;
    userId?: string;
};

export type NewspaperControlOwnerType = 'newser' | 'operator';

export type NewspaperControlState = {
    ownerType: NewspaperControlOwnerType;
    ownerUserId: string;
    newserUserId: string;
    newserEmail: string;
    updatedAt: number;
};

export const getNewserAssignmentKey = (gameId: string) => {
    return getGameScopedKey('newserAssignment', gameId);
};

export const getNewserAcceptedKey = (gameId: string) => {
    return getGameScopedKey('newserAccepted', gameId);
};

export const getNewspaperControlKey = (gameId: string) => {
    return getGameScopedKey('newspaperControl', gameId);
};

export const getNewspaperDayItemId = (gameId: string, dayIndex: number) => {
    return `${gameId}-day-${dayIndex}`;
};

export const getNewspaperDayControlItemId = (dayIndex: number) => {
    return `day-${dayIndex}`;
};

export const normalizeNewserEmail = (value: string) => {
    return value.trim().toLowerCase();
};

export const resolveJoinedUserByEmail = ({
    email,
    userDatas,
}: {
    email: string;
    userDatas: PublicUserData[];
}) => {
    const normalizedEmail = normalizeNewserEmail(email);

    if (!normalizedEmail) {
        return null;
    }

    const matchingUser = userDatas.find((userData) => {
        return normalizeNewserEmail(userData.email ?? '') === normalizedEmail && Boolean(userData.userId);
    });

    if (!matchingUser?.userId) {
        return null;
    }

    return {
        email: matchingUser.email?.trim() || normalizedEmail,
        userId: matchingUser.userId,
    };
};

export const resolveValidNewserAssignment = ({
    assignment,
    userDatas,
    acceptedRecords,
}: {
    assignment?: NewserAssignment | null;
    userDatas: PublicUserData[];
    acceptedRecords?: NewserAccepted[];
}) => {
    const assignmentEmail = normalizeNewserEmail(assignment?.email ?? '');

    if (!assignmentEmail) {
        return null;
    }

    const resolved = resolveJoinedUserByEmail({
        email: assignmentEmail,
        userDatas,
    });

    // Fall back to the userId stored in the assignment if email-based
    // resolution fails (e.g. userData records not yet loaded or mismatch)
    if (resolved) {
        return resolved;
    }

    if (assignment?.userId) {
        return {
            email: assignment.email?.trim() || assignmentEmail,
            userId: assignment.userId,
        };
    }

    // Fall back to the newser's own acceptance record if one matches the
    // assignment email. The newser writes this under their own userId when
    // they visit the newser page, so the operator can discover their userId
    // even when the operator's userData query doesn't include the newser.
    if (acceptedRecords?.length) {
        const matchingAccepted = acceptedRecords.find((record) => {
            return normalizeNewserEmail(record.email ?? '') === assignmentEmail && Boolean(record.userId);
        });

        if (matchingAccepted?.userId) {
            return {
                email: matchingAccepted.email?.trim() || assignmentEmail,
                userId: matchingAccepted.userId,
            };
        }
    }

    return null;
};

export const resolveNewspaperOwnerUserId = ({
    control,
    operatorUserId,
    validNewserUserId,
}: {
    control?: NewspaperControlState | null;
    operatorUserId: string;
    validNewserUserId?: string;
}) => {
    if (control?.ownerType === 'operator' && control.ownerUserId) {
        return control.ownerUserId;
    }

    if (validNewserUserId) {
        return validNewserUserId;
    }

    return operatorUserId;
};
