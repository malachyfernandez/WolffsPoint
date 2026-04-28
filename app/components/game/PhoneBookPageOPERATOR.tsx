import React, { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useValue, useFindValues, useFindListItems } from '../../../hooks/useData';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { PlayerProfile } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { getNewserAssignmentKey, NewserAssignment } from '../../../utils/newspaperControl';
import LoadingText from '../ui/loading/LoadingText';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import PlayerProfilePreviewCard from './PlayerProfilePreviewCard';

interface PhoneBookPageOPERATORProps {
    gameId: string;
    currentUserId: string;
    onBack: () => void;
}

// View-only operator phonebook - no edit functionality
const PhoneBookPageOPERATOR = ({ gameId, currentUserId, onBack }: PhoneBookPageOPERATORProps) => {
    const { players, isLoading } = useAllPlayers({ gameId, currentUserId });

    if (isLoading) {
        return (
            <Column className='gap-4 flex-1 min-h-[760px] items-center justify-center'>
                <LoadingText text='Loading phone book' />
            </Column>
        );
    }

    return (
        <Column className='gap-6 pb-6'>
            <Pressable onPress={onBack} className='self-start py-1'>
                <Row className='gap-4 items-center'>
                    <ChevronLeft size={20} color='rgb(46, 41, 37)' />
                    <FontText weight='medium'>Config</FontText>
                </Row>
            </Pressable>

            <PhoneBookHeader />
            <PhoneBookGrid gameId={gameId} players={players} />
        </Column>
    );
};

// Header component - just shows the title, no edit button
const PhoneBookHeader = () => {
    return (
        <Column className='gap-0'>
            <FontText weight='bold' className='text-xl'>Phone Book</FontText>
            <FontText variant='subtext'>All players in the game.</FontText>
        </Column>
    );
};

// Grid component - renders players passed from parent
const PhoneBookGrid = ({ gameId, players }: { gameId: string; players: { userId: string; email: string }[] }) => {
    if (players.length === 0) {
        return (
            <Column className='gap-4 bg-text/5 rounded-3xl p-8 items-center'>
                <FontText variant='subtext' className='text-center'>No players in this game yet.</FontText>
            </Column>
        );
    }

    return (
        <Row className='gap-4 flex-wrap'>
            {players.map((player) => (
                <PlayerCardWithContainer 
                    key={`${player.userId}-${player.email}`} 
                    userId={player.userId} 
                    gameId={gameId}
                    email={player.email}
                />
            ))}
        </Row>
    );
};

// Hook to get all players - filters by operator's userTable + newser, waits for all data to load
const useAllPlayers = ({ gameId, currentUserId }: { gameId: string; currentUserId: string }) => {
    const profiles = useAllProfiles({ gameId });
    const { operatorUserId, isLoading: isOperatorLoading } = useGameOperatorUserId(gameId);
    const operatorUserTableRecords = useFindListItems<UserTableItem[]>("userTable", {
        itemId: gameId,
        userIds: operatorUserId ? [operatorUserId] : undefined,
        returnTop: 1,
    });
    const userTable = operatorUserTableRecords?.[0]?.value ?? [];
    const newserAssignmentRecords = useFindValues<NewserAssignment>(getNewserAssignmentKey(gameId), {
        returnTop: 1,
        userIds: operatorUserId ? [operatorUserId] : undefined,
    });
    const newserAssignment = newserAssignmentRecords?.[0]?.value ?? { email: '', userId: '', assignedAt: 0 };
    const newserEmail = newserAssignment.email?.trim()?.toLowerCase() ?? '';

    // Loading check: wait for all data sources
    const isUserTableLoading = operatorUserTableRecords === undefined || isOperatorLoading;
    const isProfilesLoading = profiles === undefined;
    const isNewserLoading = newserAssignmentRecords === undefined;
    const isLoading = isUserTableLoading || isProfilesLoading || isNewserLoading;

    // Build allowed emails from userTable + newser
    const allowedEmails = new Set<string>([
        ...userTable.map((u: UserTableItem) => u.email?.trim()?.toLowerCase()).filter((e): e is string => Boolean(e)),
        ...(newserEmail ? [newserEmail] : []),
    ]);

    // Combine profiles and table users, filter out operator
    const allUserIds = new Set([
        ...profiles.map((p: PlayerProfile) => p.userId),
        ...userTable.map((u: UserTableItem) => u.userId)
    ]);

    const players = Array.from(allUserIds)
        .filter(userId => userId !== currentUserId)
        .map(userId => ({
            userId,
            email: profiles.find((p: PlayerProfile) => p.userId === userId)?.email ||
                userTable.find((u: UserTableItem) => u.userId === userId)?.email ||
                ''
        }))
        .filter(player => {
            const playerEmail = player.email.trim().toLowerCase();
            return allowedEmails.has(playerEmail);
        })
        .sort((a, b) => a.email.localeCompare(b.email));

    return { players, isLoading };
};

// Player card with container that handles hiding invalid players
const PlayerCardWithContainer = ({ userId, gameId, email }: { userId: string; gameId: string; email?: string }) => {
    const identity = useTownSquareAuthorIdentity({ gameId, userId });
    const profile = usePlayerProfile({ userId, gameId });

    // Check if player has valid data
    const hasValidData = identity.displayName && identity.displayName !== 'Unknown' &&
                        identity.displayName.trim().length > 0 ||
                        (profile && profile.inGameName && profile.inGameName.trim().length > 0);

    if (!hasValidData) {
        return null;
    }

    return (
        <View className='flex-1 min-w-[280px]'>
            <PlayerCard userId={userId} gameId={gameId} email={email} />
        </View>
    );
};

// Hook to get all profiles
const useAllProfiles = ({ gameId }: { gameId: string }) => {
    const profileKey = getGameScopedKey('playerProfile', gameId);
    const profiles = useFindValues<PlayerProfile>(profileKey, {
        returnTop: 200,
    });

    return profiles?.map((record: any) => record.value) || [];
};

// Individual player card - subscribes to its own data
const PlayerCard = ({ userId, gameId, email }: { userId: string; gameId: string; email?: string }) => {
    const identity = useTownSquareAuthorIdentity({ gameId, userId });
    const profile = usePlayerProfile({ userId, gameId });

    const displayName = identity.displayName || 'Unknown';
    const bioMarkdown = profile?.bioMarkdown?.trim().length
        ? profile.bioMarkdown
        : '*No Bio*';

    return (
        <PlayerProfilePreviewCard
            displayName={displayName}
            bioMarkdown={bioMarkdown}
            imageUrl={identity.imageUrl || undefined}
            initials={identity.fallbackInitials}
            profile={profile}
            email={email}
        />
    );
};

// Hook to get player profile
const usePlayerProfile = ({ userId, gameId }: { userId: string; gameId: string }) => {
    const profileKey = getGameScopedKey('playerProfile', gameId);
    const profiles = useFindValues<PlayerProfile>(profileKey, {
        userIds: [userId],
        returnTop: 1,
    });

    return profiles?.[0]?.value || null;
};

export default PhoneBookPageOPERATOR;
