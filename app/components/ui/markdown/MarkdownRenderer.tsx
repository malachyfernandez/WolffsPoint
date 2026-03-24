import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import PoppinsText from '../text/PoppinsText';

interface MarkdownRendererProps {
    markdown: string;
    className?: string;
    textAlign?: 'left' | 'center' | 'justify';
}

type MarkdownBlock =
    | { type: 'heading'; level: number; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'list'; ordered: boolean; items: string[] }
    | { type: 'quote'; text: string }
    | { type: 'rule' }
    | { type: 'space' };

const renderInlineMarkdown = (text: string, keyPrefix: string) => {
    return text
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
        .filter((part) => part.length > 0)
        .map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <PoppinsText key={`${keyPrefix}-bold-${index}`} weight='bold'>
                        {part.slice(2, -2)}
                    </PoppinsText>
                );
            }

            if (part.startsWith('*') && part.endsWith('*')) {
                return (
                    <PoppinsText key={`${keyPrefix}-italic-${index}`} style={{ fontStyle: 'italic' }}>
                        {part.slice(1, -1)}
                    </PoppinsText>
                );
            }

            if (part.startsWith('`') && part.endsWith('`')) {
                return (
                    <PoppinsText key={`${keyPrefix}-code-${index}`} weight='medium' style={{ backgroundColor: '#efe5c8' }}>
                        {part.slice(1, -1)}
                    </PoppinsText>
                );
            }

            return <Text key={`${keyPrefix}-text-${index}`}>{part}</Text>;
        });
};

const parseMarkdown = (markdown: string): MarkdownBlock[] => {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks: MarkdownBlock[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index].trim();

        if (line.length === 0) {
            blocks.push({ type: 'space' });
            index += 1;
            continue;
        }

        const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
        if (headingMatch) {
            blocks.push({
                type: 'heading',
                level: headingMatch[1].length,
                text: headingMatch[2],
            });
            index += 1;
            continue;
        }

        if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
            blocks.push({ type: 'rule' });
            index += 1;
            continue;
        }

        if (line.startsWith('> ')) {
            const quoteLines: string[] = [];
            while (index < lines.length && lines[index].trim().startsWith('> ')) {
                quoteLines.push(lines[index].trim().slice(2));
                index += 1;
            }
            blocks.push({ type: 'quote', text: quoteLines.join(' ') });
            continue;
        }

        if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
            const ordered = /^\d+\.\s+/.test(line);
            const items: string[] = [];

            while (index < lines.length) {
                const listLine = lines[index].trim();
                const nextOrdered = /^\d+\.\s+/.test(listLine);
                const nextUnordered = /^[-*]\s+/.test(listLine);

                if ((!ordered && !nextUnordered) || (ordered && !nextOrdered)) {
                    break;
                }

                items.push(listLine.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ''));
                index += 1;
            }

            blocks.push({ type: 'list', ordered, items });
            continue;
        }

        const paragraphLines: string[] = [];
        while (index < lines.length) {
            const paragraphLine = lines[index].trim();
            if (
                paragraphLine.length === 0 ||
                /^(#{1,3})\s+/.test(paragraphLine) ||
                /^[-*]\s+/.test(paragraphLine) ||
                /^\d+\.\s+/.test(paragraphLine) ||
                paragraphLine.startsWith('> ') ||
                /^---+$/.test(paragraphLine) ||
                /^\*\*\*+$/.test(paragraphLine)
            ) {
                break;
            }

            paragraphLines.push(paragraphLine);
            index += 1;
        }

        blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
    }

    return blocks;
};

const MarkdownRenderer = ({ markdown, className = '', textAlign = 'left' }: MarkdownRendererProps) => {
    const blocks = useMemo(() => parseMarkdown(markdown || ''), [markdown]);

    return (
        <Column className={className} gap={3}>
            {blocks.map((block, index) => {
                if (block.type === 'space') {
                    return <View key={`space-${index}`} className='h-2' />;
                }

                if (block.type === 'rule') {
                    return <View key={`rule-${index}`} className='h-px w-full bg-border opacity-60' />;
                }

                if (block.type === 'heading') {
                    const sizeClassName =
                        block.level === 1
                            ? 'text-3xl leading-9'
                            : block.level === 2
                                ? 'text-2xl leading-8'
                                : 'text-xl leading-7';

                    return (
                        <PoppinsText
                            key={`heading-${index}`}
                            weight='bold'
                            className={sizeClassName}
                            style={{ textAlign: 'left' }}
                        >
                            {renderInlineMarkdown(block.text, `heading-${index}`)}
                        </PoppinsText>
                    );
                }

                if (block.type === 'quote') {
                    return (
                        <Column key={`quote-${index}`} className='border-l-4 border-border pl-4 py-1 bg-background/30 rounded-r-lg'>
                            <PoppinsText style={{ textAlign, lineHeight: 24, fontStyle: 'italic' }}>
                                {renderInlineMarkdown(block.text, `quote-${index}`)}
                            </PoppinsText>
                        </Column>
                    );
                }

                if (block.type === 'list') {
                    return (
                        <Column key={`list-${index}`} gap={2}>
                            {block.items.map((item, itemIndex) => (
                                <Row key={`list-item-${index}-${itemIndex}`} className='items-start' gap={2}>
                                    <PoppinsText weight='bold' className='pt-[0.1rem]'>
                                        {block.ordered ? `${itemIndex + 1}.` : '•'}
                                    </PoppinsText>
                                    <View className='flex-1'>
                                        <PoppinsText style={{ textAlign, lineHeight: 24 }}>
                                            {renderInlineMarkdown(item, `list-${index}-${itemIndex}`)}
                                        </PoppinsText>
                                    </View>
                                </Row>
                            ))}
                        </Column>
                    );
                }

                return (
                    <PoppinsText key={`paragraph-${index}`} style={{ textAlign, lineHeight: 24 }}>
                        {renderInlineMarkdown(block.text, `paragraph-${index}`)}
                    </PoppinsText>
                );
            })}
        </Column>
    );
};

export default MarkdownRenderer;
