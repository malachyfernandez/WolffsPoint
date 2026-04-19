import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
    Image,
    LayoutChangeEvent,
    View,
    useWindowDimensions,
} from 'react-native';
import { UserTableItem } from '../../../../types/playerTable';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppDropdown, { AppDropdownOption } from '../forms/AppDropdown';
import FontTextInput from '../forms/FontTextInput';
import FontText from '../text/FontText';

interface MarkdownRendererProps {
    markdown: string;
    className?: string;
    textAlign?: 'left' | 'center' | 'justify';
    viewHeightImages?: number; // percentage of window height for images
    removeImageBorders?: boolean; // remove borders around images
    state?: Record<string, string | undefined>;
    setState?: (nextState: Record<string, string | undefined>) => void;
    isInDialog?: boolean;
}

type MarkdownBlock =
    | { type: 'heading'; level: number; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'list'; ordered: boolean; items: string[] }
    | { type: 'quote'; text: string }
    | { type: 'rule' }
    | { type: 'space' }
    | { type: 'image'; alt: string; url: string };

type MarkdownInputKind = 'text' | 'player_alive' | 'player_dead' | 'player_all' | 'role';

type MarkdownInlineSegment =
    | { type: 'text'; text: string }
    | { type: 'bold'; text: string }
    | { type: 'italic'; text: string }
    | { type: 'code'; text: string }
    | { type: 'image'; alt: string; url: string }
    | { type: 'input'; label: string; rawType: string; inputKind: MarkdownInputKind };

type PlayerDropdownOption = AppDropdownOption & {
    meta: {
        livingState: UserTableItem['playerData']['livingState'];
    };
};

type MarkdownRendererInputDataContextValue = {
    playerOptions: PlayerDropdownOption[];
    roleOptions: AppDropdownOption[];
};

const MarkdownRendererInputDataContext = createContext<MarkdownRendererInputDataContextValue>({
    playerOptions: [],
    roleOptions: [],
});

export const MarkdownRendererInputDataProvider = ({
    children,
    playerOptions = [],
    roleOptions = [],
}: {
    children: React.ReactNode;
    playerOptions?: PlayerDropdownOption[];
    roleOptions?: AppDropdownOption[];
}) => {
    const contextValue = useMemo(
        () => ({ playerOptions, roleOptions }),
        [playerOptions, roleOptions],
    );

    return (
        <MarkdownRendererInputDataContext.Provider value={contextValue}>
            {children}
        </MarkdownRendererInputDataContext.Provider>
    );
};

const MARKDOWN_INPUT_FINDER = /\/\[[\s\S]*?\]\//;
const INLINE_SEGMENT_REGEX = /(\/\[[\s\S]*?\]\/|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|!\[[^\]]*\]\([^)]*\))/g;

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
                <FontText className='mt-2 text-center text-muted' style={{ fontSize: 12 }}>
                    {alt}
                </FontText>
            )}
        </View>
    );
};

const normalizeMarkdownInputKind = (rawType: string): MarkdownInputKind => {
    const normalizedType = rawType
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    if (['SELECT_PLAYER_ALIVE', 'PLAYER_SELECT_ALIVE', 'PLAYER_ALIVE'].includes(normalizedType)) {
        return 'player_alive';
    }

    if (['SELECT_PLAYER_DEAD', 'PLAYER_SELECT_DEAD', 'PLAYER_DEAD'].includes(normalizedType)) {
        return 'player_dead';
    }

    if (['SELECT_PLAYER_ALL', 'PLAYER_SELECT_ALL', 'SELECT_PLAYER', 'PLAYER_SELECT', 'PLAYER_ALL'].includes(normalizedType)) {
        return 'player_all';
    }

    if (['SELECT_ROLE', 'ROLE_SELECT', 'ROLE'].includes(normalizedType)) {
        return 'role';
    }

    return 'text';
};

