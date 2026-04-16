import React, { useMemo, useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image, Pressable, View } from 'react-native';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { useUserList } from '../../../hooks/useUserList';
import { PlayerProfile } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import LoadingText from '../ui/loading/LoadingText';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import PlayerProfileDialog from './PlayerProfileDialogNEW';
import PlayerProfilePreviewCard from './PlayerProfilePreviewCard';

interface PhoneBookPagePLAYERProps {
    gameId: string;
    currentUserId: string;
    currentEmail: string;
}

// Simple container component - just manages the dialog and layout
const PhoneBookPagePLAYER = ({ gameId, currentUserId, currentEmail }: PhoneBookPagePLAYERProps) => {
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const profileKey = getGameScopedKey('playerProfile', gameId);
    const [myProfile, setMyProfile] = useUserVariable<PlayerProfile>({
        key: profileKey,
        defaultValue: {
            gameId,
            email: currentEmail,
            userId: currentUserId,
            inGameName: '',
            profileImageUrl: '',
            phoneNumber: '',
            instagram: '',
            discord: '',
            otherContact: '',
            bioMarkdown: '',
            claimedAt: 0,
        },
        privacy: 'PUBLIC',
        searchKeys: ['inGameName', 'bioMarkdown'],
        sortKey: 'inGameName',
    });
    const initialProfileValue = useMemo(() => ({
        ...myProfile.value,
        gameId,
        email: currentEmail,
        userId: currentUserId,
    }), [currentEmail, currentUserId, gameId, myProfile.value]);

    const isLoading = myProfile.state.isSyncing;

    if (isLoading) {
        return (
            <Column className='flex-1 min-h-[760px] items-center justify-center'>
                <LoadingText text='Loading phone book' delayMs={1500} />
            </Column>
        );
    }

    return (
        <Animated.View entering={FadeIn.duration(300)} className='flex-1 min-h-[760px]'>
            <Column className='flex-1' gap={6}>
                <PhoneBookHeader
                    onEditProfile={() => setIsProfileDialogOpen(true)}
                />
                <MyProfileCard
                    profile={initialProfileValue}
                    onPress={() => setIsProfileDialogOpen(true)}
                />
                <PhoneBookGrid gameId={gameId} />

                <PlayerProfileDialog
                    initialValue={initialProfileValue}
                    isOpen={isProfileDialogOpen}
                    onOpenChange={setIsProfileDialogOpen}
                    onSave={setMyProfile}
                    title='Edit your profile'
                />
            </Column>
        </Animated.View>
    );
};

// My Profile Card component - displays current user's profile as a clickable button
const MyProfileCard = ({ profile, onPress }: { profile: PlayerProfile; onPress: () => void }) => {
    const displayName = profile.inGameName || 'Your Profile';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <Pressable
            onPress={onPress}
            className="w-full rounded-2xl border border-subtle-border bg-none p-4 hover:bg-text/5 transition-colors"
        >
            <Row className="items-center gap-4">
                {profile.profileImageUrl ? (
                    <Image
                        source={{ uri: profile.profileImageUrl }}
                        className="w-16 h-16 rounded-xl border border-subtle-border"
                        resizeMode='cover'
                    />
                ) : (
                    <View className="w-16 h-16 rounded-xl border border-subtle-border bg-white items-center justify-center">
                        <PoppinsText weight='bold' className='text-lg'>{initials}</PoppinsText>
                    </View>
                )}
                <Column className="flex-1">
                    <PoppinsText weight='medium' className='text-lg'>{displayName}</PoppinsText>
                    {profile.bioMarkdown?.trim() ? (
                        <MarkdownRenderer
                            markdown={profile.bioMarkdown}
                            className="text-sm opacity-75"
                        />
                    ) : (
                        <PoppinsText varient='subtext' className='text-sm'>Tap to edit your profile</PoppinsText>
                    )}
                </Column>
            </Row>
        </Pressable>
    );
};

// Header component - just manages the header layout and button
const PhoneBookHeader = ({ onEditProfile }: { onEditProfile: () => void }) => {
    return (
        <Row className='justify-between items-center'>
            <Column gap={0}>
                <PoppinsText weight='bold' className='text-xl'>Phone Book</PoppinsText>
                <PoppinsText varient='subtext'>All players in the game.</PoppinsText>
            </Column>
            <AppButton variant='black' className='w-36' onPress={onEditProfile}>
                <PoppinsText weight='medium' color='white'>Edit profile</PoppinsText>
            </AppButton>
        </Row>
    );
};

// Grid component - gets all players and renders them
const PhoneBookGrid = ({ gameId }: { gameId: string }) => {
    const allPlayers = useAllPlayers({ gameId });

    if (allPlayers.length === 0) {
        return (
            <Animated.View entering={FadeIn.duration(300)}>
                <Column className='bg-text/5 rounded-3xl p-8 items-center'>
                    <PoppinsText varient='subtext' className='text-center'>No players in this game yet.</PoppinsText>
                </Column>
            </Animated.View>
        );
    }

    return (
        <Row className='flex-wrap  gap-4'>
            {allPlayers.map((player, index) => (
                <View key={`${player.userId}-${player.email}`} className='flex-1 min-w-[280px]'>
                    <Animated.View entering={FadeIn.duration(300).delay(index * 50)}>
                        <PlayerCard userId={player.userId} gameId={gameId} />
                    </Animated.View>
                </View>
            ))}
        </Row>
    );
};

// Hook to get all players - handles the data logic
const useAllPlayers = ({ gameId }: { gameId: string }) => {
    const profiles = useAllProfiles({ gameId });
    const tableUsers = useAllTableUsers({ gameId });

    // Combine and deduplicate
    const allUserIds = new Set([
        ...profiles.map((p: PlayerProfile) => p.userId),
        ...tableUsers.map((u: UserTableItem) => u.userId)
    ]);

    return Array.from(allUserIds).map(userId => ({
        userId,
        email: profiles.find((p: PlayerProfile) => p.userId === userId)?.email ||
            tableUsers.find((u: UserTableItem) => u.userId === userId)?.email ||
            ''
    })).sort((a, b) => a.email.localeCompare(b.email));
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

    // Check if identity data is still loading (has '?' as initials indicates no data loaded yet)
    const isLoading = identity.fallbackInitials === '?' && !identity.displayName;

    const displayName = identity.displayName || 'Unknown';
    const bioMarkdown = profile?.bioMarkdown?.trim().length
        ? profile.bioMarkdown
        : '*No Bio*';

    return (
        <PlayerProfilePreviewCard
            displayName={displayName}
            bioMarkdown={bioMarkdown}
            imageUrl={identity.imageUrl || undefined}
            initials={identity.fallbackInitials === '?' ? '' : identity.fallbackInitials}
            profile={profile}
            isLoading={isLoading}
        />
    );
};

// Avatar component - just handles the avatar display
export { PlayerProfileAvatar as PlayerAvatar } from './PlayerProfilePreviewCard';

// Contact info component - only shows if profile exists
export { PlayerProfileContactInfo as PlayerContactInfo } from './PlayerProfilePreviewCard';

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

export default PhoneBookPagePLAYER;
