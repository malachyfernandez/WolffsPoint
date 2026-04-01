import React, { useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { PlayerProfile } from '../../../types/multiplayer';
import { getGameScopedKey } from '../../../utils/multiplayer';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import PlayerProfileDialog from './PlayerProfileDialog';

interface PhoneBookPagePLAYERProps {
    gameId: string;
    currentUserId: string;
    currentEmail: string;
}

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
    const allProfiles = useUserVariableGet<PlayerProfile>({
        key: profileKey,
        returnTop: 200,
    });

    const sortedProfiles = useMemo(() => {
        return [...(allProfiles ?? [])]
            .map((record) => record.value)
            .filter((profile) => profile.inGameName.trim().length > 0)
            .sort((left, right) => left.inGameName.localeCompare(right.inGameName));
    }, [allProfiles]);

    return (
        <Column gap={4}>
            <Row className='justify-between items-center'>
                <Column gap={0}>
                    <PoppinsText weight='medium'>Phone Book</PoppinsText>
                    <PoppinsText varient='subtext'>Everyone who has logged in and filled out their profile.</PoppinsText>
                </Column>
                <AppButton variant='black' className='w-36' onPress={() => setIsProfileDialogOpen(true)}>
                    <PoppinsText weight='medium' color='white'>Edit profile</PoppinsText>
                </AppButton>
            </Row>
            <Column gap={3}>
                {sortedProfiles.length > 0 ? sortedProfiles.map((profile) => (
                    <Row key={profile.userId || profile.email} className='items-start gap-4 rounded-xl border border-subtle-border bg-white p-4'>
                        {profile.profileImageUrl ? (
                            <Image source={{ uri: profile.profileImageUrl }} className='w-20 h-20 rounded-xl border border-subtle-border bg-white' />
                        ) : (
                            <View className='w-20 h-20 rounded-xl border border-subtle-border bg-white items-center justify-center'>
                                <PoppinsText weight='medium'>{profile.inGameName.slice(0, 1).toUpperCase()}</PoppinsText>
                            </View>
                        )}
                        <Column className='flex-1' gap={2}>
                            <PoppinsText weight='medium'>{profile.inGameName}</PoppinsText>
                            {profile.bioMarkdown.trim().length > 0 ? (
                                <MarkdownRenderer markdown={profile.bioMarkdown} />
                            ) : (
                                <PoppinsText varient='subtext'>No bio yet.</PoppinsText>
                            )}
                            <Column gap={0}>
                                {profile.phoneNumber.trim().length > 0 && <PoppinsText varient='subtext'>Phone: {profile.phoneNumber}</PoppinsText>}
                                {profile.instagram.trim().length > 0 && <PoppinsText varient='subtext'>Instagram: {profile.instagram}</PoppinsText>}
                                {profile.discord.trim().length > 0 && <PoppinsText varient='subtext'>Discord: {profile.discord}</PoppinsText>}
                                {profile.otherContact.trim().length > 0 && <PoppinsText varient='subtext'>{profile.otherContact}</PoppinsText>}
                            </Column>
                        </Column>
                    </Row>
                )) : (
                    <Column className='rounded-xl border border-subtle-border bg-white p-4'>
                        <PoppinsText varient='subtext'>No one has filled out their profile yet.</PoppinsText>
                    </Column>
                )}
            </Column>
            <PlayerProfileDialog
                initialValue={{
                    ...myProfile.value,
                    gameId,
                    email: currentEmail,
                    userId: currentUserId,
                }}
                isOpen={isProfileDialogOpen}
                onOpenChange={setIsProfileDialogOpen}
                onSave={setMyProfile}
                title='Edit your profile'
            />
        </Column>
    );
};

export default PhoneBookPagePLAYER;
