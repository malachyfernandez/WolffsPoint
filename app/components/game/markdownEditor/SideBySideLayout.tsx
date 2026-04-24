import React from 'react';
import Row from '../../layout/Row';
import Column from '../../layout/Column';
import { EditorPane } from './EditorPane';
import { PreviewPaneSideBySide } from './PreviewPaneSideBySide';
import { SelectionRange } from '../townSquare/townSquareUtils';

interface SideBySideLayoutProps {
    draftBody: string;
    draftTitle: string;
    includeTitle: boolean;
    showInputs: boolean;
    previewInputState: Record<string, string | undefined>;
    setPreviewInputState: React.Dispatch<React.SetStateAction<Record<string, string | undefined>>>;
    onBodyChange: (body: string) => void;
    onSelectionChange: (selection: SelectionRange) => void;
    onBold: () => void;
    onItalic: () => void;
    onLink: () => void;
    onImage: () => void;
    onInput: () => void;
    onMore: () => void;
}

export function SideBySideLayout({
    draftBody,
    draftTitle,
    includeTitle,
    showInputs,
    previewInputState,
    setPreviewInputState,
    onBodyChange,
    onSelectionChange,
    onBold,
    onItalic,
    onLink,
    onImage,
    onInput,
    onMore,
}: SideBySideLayoutProps) {
    return (
        <Row className='gap-4 flex-1 min-h-0'>
            <EditorPane
                value={draftBody}
                onBodyChange={onBodyChange}
                onSelectionChange={onSelectionChange}
                showInputs={showInputs}
                onBold={onBold}
                onItalic={onItalic}
                onLink={onLink}
                onImage={onImage}
                onInput={onInput}
                onMore={onMore}
            />

            <Column className='gap-4 flex-1 min-w-0'>
                <PreviewPaneSideBySide
                    markdown={draftBody}
                    title={draftTitle}
                    includeTitle={includeTitle}
                    inputState={previewInputState}
                    setInputState={setPreviewInputState}
                />
            </Column>
        </Row>
    );
}
export default SideBySideLayout;
