import React from 'react';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
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

    const ruleBookMarkdown = ruleBookRecords?.[0]?.value?.content ?? '';

    return (
        <Column gap={4}>
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
    );
};

export default RuleBookPagePLAYER;
