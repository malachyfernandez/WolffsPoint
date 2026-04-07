import React from 'react';
import { Pressable } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import PoppinsText from '../../ui/text/PoppinsText';
import { TownSquareAuthorAvatar, TownSquareAuthorName } from './TownSquareAuthorIdentity';
import { ReplyTreeNode, formatTimestamp } from './townSquareUtils';

interface TownSquareReplyBranchProps {
    currentUserId: string;
    depth: number;
    expandedBranchIds: Record<string, boolean>;
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
    nodes,
    onDeleteReply,
    onEditReply,
    onExpandBranch,
    onReply,
}: TownSquareReplyBranchProps) => {
    const visibleCount = depth === 0 ? 2 : depth === 1 ? 1 : 0;

    return (
        <Column gap={4}>
            {nodes.map((node) => {
                const branchId = node.commentId;
                const isExpanded = expandedBranchIds[branchId] === true;
                const isOwnReply = node.authorUserId === currentUserId;
                const visibleChildren = isExpanded ? node.children : node.children.slice(0, visibleCount);
                const hiddenChildrenCount = Math.max(0, node.children.length - visibleChildren.length);

                return (
                    <Column key={node.commentId} gap={3} style={{ marginLeft: depth * 24 }}>
                        <Row className='items-start gap-3 border-l-[1px] border-border/25 pl-4'>
                            <TownSquareAuthorAvatar gameId={node.gameId} size={42} userId={node.authorUserId} />
                            <Column className='flex-1' gap={2}>
                                <Row className='items-center justify-between gap-3'>
                                    <TownSquareAuthorName gameId={node.gameId} userId={node.authorUserId} weight='medium' />
                                    <PoppinsText varient='subtext'>{formatTimestamp(node.createdAt)}</PoppinsText>
                                </Row>
                                <MarkdownRenderer markdown={node.bodyMarkdownResolved} />
                                <Row className='items-center gap-4'>
                                    <Pressable onPress={() => onReply(node)}>
                                        <PoppinsText weight='medium' className='text-accent'>Reply</PoppinsText>
                                    </Pressable>
                                    {isOwnReply ? (
                                        <>
                                            <Pressable onPress={() => onEditReply(node)}>
                                                <PoppinsText weight='medium' className='text-accent'>Edit</PoppinsText>
                                            </Pressable>
                                            <Pressable onPress={() => onDeleteReply(node)}>
                                                <PoppinsText weight='medium' className='text-red-500'>Delete</PoppinsText>
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
                                onDeleteReply={onDeleteReply}
                                onEditReply={onEditReply}
                                nodes={visibleChildren}
                                onExpandBranch={onExpandBranch}
                                onReply={onReply}
                            />
                        ) : null}

                        {hiddenChildrenCount > 0 ? (
                            <Pressable onPress={() => onExpandBranch(branchId)} style={{ marginLeft: depth * 24 + 58 }}>
                                <PoppinsText weight='medium' className='text-accent'>
                                    {`See all ${hiddenChildrenCount} repl${hiddenChildrenCount === 1 ? 'y' : 'ies'}`}
                                </PoppinsText>
                            </Pressable>
                        ) : null}
                    </Column>
                );
            })}
        </Column>
    );
};

export default TownSquareReplyBranch;