const parseMarkdownInputToken = (part: string): MarkdownInlineSegment | null => {
    if (!(part.startsWith('/[') && part.endsWith(']/'))) {
        return null;
    }

    const tokenBody = part.slice(2, -2).trim();
    const labeledMatch = tokenBody.match(/^"([^"]+)"\s*:\s*(.+)$/);
    const label = labeledMatch?.[1]?.trim() || tokenBody;
    const rawType = labeledMatch?.[2]?.trim() || 'TEXT';

    if (!label) {
        return null;
    }

    return {
        type: 'input',
        label,
        rawType,
        inputKind: normalizeMarkdownInputKind(rawType),
    };
};

const parseInlineSegments = (text: string): MarkdownInlineSegment[] => {
    return text
        .split(INLINE_SEGMENT_REGEX)
        .filter((part) => part.length > 0)
        .map((part) => {
            const inputSegment = parseMarkdownInputToken(part);
            if (inputSegment) {
                return inputSegment;
            }

            if (part.startsWith('**') && part.endsWith('**')) {
                return { type: 'bold', text: part.slice(2, -2) };
            }

            if (part.startsWith('*') && part.endsWith('*')) {
                return { type: 'italic', text: part.slice(1, -1) };
            }

            if (part.startsWith('`') && part.endsWith('`')) {
                return { type: 'code', text: part.slice(1, -1) };
            }

            if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
                const altMatch = part.match(/^!\[([^\]]*)\]/);
                const urlMatch = part.match(/\]\(([^)]*)\)$/);

                if (altMatch && urlMatch) {
                    return {
                        type: 'image',
                        alt: altMatch[1],
                        url: urlMatch[1],
                    };
                }
            }

            return { type: 'text', text: part };
        });
};

const MarkdownInputField = ({
    input,
    value,
    disabled,
    onChange,
    playerOptions,
    roleOptions,
    isInDialog = false,
}: {
    input: Extract<MarkdownInlineSegment, { type: 'input' }>;
    value?: string;
    disabled: boolean;
    onChange: (nextValue: string) => void;
    playerOptions: PlayerDropdownOption[];
    roleOptions: AppDropdownOption[];
    isInDialog?: boolean;
}) => {
    const dropdownOptions =
        input.inputKind === 'player_alive'
            ? playerOptions.filter((option) => option.meta?.livingState === 'alive')
            : input.inputKind === 'player_dead'
                ? playerOptions.filter((option) => option.meta?.livingState === 'dead')
                : input.inputKind === 'player_all'
                    ? playerOptions
                    : roleOptions;

    const placeholder = input.label;

    return (
        <Column className='my-1 min-w-[220px] max-w-full flex-1' gap={1}>
            {input.inputKind === 'text' ? (
                <FontTextInput
                    value={value ?? ''}
                    onChangeText={onChange}
                    editable={!disabled}
                    placeholder={placeholder}
                    className={`w-full rounded-xl bg-text/10 px-4 py-3 hover:bg-text/5 ${disabled ? 'opacity-60' : ''}`.trim()}
                />
            ) : (
                <AppDropdown
                    options={dropdownOptions}
                    value={value}
                    onValueChange={onChange}
                    placeholder={placeholder}
                    emptyText='No options available'
                    triggerClassName='border-0 bg-text/10 hover:bg-text/5 rounded-xl'
                    contentClassName='border-0'
                    isInDialog={isInDialog}
                    disabled={disabled}
                />
            )}
        </Column>
    );
};

