import React, { useEffect, useMemo, useState } from 'react';
import {
    Image,
    LayoutChangeEvent,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import PoppinsText from '../text/PoppinsText';

interface MarkdownRendererProps {
    markdown: string;
    className?: string;
    textAlign?: 'left' | 'center' | 'justify';
    viewHeightImages?: number; // percentage of window height for images
    removeImageBorders?: boolean; // remove borders around images
}

type MarkdownBlock =
    | { type: 'heading'; level: number; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'list'; ordered: boolean; items: string[] }
    | { type: 'quote'; text: string }
    | { type: 'rule' }
    | { type: 'space' }
    | { type: 'image'; alt: string; url: string };

const MarkdownImage = ({ url, alt, viewHeightImages, removeImageBorders }: { url: string; alt: string; viewHeightImages?: number; removeImageBorders?: boolean }) => {
    const { height: windowHeight } = useWindowDimensions();
    const [containerWidth, setContainerWidth] = useState(0);
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
        let isMounted = true;
        const image = new window.Image();

        image.onload = () => {
            if (!isMounted) {
                return;
            }

            if (image.naturalWidth && image.naturalHeight) {
                setNaturalSize({
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                });
            }
        };

        image.src = url;

        return () => {
            isMounted = false;
        };
    }, [url]);

    const maxImageHeight = windowHeight * ((viewHeightImages || 50) / 100);
    const availableWidth = Math.max(containerWidth, 0);

    let imageWidth = availableWidth || undefined;
    let imageHeight = maxImageHeight;

    if (naturalSize && availableWidth > 0) {
        const scale = Math.min(
            1,
            availableWidth / naturalSize.width,
            maxImageHeight / naturalSize.height,
        );

        imageWidth = naturalSize.width * scale;
        imageHeight = naturalSize.height * scale;
    }

    return (
        <View key={url} className='my-0 w-full'>
            <View
                className={`w-full items-center justify-center ${removeImageBorders === false ? 'rounded-lg border border-border' : ''}`}
                onLayout={(event: LayoutChangeEvent) => {
                    setContainerWidth(event.nativeEvent.layout.width);
                }}
            >
                <Image
                    source={{ uri: url }}
                    style={{
                        width: imageWidth,
                        height: imageHeight,
                        maxWidth: '100%',
                    }}
                    resizeMode='contain'
                />
            </View>
            {alt && alt !== 'IMAGE1' && (
                <PoppinsText className='mt-2 text-center text-muted' style={{ fontSize: 12 }}>
                    {alt}
                </PoppinsText>
            )}
        </View>
    );
};

const renderInlineMarkdown = (text: string, keyPrefix: string) => {
    return text
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|!\[[^\]]*\]\([^)]*\))/g)
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

            // Handle inline images (though we'll parse them as blocks for better layout)
            if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
                const altMatch = part.match(/^!\[([^\]]*)\]/);
                const urlMatch = part.match(/\]\(([^)]*)\)$/);
                if (altMatch && urlMatch) {
                    return (
                        <Image
                            key={`${keyPrefix}-image-${index}`}
                            source={{ uri: urlMatch[1] }}
                            style={{ width: '100%', height: 200 }}
                            resizeMode='contain'
                            className="rounded-lg my-2"
                        />
                    );
                }
            }

            return <Text key={`${keyPrefix}-text-${index}`}>{part}</Text>;
        });
};

const parseMarkdown = (markdown: string): MarkdownBlock[] => {
    // Early logic: Add double spaces after each line before processing
    const processedMarkdown = markdown
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line + '  ') // Add double spaces to each line
        .join('\n');
    
    const lines = processedMarkdown.split('\n');
    const blocks: MarkdownBlock[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index].trim();

        if (line.length === 0) {
            blocks.push({ type: 'space' });
            index += 1;
            continue;
        }

        // Check for image on its own line
        const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
        if (imageMatch) {
            blocks.push({
                type: 'image',
                alt: imageMatch[1],
                url: imageMatch[2],
            });
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

        // Treat each non-empty line as its own paragraph for single line breaks
        const currentLine = lines[index].trim();
        if (currentLine.length > 0) {
            blocks.push({ type: 'paragraph', text: currentLine });
            index += 1;
            continue;
        }
    }

    return blocks;
};

const MarkdownRenderer = ({ markdown, className = '', textAlign = 'left', viewHeightImages, removeImageBorders }: MarkdownRendererProps) => {
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
                            style={{ textAlign }}
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

                if (block.type === 'image') {
                    return (
                        <MarkdownImage key={`image-${index}`} url={block.url} alt={block.alt} viewHeightImages={viewHeightImages} removeImageBorders={removeImageBorders} />
                    );
                }

                if (block.type === 'paragraph') {
                    return (
                        <PoppinsText key={`paragraph-${index}`} style={{ textAlign, lineHeight: 24 }}>
                            {renderInlineMarkdown(block.text, `paragraph-${index}`)}
                        </PoppinsText>
                    );
                }

                return null;
            })}
        </Column>
    );
};

export default MarkdownRenderer;
