import React from 'react';
import { ScrollView } from 'react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import TownSquareComposerPreviewPane from '../townSquare/TownSquareComposerPreviewPane';

interface PreviewPaneProps {
    markdown: string;
    title: string;
    includeTitle: boolean;
    inputState: Record<string, string | undefined>;
    setInputState: React.Dispatch<React.SetStateAction<Record<string, string | undefined>>>;
    className?: string;
}

export function PreviewPane({
    markdown,
    title,
    includeTitle,
    inputState,
    setInputState,
    className,
}: PreviewPaneProps) {
    return (
        <ScrollShadow LinearGradientComponent={LinearGradient} className={className || 'flex-1'}>
            <ScrollView className='flex-1 rounded-[24px] py-4'>
                <TownSquareComposerPreviewPane
                    includeTitle={includeTitle}
                    markdown={markdown}
                    markdownInputState={inputState}
                    setMarkdownInputState={setInputState}
                    title={title}
                />
            </ScrollView>
        </ScrollShadow>
    );
}
