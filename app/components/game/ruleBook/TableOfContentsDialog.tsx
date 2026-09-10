import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import FontText from '../../ui/text/FontText';
import ShadowScrollView from '../../ui/ShadowScrollView';
import { parseHeadings, scrollToHeading, scrollToElement } from '../../../../utils/parseHeadings';
import { RoleTableItem } from '../../../../types/roleTable';

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
}

const TableOfContentsDialog = ({
    isOpen,
    onOpenChange,
    markdown,
    headingIdPrefix,
    roles,
    ruleBookTitle,
    roleDescriptionsTitle,
}: TableOfContentsDialogProps) => {
    const headings = useMemo(() => parseHeadings(markdown), [markdown]);

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

    const hasContent = headings.length > 0 || visibleRoles.length > 0;

    /**
     * Closes the dialog, then runs the scroll action once the dialog's body
     * scroll-lock has released.
     *
     * The heroui-native Dialog sets `overflow: hidden` on the body while open
     * and never removes it on close (web bug), making the document
     * unscrollable. We force-clear the lock after closing so the scroll works.
     */
    const closeAndScroll = (scrollAction: () => void) => {
        console.log('[TOC] closeAndScroll — closing dialog');
        onOpenChange(false);
        if (typeof document === 'undefined') {
            scrollAction();
            return;
        }

        // The heroui-native Dialog sets overflow:hidden on the body but never
        // removes it on close (bug on web). Force-clear it so the page can
        // scroll again.
        const forceClearScrollLock = () => {
            const bodyStyle = document.body.style;
            const htmlStyle = document.documentElement.style;
            const bodyLocked = window.getComputedStyle(document.body).overflowY === 'hidden';
            const htmlLocked = window.getComputedStyle(document.documentElement).overflowY === 'hidden';
            if (bodyLocked) {
                bodyStyle.overflow = '';
            }
            if (htmlLocked) {
                htmlStyle.overflow = '';
            }
            console.log('[TOC] closeAndScroll — forceClearScrollLock', { bodyLocked, htmlLocked });
        };

        // Wait a tick for React to process the close, then force-clear and scroll.
        requestAnimationFrame(() => {
            forceClearScrollLock();
            console.log('[TOC] closeAndScroll — running scrollAction');
            scrollAction();
        });
    };

    return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='h-[70vh]'>
                    <ConvexDialog.Close
                        iconProps={{ color: 'rgb(246, 238, 219)' }}
                        className='bg-text-inverted/10 hover:bg-text-inverted/15 absolute right-0 top-0 z-10 h-10 w-10 rounded-full'
                    />
                    <DialogHeader
                        text='Table of Contents'
                        subtext='Jump to a section'
                    />

                    <Column className='min-h-0 flex-1 pt-3'>
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
                                    {/* Rule book title — top-level entry */}
                                    <Pressable
                                        onPress={() => {
                                            closeAndScroll(() => scrollToElement(`${headingIdPrefix}-top`));
                                        }}
                                        className='hover:bg-text/5 active:bg-text/10 rounded-md py-2'
                                    >
                                        <FontText numberOfLines={1} ellipsizeMode='tail'>
                                            {ruleBookTitle}
                                        </FontText>
                                    </Pressable>

                                    {/* Markdown headings — indented by heading level */}
                                    {headings.map((heading, index) => (
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

                                    {/* Role descriptions section — temporarily disabled
                                    {visibleRoles.length > 0 && (
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
                                    */}
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
