import React, { ReactNode, useMemo, useState } from 'react';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useSharedListValue } from '../../../hooks/useSharedListValue';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppButton from '../ui/buttons/AppButton';
import PlayerProfileDialog from './PlayerProfileDialogNEW';
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
    const [userData] = useUserVariable<UserData>({
        key: 'userData',
        defaultValue: { name: '', email: '', userId: '' },
        privacy: 'PUBLIC',
    });
    const { value: userTable } = useSharedListValue<UserTableItem[]>({
        key: 'userTable',
        itemId: gameId,
        defaultValue: [],
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

    
    if (!currentEmail.trim()) {
        return (
            <Column className='rounded-xl border border-subtle-border bg-white p-4'>
                <PoppinsText varient='subtext'>Loading your account information…</PoppinsText>
            </Column>
        );
    }

    if (!matchingPlayer) {
        return (
            <Column className='rounded-xl border border-subtle-border bg-white p-4' gap={3}>
                <PoppinsText weight='medium'>You are not on this game&apos;s player list.</PoppinsText>
                <PoppinsText varient='subtext'>The operator needs to add {currentEmail} to the players table before you can enter.</PoppinsText>
            </Column>
        );
    }

    if (profile.value.inGameName.trim().length === 0) {
        return (
            <>
                <Column className='rounded-xl border border-subtle-border bg-white p-4' gap={3}>
                    <PoppinsText weight='medium'>Claim your player profile</PoppinsText>
                    <PoppinsText varient='subtext'>You matched the email {matchingPlayer.email}. Finish your in-game profile to enter the player tabs.</PoppinsText>
                    <Row>
                        <AppButton variant='black' className='w-44' onPress={() => setIsProfileDialogOpen(true)}>
                            <PoppinsText weight='medium' color='white'>Set up profile</PoppinsText>
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
            </>
        );
    }

    return (
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
    );
};

export default PlayerAccessGate;
