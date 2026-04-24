import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import Column from '../layout/Column';
import FontText from '../ui/text/FontText';
import LoadingText from '../ui/loading/LoadingText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useFindListItems, useFindValues } from '../../../hooks/useData';
import { getGameScopedKey } from '../../../utils/multiplayer';
import RuleBookRoleDescriptionsPLAYER from './RuleBookRoleDescriptionsPLAYER';
import { RuleBookData } from '../../../types/ruleBook';

interface RuleBookPagePLAYERProps {
    gameId: string;
}

const RuleBookPagePLAYER = ({ gameId }: RuleBookPagePLAYERProps) => {
    const gameRows = useFindListItems('games', {
        itemId: gameId,
        returnTop: 1,
    });

    const operatorUserId = gameRows?.[0]?.userToken;

    const ruleBookRecords = useFindValues<RuleBookData>(getGameScopedKey('ruleBook', gameId), {
        userIds: operatorUserId ? [operatorUserId] : [],
        returnTop: 1,
    });

    const isLoading = gameRows === undefined || ruleBookRecords === undefined;

    if (isLoading) {
        return (
            <Column className='gap-4 flex-1 min-h-[760px] items-center justify-center'>
                <LoadingText text='Loading rule book' />
            </Column>
        );
    }

    const ruleBookMarkdown = ruleBookRecords?.[0]?.value?.content ?? '';

    return (
        <Animated.View entering={FadeIn.duration(300)} className='flex-1 min-h-[760px]'>
            <Column className='gap-4 flex-1  py-3 sm:px-4'>
                <Column className='gap-2'>
                    <FontText weight='bold' className='text-xl'>Rule Book</FontText>
                    {ruleBookMarkdown.trim().length > 0 ? (
                        <MarkdownRenderer markdown={ruleBookMarkdown} />
                    ) : (
                        <FontText variant='subtext'>The operator has not written the rule book yet.</FontText>
                    )}
                </Column>
                
                <RuleBookRoleDescriptionsPLAYER gameId={gameId} />
            </Column>
        </Animated.View>
    );
};

export default RuleBookPagePLAYER;
