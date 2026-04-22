import React, { ReactNode, useMemo, useState } from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useUserVariable } from '../../../hooks/useUserVariable';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import AppButton from '../ui/buttons/AppButton';
import PlayerProfileDialog from './PlayerProfileDialogNEW';
import { PlayerProfile } from '../../../types/multiplayer';
import { getGameScopedKey } from '../../../utils/multiplayer';
import { PlayerStatusProvider } from '../../../contexts/PlayerStatusContext';

interface UserData {
    name: string;
    email: string;
    userId: string;
}

interface ParticipantAccessGateProps {
    gameId: string;
    currentUserId: string;
    children: (args: {
        currentEmail: string;
        profile: PlayerProfile;
        setProfile: (profile: PlayerProfile) => void;
    }) => ReactNode;
}

const ParticipantAccessGate = ({ gameId, currentUserId, children }: ParticipantAccessGateProps) => {
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [userData] = useUserVariable<UserData>({
        key: 'userData',
        defaultValue: { name: '', email: '', userId: '' },
        privacy: 'PUBLIC',
    });
    const [profile, setProfile] = useUserVariable<PlayerProfile>({
        key: getGameScopedKey('playerProfile', gameId),
        defaultValue: {
            gameId,
            email: userData.value.email ?? '',
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

    const currentEmail = userData.value.email ?? '';
    const initialProfileValue = useMemo(() => ({
        ...profile.value,
        gameId,
        email: currentEmail,
        userId: currentUserId,
    }), [currentEmail, currentUserId, gameId, profile.value]);

    const hasLoaded = useMemo(() => {
        return !userData.state.isSyncing && !profile.state.isSyncing;
    }, [profile.state.isSyncing, userData.state.isSyncing]);

    if (!hasLoaded || !currentEmail.trim()) {
        return (
            <Animated.View entering={FadeInUp.duration(300)}>
                <Column className='gap-4 rounded-xl border border-subtle-border bg-white p-4'>
                    <LoadingText text='Loading your account information' />
                </Column>
            </Animated.View>
        );
    }

    if (profile.value.inGameName.trim().length === 0) {
        return (
            <Animated.View entering={FadeInUp.duration(300)}>
                <Column className='gap-3 rounded-xl border border-subtle-border bg-white p-4'>
                    <FontText weight='medium'>Claim your profile</FontText>
                    <FontText variant='subtext'>Finish your in-game profile to enter these tabs.</FontText>
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
                    title='Claim your profile'
                    saveLabel='Enter game'
                />
            </Animated.View>
        );
    }

    return (
        <PlayerStatusProvider isPlayerDead={false}>
            {children({
                currentEmail,
                profile: initialProfileValue,
                setProfile,
            })}
            <PlayerProfileDialog
                initialValue={initialProfileValue}
                isOpen={isProfileDialogOpen}
                onOpenChange={setIsProfileDialogOpen}
                onSave={setProfile}
                title='Edit your profile'
            />
        </PlayerStatusProvider>
    );
};

export default ParticipantAccessGate;
