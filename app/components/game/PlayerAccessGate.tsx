import React, { ReactNode, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import AppButton from '../ui/buttons/AppButton';
import PlayerProfileDialog from './PlayerProfileDialogNEW';
 import { useGameOperatorUserId } from '../../../hooks/useGameOperatorUserId';
import { UserTableItem } from '../../../types/playerTable';
import { PlayerProfile } from '../../../types/multiplayer';
import { getGameScopedKey } from '../../../utils/multiplayer';

interface UserData {
    name: string;
    email: string;
    userId: string;
}

interface PlayerAccessGateProps {
    gameId: string;
    currentUserId: string;
    children: (args: {
        currentEmail: string;
        matchingPlayer: UserTableItem;
        profile: PlayerProfile;
        setProfile: (profile: PlayerProfile) => void;
    }) => ReactNode;
}

const PlayerAccessGate = ({ gameId, currentUserId, children }: PlayerAccessGateProps) => {
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const { operatorUserId, isLoading: isOperatorLoading } = useGameOperatorUserId(gameId);
    const [userData] = useUserVariable<UserData>({
        key: 'userData',
        defaultValue: { name: '', email: '', userId: '' },
        privacy: 'PUBLIC',
    });
    const { value: userTable, isLoading: isUserTableLoading } = useSharedListValue<UserTableItem[]>({
        key: 'userTable',
        itemId: gameId,
        defaultValue: [],
        userIds: operatorUserId ? [operatorUserId] : undefined,
    });

    const currentEmail = userData.value.email ?? '';
    const matchingPlayer = useMemo(() => {
        return userTable.find((player) => player.email.trim().toLowerCase() === currentEmail.trim().toLowerCase());
    }, [currentEmail, userTable]);

    const [profile, setProfile] = useUserVariable<PlayerProfile>({
        key: getGameScopedKey('playerProfile', gameId),
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
        ...profile.value,
        gameId,
        email: currentEmail,
        userId: currentUserId,
    }), [currentEmail, currentUserId, gameId, profile.value]);

    // Check if all major data has finished loading (not syncing during initial load)
    const hasLoaded = useMemo(() => {
        const userDataLoaded = !userData.state.isSyncing;
        const userTableLoaded = !isOperatorLoading && !isUserTableLoading;
        const profileLoaded = !profile.state.isSyncing;
        return userDataLoaded && userTableLoaded && profileLoaded;
    }, [userData.state.isSyncing, isOperatorLoading, isUserTableLoading, profile.state.isSyncing]);

    // Show loading state while syncing for the first time
    if (!hasLoaded) {
        return (
            <LoadingText text='Loading your account information' />
        );
    }

    if (!currentEmail.trim()) {
        return (
            <View>
                <Animated.View entering={FadeInUp.duration(300)}>
                    <Column className='gap-4 rounded-xl border border-subtle-border bg-white p-4'>
                        <LoadingText text='Loading your account information' />
                    </Column>
                </Animated.View>
            </View>
        );
    }

    if (!matchingPlayer) {
        return (
            <Animated.View entering={FadeInUp.duration(300)}>
                <Column className='gap-3 rounded-xl border border-subtle-border bg-white p-4'>
                    <FontText weight='medium'>You are not on this game&apos;s player list.</FontText>
                    <FontText variant='subtext'>The operator needs to add {currentEmail} to the players table before you can enter.</FontText>
                </Column>
            </Animated.View>
        );
    }

    if (profile.value.inGameName.trim().length === 0) {
        return (
            <Animated.View entering={FadeInUp.duration(300)}>
                <Column className='gap-3 rounded-xl border border-subtle-border bg-white p-4'>
                    <FontText weight='medium'>Claim your player profile</FontText>
                    <FontText variant='subtext'>You matched the email {matchingPlayer.email}. Finish your in-game profile to enter the player tabs.</FontText>
                    <Row className='gap-4'>
                        <AppButton variant='accent' className='w-44' onPress={() => setIsProfileDialogOpen(true)}>
                            <FontText weight='medium' color='white'>Set up profile</FontText>
                        </AppButton>
                    </Row>
                </Column>
                <PlayerProfileDialog
                    initialValue={initialProfileValue}
                    isOpen={isProfileDialogOpen}
                    onOpenChange={setIsProfileDialogOpen}
                    onSave={setProfile}
                    title='Claim your player profile'
                    saveLabel='Enter game'
                />
            </Animated.View>
        );
    }

    return (
        // <Animated.View entering={FadeInUp.duration(300)} style={{ flex: 1 }}>
        <>
            {children({
                currentEmail,
                matchingPlayer,
                profile: initialProfileValue,
                setProfile,
            })}
            <PlayerProfileDialog
                initialValue={initialProfileValue}
                isOpen={isProfileDialogOpen}
                onOpenChange={setIsProfileDialogOpen}
                onSave={setProfile}
                title='Edit your player profile'
            />
        </>
        // </Animated.View>
    );
};

export default PlayerAccessGate;
