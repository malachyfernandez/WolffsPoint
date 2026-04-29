import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useValue, useFindValues, useFindListItems } from '../../../hooks/useData';
import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { useDialogGuildedVariant } from '../../../hooks/useDialogGuildedVariant';
import { PlayerProfile } from '../../../types/multiplayer';
import { UserTableItem } from '../../../types/playerTable';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { getNewserAssignmentKey, NewserAssignment } from '../../../utils/newspaperControl';
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
    const [myProfile, setMyProfile] = useValue<PlayerProfile>(profileKey, {
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

    const { players, isLoading: isPhoneBookLoading } = useAllPlayers({ gameId });

    const isLoading = myProfile.state.isSyncing || isPhoneBookLoading;

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
                <PhoneBookGrid gameId={gameId} players={players} />

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

// Grid component - renders players passed from parent
const PhoneBookGrid = ({ gameId, players }: { gameId: string; players: { userId: string; email: string }[] }) => {
    const [readyCount, setReadyCount] = useState(0);
    const [readyKey, setReadyKey] = useState(0);
    const reportedRef = useRef(new Set<string>());
    const opacity = useSharedValue(0);

    const playerIdsStr = players.map(p => p.userId).join(',');

    useEffect(() => {
        reportedRef.current = new Set();
        setReadyCount(0);
        setReadyKey(k => k + 1);
    }, [playerIdsStr]);

    const markReady = useCallback((userId: string) => {
        if (!reportedRef.current.has(userId)) {
            reportedRef.current.add(userId);
            setReadyCount(c => c + 1);
        }
    }, [readyKey]);

    if (players.length === 0) {
        return (
            <Animated.View entering={FadeIn.duration(300)}>
                <Column className='gap-4 bg-text/5 rounded-3xl p-8 items-center'>
                    <FontText variant='subtext' className='text-center'>No players in this game yet.</FontText>
                </Column>
            </Animated.View>
        );
    }

    const allReady = readyCount >= players.length;

    useEffect(() => {
        if (allReady) {
            opacity.value = withTiming(1, { duration: 300 });
        }
    }, [allReady]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <View style={{ flex: 1, minHeight: 400 }}>
            {!allReady && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                    <LoadingText text='Loading players' />
                </View>
            )}
            <Animated.View style={animatedStyle}>
                <Row className='gap-4 flex-wrap'>
                    {players.map((player, index) => (
                        <PlayerCard
                            key={`${player.userId}-${player.email}`}
                            userId={player.userId}
                            gameId={gameId}
                            email={player.email}
                            index={index}
                            onReady={markReady}
                        />
                    ))}
                    <View className='flex-1 min-w-[280px] opacity-0 pointer-events-none' />
                    <View className='flex-1 min-w-[280px] opacity-0 pointer-events-none' />
                </Row>
            </Animated.View>
        </View>
    );
};

// Hook to get all player profiles
const useAllProfiles = ({ gameId }: { gameId: string }) => {
    const profileKey = getGameScopedKey('playerProfile', gameId);
    const profiles = useFindValues<PlayerProfile>(profileKey, {
        returnTop: 200,
    });

    return profiles?.map((record: any) => record.value) || [];
};

// Hook to get all players - filters by operator's userTable + newser, waits for all data to load
const useAllPlayers = ({ gameId }: { gameId: string }) => {
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

    // Combine profiles and table users
    const allUserIds = new Set([
        ...profiles.map((p: PlayerProfile) => p.userId),
        ...userTable.map((u: UserTableItem) => u.userId)
    ]);

    const players = Array.from(allUserIds).map(userId => ({
        userId,
        email: profiles.find((p: PlayerProfile) => p.userId === userId)?.email ||
            userTable.find((u: UserTableItem) => u.userId === userId)?.email ||
            ''
    })).filter(player => {
        const playerEmail = player.email.trim().toLowerCase();
        return allowedEmails.has(playerEmail);
    }).sort((a, b) => a.email.localeCompare(b.email));

    return { players, isLoading };
};

// Individual player card - subscribes to its own data
const PlayerCard = ({ userId, gameId, email, index = 0, onReady }: { userId: string; gameId: string; email?: string; index?: number; onReady?: (userId: string) => void }) => {
    const identity = useTownSquareAuthorIdentity({ gameId, userId });
    const { profile, isLoading: isProfileLoading } = usePlayerProfile({ userId, gameId });

    const isReady = !identity.isLoading && !isProfileLoading;

    useEffect(() => {
        if (isReady) {
            onReady?.(userId);
        }
    }, [isReady, onReady, userId]);

    // Audit: hide cards with no valid identity data (orphaned profiles)
    const hasValidData = (identity.displayName && identity.displayName !== 'Unknown' &&
                         identity.displayName.trim().length > 0) ||
                         (profile && profile.inGameName && profile.inGameName.trim().length > 0);

    if (!hasValidData) {
        return null;
    }

    // Check if identity data is still loading (has '?' as initials indicates no data loaded yet)
    const isLoading = identity.fallbackInitials === '?' && !identity.displayName;

    const displayName = identity.displayName || 'Unknown';
    const bioMarkdown = profile?.bioMarkdown?.trim().length
        ? profile.bioMarkdown
        : '*No Bio*';

    return (
        <View className='flex-1 min-w-[280px]'>
            <Animated.View entering={FadeIn.duration(300).delay(index * 50)}>
                <PlayerProfilePreviewCard
                    displayName={displayName}
                    bioMarkdown={bioMarkdown}
                    imageUrl={identity.imageUrl || undefined}
                    initials={identity.fallbackInitials === '?' ? '' : identity.fallbackInitials}
                    profile={profile}
                    email={email}
                    isLoading={isLoading}
                />
            </Animated.View>
        </View>
    );
};

// Avatar component - just handles the avatar display
export { PlayerProfileAvatar as PlayerAvatar } from './PlayerProfilePreviewCard';

// Contact info component - only shows if profile exists
export { PlayerProfileContactInfo as PlayerContactInfo } from './PlayerProfilePreviewCard';

// Hook to get player profile
const usePlayerProfile = ({ userId, gameId }: { userId: string; gameId: string }) => {
    const profileKey = getGameScopedKey('playerProfile', gameId);
    const profiles = useFindValues<PlayerProfile>(profileKey, {
        userIds: [userId],
        returnTop: 1,
    });

    return {
        profile: profiles?.[0]?.value || null,
        isLoading: profiles === undefined,
    };
};

export default PhoneBookPagePLAYER;