const InlineMarkdownWithInputs = ({
    text,
    keyPrefix,
    textAlign,
    textClassName = '',
    textStyle,
    defaultWeight,
    state,
    setState,
    playerOptions,
    roleOptions,
    isInDialog = false,
}: {
    text: string;
    keyPrefix: string;
    textAlign: 'left' | 'center' | 'justify';
    textClassName?: string;
    textStyle?: Record<string, any>;
    defaultWeight?: 'regular' | 'medium' | 'bold';
    state?: Record<string, string | undefined>;
    setState?: (nextState: Record<string, string | undefined>) => void;
    playerOptions: PlayerDropdownOption[];
    roleOptions: AppDropdownOption[];
    isInDialog?: boolean;
}) => {
    const segments = useMemo(() => parseInlineSegments(text), [text]);
    const disabled = !setState;

    return (
        <View className={`w-full flex-row flex-wrap items-center gap-2 ${textAlign === 'center' ? 'justify-center' : 'justify-start'}`.trim()}>
            {segments.map((segment, index) => {
                if (segment.type === 'image') {
                    return (
                        <Image
                            key={`${keyPrefix}-image-${index}`}
                            source={{ uri: segment.url }}
                            style={{ width: 200, height: 120, maxWidth: '100%' }}
                            resizeMode='contain'
                            className='rounded-lg my-2'
                        />
                    );
                }

                if (segment.type === 'input') {
                    return (
                        <MarkdownInputField
                            key={`${keyPrefix}-input-${index}`}
                            input={segment}
                            value={state?.[segment.label]}
                            disabled={disabled}
                            onChange={(nextValue) => {
                                if (!setState) {
                                    return;
                                }

                                setState({
                                    ...(state ?? {}),
                                    [segment.label]: nextValue,
                                });
                            }}
                            playerOptions={playerOptions}
                            roleOptions={roleOptions}
                            isInDialog={isInDialog}
                        />
                    );
                }

                const segmentWeight =
                    segment.type === 'bold'
                        ? 'bold'
                        : segment.type === 'code'
                            ? 'medium'
                            : defaultWeight;

                return (
                    <FontText
                        key={`${keyPrefix}-text-${index}`}
                        weight={segmentWeight}
                        className={textClassName}
                        style={{
                            ...(textStyle ?? {}),
                            backgroundColor: segment.type === 'code' ? '#efe5c8' : undefined,
                            fontStyle: segment.type === 'italic' ? 'italic' : undefined,
                            textAlign,
                        }}
                    >
                        {segment.text}
                    </FontText>
                );
            })}
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
                    <FontText key={`${keyPrefix}-bold-${index}`} weight='bold'>
                        {part.slice(2, -2)}
                    </FontText>
                );
            }

            if (part.startsWith('*') && part.endsWith('*')) {
                return (
                    <FontText key={`${keyPrefix}-italic-${index}`} style={{ fontStyle: 'italic' }}>
                        {part.slice(1, -1)}
                    </FontText>
                );
            }

            if (part.startsWith('`') && part.endsWith('`')) {
                return (
                    <FontText key={`${keyPrefix}-code-${index}`} weight='medium' style={{ backgroundColor: '#efe5c8' }}>
                        {part.slice(1, -1)}
                    </FontText>
                );
            }

            if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
                const altMatch = part.match(/^!\[([^\]]*)\]/);
                const urlMatch = part.match(/\]\(([^)]*)\)$/);

                if (altMatch && urlMatch) {
                    return (
                        <Image
                            key={`${keyPrefix}-image-${index}`}
                            source={{ uri: urlMatch[1] }}
                            style={{ width: 200, height: 120, maxWidth: '100%' }}
                            resizeMode='contain'
                            className='rounded-lg my-2'
                        />
                    );
                }
            }

            return (
                <FontText key={`${keyPrefix}-text-${index}`}>
                    {part}
                </FontText>
            );
        });
};

const parseMarkdown = (markdown: string): MarkdownBlock[] => {
    const processedMarkdown = markdown
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line + '  ')
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

        const currentLine = lines[index].trim();
        if (currentLine.length > 0) {
            blocks.push({ type: 'paragraph', text: currentLine });
            index += 1;
            continue;
        }
    }

    return blocks;
};

