import React, { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { useUserList } from '../../../hooks/useUserList';
import { getGameScopedKey } from '../../../utils/multiplayer';
import TableMarkdownDialog from './TableMarkdownDialog';
import { RoleTableItem } from '../../../types/roleTable';

interface RuleBookPageOPERATORProps {
    gameId: string;
}

const RuleBookPageOPERATOR = ({ gameId }: RuleBookPageOPERATORProps) => {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [ruleBookMarkdown, setRuleBookMarkdown] = useUserVariable<string>({
        key: getGameScopedKey('ruleBook', gameId),
        defaultValue: '',
        privacy: 'PUBLIC',
    });

    const [roleTable] = useUserList<RoleTableItem[]>({
        key: "roleTable",
        itemId: gameId,
        privacy: "PUBLIC",
    });

    const roles = roleTable?.value ?? [];
    const visibleRoles = roles.filter(role => role.isVisible !== false && role.aboutRole && role.aboutRole.trim().length > 0);

    return (
        <Column gap={4}>
            <Column gap={2}>
                <PoppinsText weight='bold' className='text-xl'>Rule Book</PoppinsText>
                <Pressable 
                    onPress={() => setIsEditDialogOpen(true)}
                    className='flex-1'
                >
                    {ruleBookMarkdown.value.trim().length > 0 ? (
                        <MarkdownRenderer markdown={ruleBookMarkdown.value} />
                    ) : (
                        <PoppinsText varient='subtext'>No rule book written yet. Tap to edit.</PoppinsText>
                    )}
                </Pressable>
            </Column>
            
            {visibleRoles.length > 0 && (
                <Column gap={2}>
                    <PoppinsText weight='bold' className='text-xl'>Role Descriptions</PoppinsText>
                    <ScrollView className='max-h-[400px]'>
                        <Column gap={4}>
                            {visibleRoles.map((role, index) => (
                                <Column key={index} className='gap-2'>
                                    <PoppinsText weight='bold' className='text-lg'>
                                        {role.role}
                                    </PoppinsText>
                                    <MarkdownRenderer markdown={role.aboutRole} />
                                </Column>
                            ))}
                        </Column>
                    </ScrollView>
                </Column>
            )}
            
            <TableMarkdownDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                title="Rule Book"
                submitLabel="Save Rule Book"
                initialMarkdown={ruleBookMarkdown.value}
                onSubmit={(markdown) => setRuleBookMarkdown(markdown)}
            />
        </Column>
    );
};

export default RuleBookPageOPERATOR;
