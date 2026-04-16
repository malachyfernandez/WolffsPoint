import React from 'react';
import Column from '../../layout/Column';
import { TitleInputSection } from './TitleInputSection';
import { TabSelector } from './TabSelector';
import { SideBySideLayout } from './SideBySideLayout';
import { TabbedLayout } from './TabbedLayout';
import { SelectionRange } from '../townSquare/townSquareUtils';

interface MainContentProps {
    includeTitle: boolean;
    titleInputLabel: string;
    titleInputPlaceholder: string;
    draftTitle: string;
    draftBody: string;
    isPreviewSideBySide: boolean;
    activeTab: string;
    showInputs: boolean;
    previewInputState: Record<string, string | undefined>;
    setPreviewInputState: React.Dispatch<React.SetStateAction<Record<string, string | undefined>>>;
    setDraftTitle: (title: string) => void;
    setDraftBody: (body: string) => void;
    setSelection: (selection: SelectionRange) => void;
    onTabChange: (tab: string) => void;
    onBold: () => void;
    onItalic: () => void;
    onLink: () => void;
    onImage: () => void;
    onInput: () => void;
    onMore: () => void;
}

export function MainContent({
    includeTitle,
    titleInputLabel,
    titleInputPlaceholder,
    draftTitle,
    draftBody,
    isPreviewSideBySide,
    activeTab,
    showInputs,
    previewInputState,
    setPreviewInputState,
    setDraftTitle,
    setDraftBody,
    setSelection,
    onTabChange,
    onBold,
    onItalic,
    onLink,
    onImage,
    onInput,
    onMore,
}: MainContentProps) {
    return (
        <Column className='flex-1 pt-5 max-h-[600px] h-[70vh]' gap={4}>
            {includeTitle ? (
                <TitleInputSection
                    label={titleInputLabel}
                    placeholder={titleInputPlaceholder}
                    value={draftTitle}
                    onChangeText={setDraftTitle}
                />
            ) : null}

            {!isPreviewSideBySide ? (
                <TabSelector value={activeTab} onValueChange={onTabChange} />
            ) : null}

            {isPreviewSideBySide ? (
                <SideBySideLayout
                    draftBody={draftBody}
                    draftTitle={draftTitle}
                    includeTitle={includeTitle}
                    showInputs={showInputs}
                    previewInputState={previewInputState}
                    setPreviewInputState={setPreviewInputState}
                    onBodyChange={setDraftBody}
                    onSelectionChange={setSelection}
                    onBold={onBold}
                    onItalic={onItalic}
                    onLink={onLink}
                    onImage={onImage}
                    onInput={onInput}
                    onMore={onMore}
                />
            ) : (
                <TabbedLayout
                    draftBody={draftBody}
                    draftTitle={draftTitle}
                    includeTitle={includeTitle}
                    showInputs={showInputs}
                    activeTab={activeTab}
                    previewInputState={previewInputState}
                    setPreviewInputState={setPreviewInputState}
                    onBodyChange={setDraftBody}
                    onSelectionChange={setSelection}
                    onTabChange={onTabChange}
                    onBold={onBold}
                    onItalic={onItalic}
                    onLink={onLink}
                    onImage={onImage}
                    onInput={onInput}
                    onMore={onMore}
                />
            )}
        </Column>
    );
}
