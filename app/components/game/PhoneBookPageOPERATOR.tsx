import React, { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { useUserList } from '../../../hooks/useUserList';
import { PlayerProfile } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import { getGameScopedKey } from '../../../utils/multiplayer';
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
    return (
        <Column className='pb-6' gap={6}>
            <Pressable onPress={onBack} className='self-start py-1'>
                <Row className='items-center gap-2'>
                    <ChevronLeft size={20} color='rgb(46, 41, 37)' />
                    <FontText weight='medium'>Config</FontText>
                </Row>
            </Pressable>

            <PhoneBookHeader />
            <PhoneBookGrid gameId={gameId} currentUserId={currentUserId} />
        </Column>
    );
};

// Header component - just shows the title, no edit button
const PhoneBookHeader = () => {
    return (
        <Column gap={0}>
            <FontText weight='bold' className='text-xl'>Phone Book</FontText>
            <FontText variant='subtext'>All players in the game.</FontText>
        </Column>
    );
};

// Grid component - gets all players and renders them
const PhoneBookGrid = ({ gameId, currentUserId }: { gameId: string; currentUserId: string }) => {
    const allPlayers = useAllPlayers({ gameId, currentUserId });

    if (allPlayers.length === 0) {
        return (
            <Column className='bg-text/5 rounded-3xl p-8 items-center'>
                <FontText variant='subtext' className='text-center'>No players in this game yet.</FontText>
            </Column>
        );
    }

    return (
        <Row className='flex-wrap  gap-4'>
            {allPlayers.map((player) => (
                <PlayerCardWithContainer 
                    key={`${player.userId}-${player.email}`} 
                    userId={player.userId} 
                    gameId={gameId} 
                />
            ))}
        </Row>
    );
};

// Hook to get all players - handles the data logic
const useAllPlayers = ({ gameId, currentUserId }: { gameId: string; currentUserId: string }) => {
    const profiles = useAllProfiles({ gameId });
    const tableUsers = useAllTableUsers({ gameId });

    // Combine and deduplicate
    const allUserIds = new Set([
        ...profiles.map((p: PlayerProfile) => p.userId),
        ...tableUsers.map((u: UserTableItem) => u.userId)
    ]);

    return Array.from(allUserIds)
        .filter(userId => userId !== currentUserId) // Filter out the operator
        .map(userId => ({
            userId,
            email: profiles.find((p: PlayerProfile) => p.userId === userId)?.email ||
                tableUsers.find((u: UserTableItem) => u.userId === userId)?.email ||
                ''
        }))
        .filter(player => {
            // Filter out unknown/invalid entries
            const profile = profiles.find((p: PlayerProfile) => p.userId === player.userId);
            const tableUser = tableUsers.find((u: UserTableItem) => u.userId === player.userId);
            
            // Keep if has valid email or valid profile data
            return player.email.trim().length > 0 || 
                   (profile && profile.inGameName && profile.inGameName.trim().length > 0) ||
                   (tableUser && tableUser.email && tableUser.email.trim().length > 0);
        })
        .sort((a, b) => a.email.localeCompare(b.email));
};

// Player card with container that handles hiding invalid players
const PlayerCardWithContainer = ({ userId, gameId }: { userId: string; gameId: string }) => {
    const identity = useTownSquareAuthorIdentity({ gameId, userId });
    const profile = usePlayerProfile({ userId, gameId });

    // Check if player has valid data
    const hasValidData = identity.displayName && identity.displayName !== 'Unknown' && 
                        identity.displayName.trim().length > 0 ||
                        (profile && profile.inGameName && profile.inGameName.trim().length > 0);

    if (!hasValidData) {
        return (
            <View className='flex-1 min-w-[280px] hidden'>
                {/* Hidden container to maintain grid structure */}
            </View>
        );
    }

    return (
        <View className='flex-1 min-w-[280px]'>
            <PlayerCard userId={userId} gameId={gameId} />
        </View>
    );
};

// Hook to get all profiles
const useAllProfiles = ({ gameId }: { gameId: string }) => {
    const profileKey = getGameScopedKey('playerProfile', gameId);
    const profiles = useUserVariableGet<PlayerProfile>({
        key: profileKey,
        returnTop: 200,
    });

    return profiles?.map((record: any) => record.value) || [];
};

// Hook to get all table users  
const useAllTableUsers = ({ gameId }: { gameId: string }) => {
    const [userTable] = useUserList<UserTableItem[]>({
        key: "userTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    return userTable?.value || [];
};

// Individual player card - subscribes to its own data
const PlayerCard = ({ userId, gameId }: { userId: string; gameId: string }) => {
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
        />
    );
};

// Hook to get player profile
const usePlayerProfile = ({ userId, gameId }: { userId: string; gameId: string }) => {
    const profileKey = getGameScopedKey('playerProfile', gameId);
    const profiles = useUserVariableGet<PlayerProfile>({
        key: profileKey,
        userIds: [userId],
        returnTop: 1,
    });

    return profiles?.[0]?.value || null;
};

export default PhoneBookPageOPERATOR;
