import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import ConvexDialog from '../../ui/dialog/ConvexDialog';
import DialogHeader from '../../ui/dialog/DialogHeader';
import Column from '../../layout/Column';
import FontText from '../../ui/text/FontText';
import ShadowScrollView from '../../ui/ShadowScrollView';
import { parseHeadings, scrollToHeading } from '../../../../utils/parseHeadings';
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
    /** Title for the role descriptions section */
    roleDescriptionsTitle: string;
}

const TableOfContentsDialog = ({
    isOpen,
    onOpenChange,
    markdown,
    headingIdPrefix,
    roles,
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
        scrollToHeading(headingIdPrefix, blockIndex);
        onOpenChange(false);
    };

    const hasContent = headings.length > 0 || visibleRoles.length > 0;

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
                                <Column className='gap-1 pb-4'>
                                    {headings.map((heading, index) => (
                                        <Pressable
                                            key={`heading-${heading.blockIndex}-${index}`}
                                            onPress={() => handleHeadingPress(heading.blockIndex)}
                                            className='hover:bg-text/5 active:bg-text/10 rounded-md py-2'
                                            style={{
                                                paddingLeft: (heading.level - 1) * 20,
                                            }}
                                        >
                                            <FontText
                                                weight={heading.level === 1 ? 'bold' : 'medium'}
                                                className={heading.level === 1 ? 'text-lg' : heading.level === 2 ? 'text-base' : 'text-sm'}
                                                numberOfLines={1}
                                                ellipsizeMode='tail'
                                            >
                                                {heading.text}
                                            </FontText>
                                        </Pressable>
                                    ))}

                                    {visibleRoles.length > 0 && (
                                        <>
                                            <View className='bg-border/30 h-px w-full my-2' />
                                            <FontText weight='bold' className='text-lg py-2'>
                                                {roleDescriptionsTitle}
                                            </FontText>
                                            {visibleRoles.map((role, index) => (
                                                <Pressable
                                                    key={`role-${index}`}
                                                    onPress={() => {
                                                        if (typeof document !== 'undefined') {
                                                            const el = document.getElementById(`${headingIdPrefix}-role-${index}`);
                                                            if (el) {
                                                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                            }
                                                        }
                                                        onOpenChange(false);
                                                    }}
                                                    className='hover:bg-text/5 active:bg-text/10 rounded-md py-2'
                                                    style={{ paddingLeft: 20 }}
                                                >
                                                    <FontText
                                                        weight='medium'
                                                        className='text-base'
                                                        numberOfLines={1}
                                                        ellipsizeMode='tail'
                                                    >
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
