import React from 'react';
import Column from './Column';
import Row from './Row';
import AppButton from '../ui/buttons/AppButton';
import PoppinsText from '../ui/text/PoppinsText';
import { UserIcon } from '../ui/icons/UserIcon';
import { TouchableOpacity } from 'react-native';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { GameInfo } from '../../../types/games';
import CopyableText from '../ui/CopyableText';

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
            <Row className='justify-end items-center h-24 px-4'>
                {/* <TouchableOpacity onPress={() => { setActiveGameId(''); }}>
                    <PoppinsText weight='bold' className='text-lg'>{isInAGame ? "< WolffsPoint" : "WolffsPoint"}</PoppinsText>
                </TouchableOpacity> */}

                {/* spacer */}
                <></>
                <Row className='items-center'>
                    {gameJoinCode && (
                        <CopyableText text={gameJoinCode} color='text-inverted' />
                    )}

                    {isInAGame && (
                        <AppButton variant="outline-accent" className="h-14 w-14" onPress={() => { setActiveGameId(''); }}>
                            <UserIcon size={24} color='accent' />
                        </AppButton>
                    )}

                </Row>
            </Row>
        </Column>
    );
};

export default TopSiteBar;
