import React from 'react';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserVariableGet } from '../../../hooks/useUserVariableGet';
import { getGameScopedKey } from '../../../utils/multiplayer';

interface RuleBookPagePLAYERProps {
    gameId: string;
}

const RuleBookPagePLAYER = ({ gameId }: RuleBookPagePLAYERProps) => {
    const ruleBookRecords = useUserVariableGet<string>({
        key: getGameScopedKey('ruleBook', gameId),
        returnTop: 1,
    });

    const ruleBookMarkdown = ruleBookRecords?.[0]?.value ?? '';

    return (
        <Column className='rounded-xl border border-subtle-border bg-white p-4 min-h-[420px]'>
            {ruleBookMarkdown.trim().length > 0 ? (
                <MarkdownRenderer markdown={ruleBookMarkdown} />
            ) : (
                <PoppinsText varient='subtext'>The operator has not written the rule book yet.</PoppinsText>
            )}
        </Column>
    );
};

export default RuleBookPagePLAYER;
