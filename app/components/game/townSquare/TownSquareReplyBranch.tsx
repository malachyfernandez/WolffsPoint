import React, { useMemo } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import FontText from '../../ui/text/FontText';
import { TownSquareAuthorAvatar, TownSquareAuthorName } from './TownSquareAuthorIdentity';
import { ReplyTreeNode, formatTimestamp } from './townSquareUtils';

interface TownSquareReplyBranchProps {
    currentUserId: string;
    depth: number;
    expandedBranchIds: Record<string, boolean>;
    isPlayerDead: boolean;
    nodes: ReplyTreeNode[];
    onDeleteReply: (reply: ReplyTreeNode) => void;
    onEditReply: (reply: ReplyTreeNode) => void;
    onExpandBranch: (branchId: string) => void;
    onReply: (reply: ReplyTreeNode) => void;
}

const TownSquareReplyBranch = ({
    currentUserId,
    depth,
    expandedBranchIds,
    isPlayerDead,
    nodes,
    onDeleteReply,
    onEditReply,
    onExpandBranch,
    onReply,
}: TownSquareReplyBranchProps) => {
    const { width: screenWidth } = useWindowDimensions();
    const indentSize = useMemo(() => (screenWidth < 450 ? 16 : 24), [screenWidth]);

    const visibleCount = depth === 0 ? 2 : depth === 1 ? 1 : 0;

    return (
        <Column className='gap-4'>
            {nodes.map((node) => {
                const branchId = node.commentId;
                const isExpanded = expandedBranchIds[branchId] === true;
                const isOwnReply = node.authorUserId === currentUserId;
                const visibleChildren = isExpanded ? node.children : node.children.slice(0, visibleCount);
                const hiddenChildrenCount = Math.max(0, node.children.length - visibleChildren.length);

                return (
                    <Column key={node.commentId} className='gap-3'>
                        <Row className='gap-4 items-start border-l-[1px] border-border/25 pl-4' style={{ marginLeft: depth * indentSize }}>
                            <TownSquareAuthorAvatar gameId={node.gameId} size={42} userId={node.authorUserId} />
                            <Column className='gap-2 flex-1'>
                                <Column className='gap-4 gap-y-1 flex-col sm:flex-row flex-wrap sm:items-center sm:justify-between'>
                                    <TownSquareAuthorName gameId={node.gameId} userId={node.authorUserId} weight='medium' />
                                    <FontText variant='subtext'>{formatTimestamp(node.createdAt)}</FontText>
                                </Column>
                                <MarkdownRenderer markdown={node.bodyMarkdownResolved} />
                                <Row className='gap-4 items-center flex-wrap gap-y-1'>
                                    {!isPlayerDead && (
                                        <Pressable onPress={() => onReply(node)}>
                                            <FontText weight='bold' className='text-accent'>Reply</FontText>
                                        </Pressable>
                                    )}
                                    {isOwnReply ? (
                                        <>
                                            {!isPlayerDead && (
                                                <Pressable onPress={() => onEditReply(node)}>
                                                    <FontText weight='bold' className='text-accent'>Edit</FontText>
                                                </Pressable>
                                            )}
                                            <Pressable onPress={() => onDeleteReply(node)}>
                                                <FontText weight='bold' className='text-red-500'>Delete</FontText>
                                            </Pressable>
                                        </>
                                    ) : null}
                                </Row>
                            </Column>
                        </Row>

                        {visibleChildren.length > 0 ? (
                            <TownSquareReplyBranch
                                currentUserId={currentUserId}
                                depth={depth + 1}
                                expandedBranchIds={expandedBranchIds}
                                isPlayerDead={isPlayerDead}
                                onDeleteReply={onDeleteReply}
                                onEditReply={onEditReply}
                                nodes={visibleChildren}
                                onExpandBranch={onExpandBranch}
                                onReply={onReply}
                            />
                        ) : null}

                        {hiddenChildrenCount > 0 ? (
                            <Pressable onPress={() => onExpandBranch(branchId)} style={{ marginLeft: depth * indentSize + 18 }}>
                                <FontText weight='bold' className='text-accent'>
                                    {`See all ${hiddenChildrenCount} repl${hiddenChildrenCount === 1 ? 'y' : 'ies'}`}
                                </FontText>
                            </Pressable>
                        ) : null}
                    </Column>
                );
            })}
        </Column>
    );
};

export default TownSquareReplyBranch;
