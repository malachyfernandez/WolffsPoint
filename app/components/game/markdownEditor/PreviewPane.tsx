import React from 'react';
import ShadowScrollView from '../../ui/ShadowScrollView';
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
        <ShadowScrollView className={className || 'flex-1'} scrollViewClassName='flex-1 rounded-[24px] py-4'>
                <TownSquareComposerPreviewPane
                    includeTitle={includeTitle}
                    markdown={markdown}
                    markdownInputState={inputState}
                    setMarkdownInputState={setInputState}
                    title={title}
                />
        </ShadowScrollView>
    );
}
