import React from 'react';
import { ScrollView } from 'react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import Column from '../../layout/Column';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import PoppinsText from '../../ui/text/PoppinsText';

interface TownSquareComposerPreviewPaneProps {
    includeTitle: boolean;
    markdown: string;
    title: string;
}

const TownSquareComposerPreviewPane = ({ includeTitle, markdown, title }: TownSquareComposerPreviewPaneProps) => {
    return (
        <Column className='flex-1 min-w-0' gap={2}>
            <PoppinsText weight='medium'>Preview</PoppinsText>
            <ScrollShadow LinearGradientComponent={LinearGradient} className='h-[52vh] flex-1'>
                <ScrollView className='h-[52vh] flex-1 rounded-[24px] border border-subtle-border px-4 py-4'>
                    <Column gap={3}>
                        {includeTitle && title.trim() ? (
                            <PoppinsText weight='bold' className='text-2xl leading-8'>
                                {title.trim()}
                            </PoppinsText>
                        ) : null}

                        {markdown.trim() ? (
                            <MarkdownRenderer markdown={markdown.trim()} />
                        ) : (
                            <Column className='py-12' gap={1}>
                                <PoppinsText weight='medium'>Nothing to preview yet</PoppinsText>
                                <PoppinsText varient='subtext'>Start typing on the left to see the rendered thread.</PoppinsText>
                            </Column>
                        )}
                    </Column>
                </ScrollView>
            </ScrollShadow>
        </Column>
    );
};

export default TownSquareComposerPreviewPane;
