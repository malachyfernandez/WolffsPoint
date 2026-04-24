import React from 'react';
import TownSquareComposerPreviewPane from '../townSquare/TownSquareComposerPreviewPane';

interface PreviewPaneSideBySideProps {
    markdown: string;
    title: string;
    includeTitle: boolean;
    inputState: Record<string, string | undefined>;
    setInputState: React.Dispatch<React.SetStateAction<Record<string, string | undefined>>>;
}

export function PreviewPaneSideBySide({
    markdown,
    title,
    includeTitle,
    inputState,
    setInputState,
}: PreviewPaneSideBySideProps) {
    return (
        <TownSquareComposerPreviewPane
            includeTitle={includeTitle}
            markdown={markdown}
            markdownInputState={inputState}
            setMarkdownInputState={setInputState}
            title={title}
        />
    );
}
export default PreviewPaneSideBySide;
