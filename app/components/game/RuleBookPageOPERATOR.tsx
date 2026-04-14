import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
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
        <Column className='pb-6' gap={6}>
            <Pressable onPress={onBack} className='self-start py-1'>
                <Row className='items-center gap-2'>
                    <ChevronLeft size={20} color='rgb(46, 41, 37)' />
                    <PoppinsText weight='medium'>Config</PoppinsText>
                </Row>
            </Pressable>

            <Column className='border-y border-border/15 py-5' gap={5}>
                <Column gap={2}>
                    <PoppinsText weight='bold' className='text-xl'>Rule Book</PoppinsText>
                    <Pressable 
                    onPress={() => setIsEditDialogOpen(true)}
                        className='flex-1 min-h-[220px] rounded-3xl bg-text/5 p-4'
                    >
                        {ruleBookData?.value?.content?.trim()?.length > 0 ? (
                            <MarkdownRenderer markdown={ruleBookData.value.content} />
                        ) : (
                            <Column className='min-h-[180px] items-center justify-center'>
                                <PoppinsText varient='subtext'>No rule book written yet. Tap to edit.</PoppinsText>
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
