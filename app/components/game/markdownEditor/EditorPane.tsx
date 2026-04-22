import React from 'react';
import ShadowScrollView from '../../ui/ShadowScrollView';
import Column from '../../layout/Column';
import TownSquareComposerToolbar from '../townSquare/TownSquareComposerToolbar';
import TownSquareComposerEditorPane from '../townSquare/TownSquareComposerEditorPane';
import { SelectionRange } from '../townSquare/townSquareUtils';

interface EditorPaneProps {
    value: string;
    onBodyChange: (body: string) => void;
    onSelectionChange: (selection: SelectionRange) => void;
    showInputs: boolean;
    onBold: () => void;
    onItalic: () => void;
    onLink: () => void;
    onImage: () => void;
    onInput: () => void;
    onMore: () => void;
}

export function EditorPane({
    value,
    onBodyChange,
    onSelectionChange,
    showInputs,
    onBold,
    onItalic,
    onLink,
    onImage,
    onInput,
    onMore,
}: EditorPaneProps) {
    return (
        <Column className='gap-1 flex-1 min-w-0'>
            <TownSquareComposerToolbar
                onBold={onBold}
                onInput={onInput}
                onImage={onImage}
                onItalic={onItalic}
                onLink={onLink}
                onMore={onMore}
                showInputs={showInputs}
            />
            <ShadowScrollView className='flex-1' scrollViewClassName='flex-1 rounded-[24px] py-4'>
                    <TownSquareComposerEditorPane
                        onBodyChange={onBodyChange}
                        onSelectionChange={onSelectionChange}
                        value={value}
                    />
            </ShadowScrollView>
        </Column>
    );
}
