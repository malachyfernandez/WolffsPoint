import React from 'react';
import { ScrollView } from 'react-native';
import { Tabs, ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import Column from '../../layout/Column';
import TownSquareComposerToolbar from '../townSquare/TownSquareComposerToolbar';
import TownSquareComposerEditorPane from '../townSquare/TownSquareComposerEditorPane';
import TownSquareComposerPreviewPane from '../townSquare/TownSquareComposerPreviewPane';
import { SelectionRange } from '../townSquare/townSquareUtils';

interface TabbedLayoutProps {
    draftBody: string;
    draftTitle: string;
    includeTitle: boolean;
    showInputs: boolean;
    activeTab: string;
    previewInputState: Record<string, string | undefined>;
    setPreviewInputState: React.Dispatch<React.SetStateAction<Record<string, string | undefined>>>;
    onBodyChange: (body: string) => void;
    onSelectionChange: (selection: SelectionRange) => void;
    onTabChange: (tab: string) => void;
    onBold: () => void;
    onItalic: () => void;
    onLink: () => void;
    onImage: () => void;
    onInput: () => void;
    onMore: () => void;
}

export function TabbedLayout({
    draftBody,
    draftTitle,
    includeTitle,
    showInputs,
    activeTab,
    previewInputState,
    setPreviewInputState,
    onBodyChange,
    onSelectionChange,
    onTabChange,
    onBold,
    onItalic,
    onLink,
    onImage,
    onInput,
    onMore,
}: TabbedLayoutProps) {
    return (
        <Tabs value={activeTab} onValueChange={onTabChange} className='flex-1'>
            <Tabs.Content value='editing' className='flex-1'>
                <Column gap={1}>
                    <TownSquareComposerToolbar
                        onBold={onBold}
                        onInput={onInput}
                        onImage={onImage}
                        onItalic={onItalic}
                        onLink={onLink}
                        onMore={onMore}
                        showInputs={showInputs}
                    />
                </Column>
                <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                    <ScrollView className='flex-1 rounded-[24px] py-4'>
                        <TownSquareComposerEditorPane
                            onBodyChange={onBodyChange}
                            onSelectionChange={onSelectionChange}
                            value={draftBody}
                        />
                    </ScrollView>
                </ScrollShadow>
            </Tabs.Content>

            <Tabs.Content value='preview' className='flex-1'>
                <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                    <ScrollView className='h-[40vh] max-h-[40vh] rounded-[24px] py-4'>
                        <TownSquareComposerPreviewPane
                            includeTitle={includeTitle}
                            markdown={draftBody}
                            markdownInputState={previewInputState}
                            setMarkdownInputState={setPreviewInputState}
                            title={draftTitle}
                        />
                    </ScrollView>
                </ScrollShadow>
            </Tabs.Content>
        </Tabs>
    );
}
