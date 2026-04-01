import React, { useState } from 'react';
import { Tabs } from 'heroui-native';
import Column from '../layout/Column';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsTextInput from '../ui/forms/PoppinsTextInput';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import { useUserVariable } from '../../../hooks/useUserVariable';
import { getGameScopedKey } from '../../../utils/multiplayer';

interface RuleBookPageOPERATORProps {
    gameId: string;
}

const RuleBookPageOPERATOR = ({ gameId }: RuleBookPageOPERATORProps) => {
    const [activeTab, setActiveTab] = useState('writing');
    const [ruleBookMarkdown, setRuleBookMarkdown] = useUserVariable<string>({
        key: getGameScopedKey('ruleBook', gameId),
        defaultValue: '',
        privacy: 'PUBLIC',
    });

    return (
        <Column gap={4}>
            <Tabs value={activeTab} onValueChange={setActiveTab} variant='secondary'>
                <Tabs.List>
                    <Tabs.Indicator />
                    <Tabs.Trigger value='writing'>
                        {({ isSelected }) => (
                            <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                Writing
                            </Tabs.Label>
                        )}
                    </Tabs.Trigger>
                    <Tabs.Trigger value='viewing'>
                        {({ isSelected }) => (
                            <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                Viewing
                            </Tabs.Label>
                        )}
                    </Tabs.Trigger>
                </Tabs.List>
            </Tabs>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <Tabs.Content value='writing'>
                    <Column gap={2}>
                        <PoppinsText weight='medium'>Rule book markdown</PoppinsText>
                        <PoppinsTextInput
                            className='w-full min-h-[420px] border border-subtle-border p-3'
                            value={ruleBookMarkdown.value}
                            onChangeText={setRuleBookMarkdown}
                            multiline={true}
                            autoGrow={true}
                            placeholder='Write the full rule book here.'
                        />
                    </Column>
                </Tabs.Content>
                <Tabs.Content value='viewing'>
                    <Column className='rounded-xl border border-subtle-border bg-white p-4 min-h-[420px]'>
                        {ruleBookMarkdown.value.trim().length > 0 ? (
                            <MarkdownRenderer markdown={ruleBookMarkdown.value} />
                        ) : (
                            <PoppinsText varient='subtext'>No rule book written yet.</PoppinsText>
                        )}
                    </Column>
                </Tabs.Content>
            </Tabs>
        </Column>
    );
};

export default RuleBookPageOPERATOR;
