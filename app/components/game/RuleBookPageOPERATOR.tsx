import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { getGameScopedKey } from '../../../utils/multiplayer';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import RuleBookRoleDescriptions from './RuleBookRoleDescriptions';
import { RuleBookData } from '../../../types/ruleBook';

interface RuleBookPageOPERATORProps {
    gameId: string;
    onBack: () => void;
}

/**
 * Rule book editor page for operators.
 * Provides editing capabilities for the rule book content and role descriptions.
 */
const RuleBookPageOPERATOR = ({ gameId, onBack }: RuleBookPageOPERATORProps) => {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [ruleBookData, setRuleBookData] = useUserVariable<RuleBookData>({
        key: getGameScopedKey('ruleBook', gameId),
        defaultValue: { content: '', roleOrder: [] },
        privacy: 'PUBLIC',
    });

    return (
        <Column className='gap-6 pb-6'>
            <Pressable onPress={onBack} className='self-start py-1'>
                <Row className='gap-4 items-center'>
                    <ChevronLeft size={20} color='rgb(46, 41, 37)' />
                    <FontText weight='medium'>Config</FontText>
                </Row>
            </Pressable>

            <Column className='gap-5 border-y border-border/15 py-5'>
                <Column className='gap-2'>
                    <FontText weight='bold' className='text-xl'>Rule Book</FontText>
                    <Pressable 
                    onPress={() => setIsEditDialogOpen(true)}
                        className='flex-1 min-h-[220px] rounded-3xl bg-text/5 p-4'
                    >
                        {ruleBookData?.value?.content?.trim()?.length > 0 ? (
                            <MarkdownRenderer markdown={ruleBookData.value.content} />
                        ) : (
                            <Column className='gap-4 min-h-[180px] items-center justify-center'>
                                <FontText variant='subtext'>No rule book written yet. Tap to edit.</FontText>
                            </Column>
                        )}
                    </Pressable>
                </Column>

                <RuleBookRoleDescriptions gameId={gameId} />
            </Column>

            <MarkdownEditorDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                title="Rule Book"
                submitLabel="Save Rule Book"
                initialMarkdown={ruleBookData?.value?.content || ''}
                onSubmit={({ markdown }) => setRuleBookData({
                    ...(ruleBookData?.value || { content: '', roleOrder: [] }),
                    content: markdown
                })}
            />
        </Column>
    );
};


export default RuleBookPageOPERATOR;
