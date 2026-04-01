import React, { useState } from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tabs } from 'heroui-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import NewspaperWritingView from './NewspaperWritingView';
import NewspaperViewingView from './NewspaperViewingView';
import NewspaperPageHeader from './newspaperPageOperator/NewspaperPageHeader';
import NewspaperViewingHeader from './NewspaperViewingHeader';

interface NewspaperPageOPERATORProps {
    currentUserId: string;
    gameId: string;
}

const NewspaperPageOPERATOR = ({ gameId }: NewspaperPageOPERATORProps) => {
    const [activeTab, setActiveTab] = useState('writing');

    const addColumn = () => {
        // This function will be handled by the NewspaperWritingView component
        // which has its own state management for columns
    };

    return (
        <Column gap={4}>
            {/* Header with BlurView and Tabs */}
            <View className='relative'>
                <BlurView 
                    intensity={20} 
                    tint='light'
                    className='absolute top-0 left-0 right-0 h-full'
                />
                <View className='relative'>
                    <Column className='p-4'>
                        <Tabs value={activeTab} onValueChange={setActiveTab} variant="secondary" className="flex-1">
                            <Tabs.List>
                                <Tabs.Indicator />
                                <Tabs.Trigger value="writing">
                                    {({ isSelected }) => (
                                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                            Writing
                                        </Tabs.Label>
                                    )}
                                </Tabs.Trigger>
                                <Tabs.Trigger value="viewing">
                                    {({ isSelected }) => (
                                        <Tabs.Label className={isSelected ? 'text-black font-medium' : 'text-gray-500'}>
                                            Viewing
                                        </Tabs.Label>
                                    )}
                                </Tabs.Trigger>
                            </Tabs.List>
                        </Tabs>
                    </Column>
                </View>
            </View>

            {/* Content Area */}
            <Column className='w-[950px]'>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <Tabs.Content value="writing" className='flex-1'>
                        <Column gap={4}>
                            <NewspaperWritingView gameId={gameId} />
                        </Column>
                    </Tabs.Content>

                    <Tabs.Content value="viewing" className='flex-1'>
                        <Column gap={4}>
                            <NewspaperViewingHeader />
                            <NewspaperViewingView gameId={gameId} />
                        </Column>
                    </Tabs.Content>
                </Tabs>
            </Column>
        </Column>
    );
};

export default NewspaperPageOPERATOR;
