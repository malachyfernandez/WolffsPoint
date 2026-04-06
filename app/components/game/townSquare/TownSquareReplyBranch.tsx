import React from 'react';
import { Pressable } from 'react-native';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import PoppinsText from '../../ui/text/PoppinsText';
import TownSquareAvatar from './TownSquareAvatar';
import { ReplyTreeNode, formatTimestamp } from './townSquareUtils';

interface TownSquareReplyBranchProps {
    depth: number;
    expandedBranchIds: Record<string, boolean>;
    nodes: ReplyTreeNode[];
    onExpandBranch: (branchId: string) => void;
    onReply: (reply: ReplyTreeNode) => void;
}

const TownSquareReplyBranch = ({ depth, expandedBranchIds, nodes, onExpandBranch, onReply }: TownSquareReplyBranchProps) => {
    const visibleCount = depth === 0 ? 2 : depth === 1 ? 1 : 0;

    return (
        <Column gap={4}>
            {nodes.map((node) => {
                const branchId = node.commentId;
                const isExpanded = expandedBranchIds[branchId] === true;
                const visibleChildren = isExpanded ? node.children : node.children.slice(0, visibleCount);
                const hiddenChildrenCount = Math.max(0, node.children.length - visibleChildren.length);

                return (
                    <Column key={node.commentId} gap={3} style={{ marginLeft: depth * 24 }}>
                        <Row className='items-start gap-3 border-l border-border/25 pl-4'>
                            <TownSquareAvatar size={42} uri={node.authorImageUrl} />
                            <Column className='flex-1' gap={2}>
                                <Row className='items-center justify-between gap-3'>
                                    <PoppinsText weight='medium'>{node.authorDisplayName}</PoppinsText>
                                    <PoppinsText varient='subtext'>{formatTimestamp(node.createdAt)}</PoppinsText>
                                </Row>
                                <MarkdownRenderer markdown={node.bodyMarkdownResolved} />
                                <Pressable onPress={() => onReply(node)}>
                                    <PoppinsText weight='medium' className='text-accent'>Reply</PoppinsText>
                                </Pressable>
                            </Column>
                        </Row>

                        {visibleChildren.length > 0 ? (
                            <TownSquareReplyBranch
                                depth={depth + 1}
                                expandedBranchIds={expandedBranchIds}
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