const MarkdownRendererContent = ({
    markdown,
    className = '',
    textAlign = 'left',
    viewHeightImages,
    removeImageBorders,
    state,
    setState,
    isInDialog = false,
    playerOptions,
    roleOptions,
}: MarkdownRendererProps & MarkdownRendererInputDataContextValue) => {
    const blocks = useMemo(() => parseMarkdown(markdown || ''), [markdown]);

    const containsInputs = useMemo(
        () => MARKDOWN_INPUT_FINDER.test(markdown || ''),
        [markdown],
    );

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

                    if (containsInputs) {
                        return (
                            <InlineMarkdownWithInputs
                                key={`heading-${index}`}
                                text={block.text}
                                keyPrefix={`heading-${index}`}
                                textAlign={textAlign}
                                textClassName={sizeClassName}
                                textStyle={{ lineHeight: block.level === 1 ? 36 : block.level === 2 ? 32 : 28 }}
                                defaultWeight='bold'
                                state={state}
                                setState={setState}
                                playerOptions={playerOptions}
                                roleOptions={roleOptions}
                                isInDialog={isInDialog}
                            />
                        );
                    }

                    return (
                        <FontText
                            key={`heading-${index}`}
                            weight='bold'
                            className={sizeClassName}
                            style={{ textAlign }}
                        >
                            {renderInlineMarkdown(block.text, `heading-${index}`)}
                        </FontText>
                    );
                }

                if (block.type === 'quote') {
                    return (
                        <Column key={`quote-${index}`} className='border-l-4 border-border pl-4 py-1 bg-background/30 rounded-r-lg'>
                            {containsInputs ? (
                                <InlineMarkdownWithInputs
                                    text={block.text}
                                    keyPrefix={`quote-${index}`}
                                    textAlign={textAlign}
                                    textStyle={{ lineHeight: 24, fontStyle: 'italic' }}
                                    state={state}
                                    setState={setState}
                                    playerOptions={playerOptions}
                                    roleOptions={roleOptions}
                                    isInDialog={isInDialog}
                                />
                            ) : (
                                <FontText style={{ textAlign, lineHeight: 24, fontStyle: 'italic' }}>
                                    {renderInlineMarkdown(block.text, `quote-${index}`)}
                                </FontText>
                            )}
                        </Column>
                    );
                }

                if (block.type === 'list') {
                    return (
                        <Column key={`list-${index}`} gap={2}>
                            {block.items.map((item, itemIndex) => (
                                <Row key={`list-item-${index}-${itemIndex}`} className='items-start' gap={2}>
                                    <FontText weight='bold' className='pt-[0.1rem]'>
                                        {block.ordered ? `${itemIndex + 1}.` : '•'}
                                    </FontText>
                                    <View className='flex-1'>
                                        {containsInputs ? (
                                            <InlineMarkdownWithInputs
                                                text={item}
                                                keyPrefix={`list-${index}-${itemIndex}`}
                                                textAlign={textAlign}
                                                textStyle={{ lineHeight: 24 }}
                                                state={state}
                                                setState={setState}
                                                playerOptions={playerOptions}
                                                roleOptions={roleOptions}
                                                isInDialog={isInDialog}
                                            />
                                        ) : (
                                            <FontText style={{ textAlign, lineHeight: 24 }}>
                                                {renderInlineMarkdown(item, `list-${index}-${itemIndex}`)}
                                            </FontText>
                                        )}
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
                        <View key={`paragraph-${index}`}>
                            {containsInputs ? (
                                <InlineMarkdownWithInputs
                                    text={block.text}
                                    keyPrefix={`paragraph-${index}`}
                                    textAlign={textAlign}
                                    textStyle={{ lineHeight: 24 }}
                                    state={state}
                                    setState={setState}
                                    playerOptions={playerOptions}
                                    roleOptions={roleOptions}
                                    isInDialog={isInDialog}
                                />
                            ) : (
                                <FontText style={{ textAlign, lineHeight: 24 }}>
                                    {renderInlineMarkdown(block.text, `paragraph-${index}`)}
                                </FontText>
                            )}
                        </View>
                    );
                }

                return null;
            })}
        </Column>
    );
};

const MarkdownRenderer = (props: MarkdownRendererProps) => {
    const { playerOptions, roleOptions } = useContext(MarkdownRendererInputDataContext);

    return (
        <MarkdownRendererContent
            {...props}
            playerOptions={playerOptions}
            roleOptions={roleOptions}
        />
    );
};

export default MarkdownRenderer;
