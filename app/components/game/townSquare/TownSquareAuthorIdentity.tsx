import React, { useMemo } from 'react';
import { useUserVariableGet } from '../../../../hooks/useUserVariableGet';
import { PlayerProfile } from '../../../../types/multiplayer';
import { getGameScopedKey } from '../../../../utils/multiplayer';
import PoppinsText from '../../ui/text/PoppinsText';
import TownSquareAvatar from './TownSquareAvatar';

type PublicUserData = {
    email?: string;
    name?: string;
    userId?: string;
};

const getInitials = (value: string) => {
    const parts = value
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) {
        return '?';
    }

    return parts.map((part) => part.slice(0, 1).toUpperCase()).join('');
};

export const useTownSquareAuthorIdentity = ({ gameId, userId }: { gameId: string; userId: string }) => {
    const profileKey = getGameScopedKey('playerProfile', gameId);
    const playerProfiles = useUserVariableGet<PlayerProfile>({
        key: profileKey,
        returnTop: 1,
        userIds: [userId],
    });
    const userDatas = useUserVariableGet<PublicUserData>({
        key: 'userData',
        returnTop: 1,
        userIds: [userId],
    });

    return useMemo(() => {
        const profile = playerProfiles?.[0]?.value;
        const userData = userDatas?.[0]?.value;
        const inGameName = profile?.inGameName?.trim() || '';
        const realName = userData?.name?.trim() || '';
        const email = userData?.email?.trim() || '';
        const displayName = inGameName
            ? realName && realName !== inGameName
                ? `${inGameName} (${realName})`
                : inGameName
            : realName || email || 'Unknown';
        const fallbackLabel = inGameName || realName || email || '?';

        return {
            displayName,
            fallbackInitials: getInitials(fallbackLabel),
            fallbackLabel,
            imageUrl: profile?.profileImageUrl?.trim() || '',
            inGameName,
        };
    }, [playerProfiles, userDatas]);
};

interface TownSquareAuthorNameProps {
    className?: string;
    color?: 'black' | 'white';
    gameId: string;
    userId: string;
    varient?: 'default' | 'heading' | 'subtext';
    weight?: 'regular' | 'medium' | 'bold';
}

export const TownSquareAuthorName = ({
    className,
    color,
    gameId,
    userId,
    varient,
    weight,
}: TownSquareAuthorNameProps) => {
    const { displayName } = useTownSquareAuthorIdentity({ gameId, userId });

    return (
        <PoppinsText className={className} color={color} varient={varient} weight={weight}>
            {displayName}
        </PoppinsText>
    );
};

interface TownSquareAuthorAvatarProps {
    gameId: string;
    size?: number;
    userId: string;
}

export const TownSquareAuthorAvatar = ({ gameId, size, userId }: TownSquareAuthorAvatarProps) => {
    const { fallbackInitials, imageUrl } = useTownSquareAuthorIdentity({ gameId, userId });

    return <TownSquareAvatar fallbackLabel={fallbackInitials} size={size} uri={imageUrl} />;
};
