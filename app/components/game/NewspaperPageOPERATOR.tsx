import React, { useState } from 'react';
import Column from '../layout/Column';
import { Tabs } from 'heroui-native';
import NewspaperWritingView from './NewspaperWritingView';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperPageHeader from './newspaperPageOperator/NewspaperPageHeader';

interface NewspaperPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const NewspaperPageOPERATOR = ({ gameId }: NewspaperPageOPERATORProps) => {
    const [activeTab, setActiveTab] = useState('writing');

    return (
        <Column gap={4}>
            <Tabs value={activeTab} onValueChange={setActiveTab} variant="primary" className="flex-1">
                <Tabs.List>
                    <Tabs.Indicator />
                    <Tabs.Trigger value="writing">
                        <Tabs.Label>Writing</Tabs.Label>
                    </Tabs.Trigger>
                    <Tabs.Trigger value="viewing">
                        <Tabs.Label>Viewing</Tabs.Label>
                    </Tabs.Trigger>
                </Tabs.List>

                <Column className='w-[950px]'>
                    <Tabs.Content value="writing" className='flex-1'>
                        <Column gap={4}>

                            <NewspaperWritingView gameId={gameId} />
                        </Column>
                    </Tabs.Content>

                    <Tabs.Content value="viewing" className='flex-1'>
                        <NewspaperViewingView gameId={gameId} />
                    </Tabs.Content>
                </Column>
            </Tabs>
        </Column>
    );
};

export default NewspaperPageOPERATOR;
