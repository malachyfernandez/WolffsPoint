import React, { useState } from 'react';
import { Pressable } from 'react-native';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { getGameScopedKey } from '../../../utils/multiplayer';
import TableMarkdownDialog from './TableMarkdownDialog';
import RuleBookRoleDescriptions from './RuleBookRoleDescriptions';
import { RuleBookData } from '../../../types/ruleBook';

interface RuleBookPageOPERATORProps {
    gameId: string;
}

const RuleBookPageOPERATOR = ({ gameId }: RuleBookPageOPERATORProps) => {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [ruleBookData, setRuleBookData] = useUserVariable<RuleBookData>({
        key: getGameScopedKey('ruleBook', gameId),
        defaultValue: { content: '', roleOrder: [] },
        privacy: 'PUBLIC',
    });

    return (
        <Column gap={4}>
            <Column gap={2}>
                <PoppinsText weight='bold' className='text-xl'>Rule Book</PoppinsText>
                <Pressable 
                    onPress={() => setIsEditDialogOpen(true)}
                    className='flex-1 min-h-[220px] rounded-xl bg-text/10 p-4 hover:bg-text/5'
                >
                    {ruleBookData?.value?.content?.trim()?.length > 0 ? (
                        <MarkdownRenderer markdown={ruleBookData.value.content} />
                    ) : (
                        <PoppinsText varient='subtext'>No rule book written yet. Tap to edit.</PoppinsText>
                    )}
                </Pressable>
            </Column>
            
            <RuleBookRoleDescriptions gameId={gameId} />
            
            <TableMarkdownDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                title="Rule Book"
                submitLabel="Save Rule Book"
                initialMarkdown={ruleBookData?.value?.content || ''}
                onSubmit={(markdown) => setRuleBookData({
                    ...(ruleBookData?.value || { content: '', roleOrder: [] }),
                    content: markdown
                })}
            />
        </Column>
    );
};

export default RuleBookPageOPERATOR;
