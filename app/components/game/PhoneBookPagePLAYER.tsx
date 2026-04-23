import React, { useMemo, useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { useUserList } from '../../../hooks/useUserList';
import { useDialogGuildedVariant } from '../../../hooks/useDialogGuildedVariant';
import { PlayerProfile } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import PlayerProfileDialog from './PlayerProfileDialogNEW';
import PlayerProfilePreviewCard from './PlayerProfilePreviewCard';
import ShadowScrollView from '../ui/ShadowScrollView';

interface PhoneBookPagePLAYERProps {
    gameId: string;
    currentUserId: string;
    currentEmail: string;
}

// Simple container component - just manages the dialog and layout
const PhoneBookPagePLAYER = ({ gameId, currentUserId, currentEmail }: PhoneBookPagePLAYERProps) => {
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const frameVariant = useDialogGuildedVariant();
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


    const { width } = useWindowDimensions();
    const showEditButton = width >= 410;


    if (isLoading) {
        return (
            <Column className='gap-4 flex-1 min-h-[760px] items-center justify-center'>
                <LoadingText text='Loading phone book' />
            </Column>
        );
    }

    return (
        <Animated.View entering={FadeIn.duration(300)} className='flex-1 min-h-[760px]'>

            <Column className='gap-6 flex-1 py-3 sm:px-4'>
                <PhoneBookHeader
                    onEditProfile={() => setIsProfileDialogOpen(true)}
                />
                <MyProfileCard
                    profile={initialProfileValue}
                    onPress={() => setIsProfileDialogOpen(true)}
                />
                {!showEditButton && (
                    <Row className='-mt-2'>
                        <AppButton
                            variant='accent'
                            className='w-full'
                            onPress={() => setIsProfileDialogOpen(true)}
                        >
                            <FontText weight='medium' color='white'>Edit profile</FontText>
                        </AppButton>
                    </Row>
                )}
                <PhoneBookGrid gameId={gameId} />

                <PlayerProfileDialog
                    initialValue={initialProfileValue}
                    isOpen={isProfileDialogOpen}
                    onOpenChange={setIsProfileDialogOpen}
                    onSave={setMyProfile}
                    title='Edit your profile'
                    frameVariant={frameVariant}
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
            <Row className="gap-4 items-center">
                {profile.profileImageUrl ? (
                    <Image
                        source={{ uri: profile.profileImageUrl }}
                        className="w-16 h-16 rounded-xl border border-subtle-border"
                        resizeMode='cover'
                    />
                ) : (
                    <View className="w-16 h-16 rounded-xl border border-subtle-border bg-white items-center justify-center">
                        <FontText weight='bold' className='text-lg'>{initials}</FontText>
                    </View>
                )}
                <Column className="gap-4 flex-1">
                    <FontText weight='medium' className='text-lg'>{displayName}</FontText>
                    {profile.bioMarkdown?.trim() ? (
                        <View pointerEvents='none'>
                            <ShadowScrollView className="max-h-20">
                                <MarkdownRenderer
                                    markdown={profile.bioMarkdown}
                                    className="text-sm opacity-75"
                                />
                            </ShadowScrollView>
                        </View> 
                    ) : (
                        <FontText variant='subtext' className='text-sm'>Tap to edit your profile</FontText>
                    )}
                </Column>
            </Row>
        </Pressable>
    );
};

// Header component - just manages the header layout and button
const PhoneBookHeader = ({ onEditProfile }: { onEditProfile: () => void }) => {
    const { width } = useWindowDimensions();
    const showEditButton = width >= 410;

    return (
        <Row className='gap-4 justify-between items-center'>
            <Column className='gap-0'>

                <>
                    <FontText weight='bold' className='text-xl'>Phone Book</FontText>
                    <FontText variant='subtext'>All players in the game.</FontText>
                </>


            </Column>
            {showEditButton && (
                <AppButton variant='accent' className='w-40' onPress={onEditProfile}>
                    <FontText weight='medium' color='white'>Edit profile</FontText>
                </AppButton>
            )}

        </Row>
    );
};

// Grid component - gets all players and renders them
const PhoneBookGrid = ({ gameId }: { gameId: string }) => {
    const allPlayers = useAllPlayers({ gameId });

    if (allPlayers.length === 0) {
        return (
            <Animated.View entering={FadeIn.duration(300)}>
                <Column className='gap-4 bg-text/5 rounded-3xl p-8 items-center'>
                    <FontText variant='subtext' className='text-center'>No players in this game yet.</FontText>
                </Column>
            </Animated.View>
        );
    }

    return (
        <Row className='gap-4 flex-wrap'>
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
