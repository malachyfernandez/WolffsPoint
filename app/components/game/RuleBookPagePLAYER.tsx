import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
import LoadingText from '../ui/loading/LoadingText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { getGameScopedKey } from '../../../utils/multiplayer';
import RuleBookRoleDescriptionsPLAYER from './RuleBookRoleDescriptionsPLAYER';
import { RuleBookData } from '../../../types/ruleBook';

interface RuleBookPagePLAYERProps {
    gameId: string;
}

const RuleBookPagePLAYER = ({ gameId }: RuleBookPagePLAYERProps) => {
    const gameRows = useUserListGet({
        key: 'games',
        itemId: gameId,
        returnTop: 1,
    });

    const operatorUserId = gameRows?.[0]?.userToken;

    const ruleBookRecords = useUserVariableGet<RuleBookData>({
        key: getGameScopedKey('ruleBook', gameId),
        userIds: operatorUserId ? [operatorUserId] : [],
        returnTop: 1,
    });

    const isLoading = gameRows === undefined || ruleBookRecords === undefined;

    if (isLoading) {
        return (
            <Column className='flex-1 min-h-[760px] items-center justify-center'>
                <LoadingText text='Loading rule book' />
            </Column>
        );
    }

    const ruleBookMarkdown = ruleBookRecords?.[0]?.value?.content ?? '';

    return (
        <Animated.View entering={FadeIn.duration(300)} className='flex-1 min-h-[760px]'>
            <Column className='flex-1' gap={4}>
                <Column gap={2}>
                    <PoppinsText weight='bold' className='text-xl'>Rule Book</PoppinsText>
                    {ruleBookMarkdown.trim().length > 0 ? (
                        <MarkdownRenderer markdown={ruleBookMarkdown} />
                    ) : (
                        <PoppinsText varient='subtext'>The operator has not written the rule book yet.</PoppinsText>
                    )}
                </Column>
                
                <RuleBookRoleDescriptionsPLAYER gameId={gameId} />
            </Column>
        </Animated.View>
    );
};

export default RuleBookPagePLAYER;
