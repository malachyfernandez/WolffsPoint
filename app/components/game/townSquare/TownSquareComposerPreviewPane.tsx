import React from 'react';
import ShadowScrollView from '../../ui/ShadowScrollView';
import Column from '../../layout/Column';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import FontText from '../../ui/text/FontText';

interface TownSquareComposerPreviewPaneProps {
    includeTitle: boolean;
    markdown: string;
    markdownInputState?: Record<string, string | undefined>;
    setMarkdownInputState?: (nextState: Record<string, string | undefined>) => void;
    title: string;
}

const TownSquareComposerPreviewPane = ({ includeTitle, markdown, markdownInputState, setMarkdownInputState, title }: TownSquareComposerPreviewPaneProps) => {
    return (
        <Column className='gap-2 flex-1 min-w-0'>
            {/* <FontText weight='medium'>Preview</FontText> */}
            <ShadowScrollView className='h-[52vh] flex-1' scrollViewClassName='h-[52vh] flex-1 rounded-[24px] border border-subtle-border px-4 py-4'>
                    <Column className='gap-3'>
                        {includeTitle && title.trim() ? (
                            <FontText weight='bold' className='text-2xl leading-8'>
                                {title.trim()}
                            </FontText>
                        ) : null}

                        {markdown.trim() ? (
                            <MarkdownRenderer markdown={markdown.trim()} state={markdownInputState} setState={setMarkdownInputState} isInDialog={true} />
                        ) : (
                            <Column className='gap-1 py-12'>
                                <FontText weight='medium'>Nothing to preview yet</FontText>
                                <FontText variant='subtext'>Start typing in the Editing tab.</FontText>
                            </Column>
                        )}
                    </Column>
            </ShadowScrollView>
        </Column>
    );
};

export default TownSquareComposerPreviewPane;
