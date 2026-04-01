import React from 'react';
import Column from './Column';
import Row from './Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import { UserIcon } from '../ui/icons/UserIcon';
import { TouchableOpacity } from 'react-native';
import UserProfileDialog from '../dialog/UserProfileDialog';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { GameInfo } from '../../../types/games';

interface TopSiteBarProps {
    className?: string;
}

const TopSiteBar = ({ className = '' }: TopSiteBarProps) => {
    const [activeGameId, setActiveGameId] = useUserVariable<string>({
        key: 'activeGameId',
        defaultValue: '',
    });

    const gameJoinCodeInfo = useUserListGet<GameInfo>({
        key: "games",
        filterFor: activeGameId.value || undefined,
        returnTop: 1,
    });

    const gameJoinCode = gameJoinCodeInfo?.[0]?.value?.id;
    const isInAGame = activeGameId.value !== '';

    return (
        <Column className={className}>
            <Row className='justify-between items-center h-24 px-4'>
                <TouchableOpacity onPress={() => { setActiveGameId(''); }}>
                    <PoppinsText weight='bold' className='text-lg'>{isInAGame ? "< WolffsPoint" : "WolffsPoint"}</PoppinsText>
                </TouchableOpacity>
                <Row className='items-center'>
                    {gameJoinCode && (
                        <PoppinsText varient='cardHeader'>Join Code: {gameJoinCode}</PoppinsText>
                    )}
                    <UserProfileDialog>
                        <AppButton variant="outline" className="h-14 w-14">
                            <UserIcon size={24} />
                        </AppButton>
                    </UserProfileDialog>
                </Row>
            </Row>
        </Column>
    );
};

export default TopSiteBar;
