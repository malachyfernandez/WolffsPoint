import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import FontText from '../../ui/text/FontText';
import ShadowScrollView from '../../ui/ShadowScrollView';
import {
    closeDialogAndScroll,
    parseHeadings,
    scrollToHeading,
    scrollToElement,
} from 'utils/parseHeadings';
import { RoleTableItem } from 'types/roleTable';
import type { MarkdownDocumentNode } from 'utils/markdownDocument';
import CloseButton from '../../ui/dialog/CloseButton';

interface TableOfContentsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    /** Rule book markdown content */
    markdown: string;
    /** Prefix used for heading IDs in the rendered markdown */
    headingIdPrefix: string;
    /** Ordered roles to list in the TOC */
    roles: RoleTableItem[];
    /** Title for the rule book section */
    ruleBookTitle: string;
    /** Title for the role descriptions section */
    roleDescriptionsTitle: string;
    /** Evaluated modular document. When present, TOC entries follow its order. */
    documentNodes?: MarkdownDocumentNode[];
    /** Requests navigation to a nested document screen before scrolling. */
    onNavigate?: (path: string[], targetId: string) => void;
}

interface ModularTocEntry {
    label: string;
    path: string[];
    depth: number;
    targetId: string;
}

const TableOfContentsDialog = ({
    isOpen,
    onOpenChange,
    markdown,
    headingIdPrefix,
    roles,
    ruleBookTitle,
    roleDescriptionsTitle,
    documentNodes,
    onNavigate,
}: TableOfContentsDialogProps) => {
    const headings = useMemo(() => parseHeadings(markdown), [markdown]);

    const modularEntries = useMemo<ModularTocEntry[] | undefined>(() => {
        if (!documentNodes) return undefined;
        const entries: ModularTocEntry[] = [];
        const visit = (nodes: MarkdownDocumentNode[], path: string[], depth: number) => {
            for (const node of nodes) {
                if (node.kind === 'navigation') {
                    const nextPath = [...path, node.id];
                    entries.push({
                        label: node.label,
                        path: nextPath,
                        depth,
                        targetId: `${headingIdPrefix}-nav-${encodeURIComponent(node.id)}`,
                    });
                    visit(node.children, nextPath, depth + 1);
                } else if (node.kind === 'markdown' && node.block.type === 'heading') {
                    entries.push({
                        label: node.block.text.trim(),
                        path,
                        depth: depth + node.block.level,
                        targetId: `${headingIdPrefix}-${encodeURIComponent(node.id)}-heading-${node.blockIndex}`,
                    });
                }
            }
        };
        visit(documentNodes, [], 0);
        return entries;
    }, [documentNodes, headingIdPrefix]);

    const visibleRoles = useMemo(
        () => roles.filter(
            (role) =>
                role.isVisible !== false &&
                role.hiddenFromRulebook !== true &&
                role.aboutRole &&
                role.aboutRole.trim().length > 0
        ),
        [roles]
    );

    const handleHeadingPress = (blockIndex: number) => {
        closeAndScroll(() => scrollToHeading(headingIdPrefix, blockIndex));
    };

    const hasContent = modularEntries
        ? modularEntries.length > 0
        : headings.length > 0 || visibleRoles.length > 0;

    const handleModularPress = (entry: ModularTocEntry) => {
        closeAndScroll(() => onNavigate?.(entry.path, entry.targetId));
    };

    const closeAndScroll = (scrollAction: () => void) =>
        closeDialogAndScroll(() => onOpenChange(false), scrollAction);

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='h-[70vh]'>
                    <CloseButton onPress={() => onOpenChange(false)} />
                    <DialogHeader
                        text='Table of Contents'
                        subtext='Jump to a section'
                    />

                    <Column className='min-h-0 flex-1'>
                        {!hasContent ? (
                            <View className='border-subtle-border bg-text/5 rounded-lg border p-8'>
                                <FontText variant='subtext' className='text-center'>
                                    No sections available yet.
                                </FontText>
                            </View>
                        ) : (
                            <ShadowScrollView
                                direction='vertical'
                                className='flex-1 min-h-0'
                                scrollViewClassName='w-full'
                            >
                                <Column className='gap-0 pb-4'>
                                    {/* Rule book title: top-level entry */}
                                    <Pressable
                                        onPress={() => {
                                            const targetId = `${headingIdPrefix}-top`;
                                            closeAndScroll(() =>
                                                modularEntries
                                                    ? onNavigate?.([], targetId)
                                                    : scrollToElement(targetId)
                                            );
                                        }}
                                        className='hover:bg-text/5 active:bg-text/10 rounded-md pb-2'
                                    >
                                        <FontText numberOfLines={1} ellipsizeMode='tail'>
                                            {ruleBookTitle}
                                        </FontText>
                                    </Pressable>

                                    {/* Modular document entries follow the composed order, including folders inside navigation screens. */}
                                    {modularEntries?.map((entry, index) => (
                                        <Pressable
                                            key={`modular-${entry.targetId}-${index}`}
                                            onPress={() => handleModularPress(entry)}
                                            className='hover:bg-text/5 active:bg-text/10 rounded-md py-2'
                                            style={{ paddingLeft: entry.depth * 20 }}
                                        >
                                            <FontText numberOfLines={1} ellipsizeMode='tail'>
                                                {entry.label}
                                            </FontText>
                                        </Pressable>
                                    ))}

                                    {/* Markdown headings: indented by heading level */}
                                    {!modularEntries && headings.map((heading, index) => (
                                        <Pressable
                                            key={`heading-${heading.blockIndex}-${index}`}
                                            onPress={() => handleHeadingPress(heading.blockIndex)}
                                            className='hover:bg-text/5 active:bg-text/10 rounded-md py-2'
                                            style={{
                                                paddingLeft: heading.level * 20,
                                            }}
                                        >
                                            <FontText numberOfLines={1} ellipsizeMode='tail'>
                                                {heading.text}
                                            </FontText>
                                        </Pressable>
                                    ))}

                                    {/* Role descriptions section */}
                                    {!modularEntries && visibleRoles.length > 0 && (
                                        <>
                                            <View className='bg-border/30 h-px w-full my-2' />
                                            <Pressable
                                                onPress={() => {
                                                    closeAndScroll(() => scrollToElement(`${headingIdPrefix}-roles-top`));
                                                }}
                                                className='hover:bg-text/5 active:bg-text/10 rounded-md py-2'
                                            >
                                                <FontText numberOfLines={1} ellipsizeMode='tail'>
                                                    {roleDescriptionsTitle}
                                                </FontText>
                                            </Pressable>
                                            {visibleRoles.map((role, index) => (
                                                <Pressable
                                                    key={`role-${index}`}
                                                    onPress={() => {
                                                        closeAndScroll(() => scrollToElement(`${headingIdPrefix}-role-${index}`));
                                                    }}
                                                    className='hover:bg-text/5 active:bg-text/10 rounded-md py-2'
                                                    style={{ paddingLeft: 20 }}
                                                >
                                                    <FontText numberOfLines={1} ellipsizeMode='tail'>
                                                        {role.role}
                                                    </FontText>
                                                </Pressable>
                                            ))}
                                        </>
                                    )}
                                </Column>
                            </ShadowScrollView>
                        )}
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default TableOfContentsDialog;
