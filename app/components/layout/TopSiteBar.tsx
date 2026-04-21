import React from 'react';
import Column from './Column';
import Row from './Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import { HomeIcon } from '../ui/icons/HomeIcon';
import { TouchableOpacity } from 'react-native';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { GameInfo } from '../../../types/games';
import CopyableText from '../ui/CopyableText';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

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
        <Column className={`gap-4 ${className ?? ''}`.trim()}>
            <Row className='gap-4 justify-end items-center h-24 w-fit px-4 top-0 right-0'>
                {/* <TouchableOpacity onPress={() => { setActiveGameId(''); }}>
                    <FontText weight='bold' className='text-lg'>{isInAGame ? "< WolffsPoint" : "WolffsPoint"}</FontText>
                </TouchableOpacity> */}

                {/* spacer */}
                <></>
                {isInAGame && (
                    <Animated.View entering={FadeIn}>
                        <Row className='gap-4 items-center'>

                            {gameJoinCode && (
                                <>
                                    <BlurView intensity={20} className='rounded'>
                                        <CopyableText.Container className='bg-outer-background/20 p-2 rounded'>
                                            <FontText variant='lowercaseCardHeader' className='opacity-100 text-text-inverted'>Code:</FontText>
                                            <CopyableText text={gameJoinCode} className='opacity-100' color='text-inverted' />
                                        </CopyableText.Container>
                                    </BlurView>
                                   
                                </>
                            )}




                            <AppButton variant="outline-accent-light" blurred={true} className="h-14 w-14" onPress={() => { setActiveGameId(''); }}>
                                <HomeIcon size={24} color='accent-light' />
                            </AppButton>


                        </Row>
                    </Animated.View>
                )}
            </Row>
        </Column>
    );
};

export default TopSiteBar;
