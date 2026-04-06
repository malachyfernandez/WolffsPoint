import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import PoppinsText from '../../ui/text/PoppinsText';
import TownSquareAvatar from './TownSquareAvatar';
import TownSquareReplyBranch from './TownSquareReplyBranch';
import { ReplyTreeNode, ThreadViewModel, formatTimestamp } from './townSquareUtils';

interface TownSquareThreadDetailViewProps {
    expandedBranchIds: Record<string, boolean>;
    onBack: () => void;
    onExpandBranch: (branchId: string) => void;
    onReplyToThread: () => void;
    onReplyToComment: (reply: ReplyTreeNode) => void;
    replyTree: ReplyTreeNode[];
    selectedThread: ThreadViewModel;
}

const TownSquareThreadDetailView = ({
    expandedBranchIds,
    onBack,
    onExpandBranch,
    onReplyToComment,
    onReplyToThread,
    replyTree,
    selectedThread,
}: TownSquareThreadDetailViewProps) => {
    return (
        <Column className='flex-1 px-6 py-6' gap={5}>
            <Pressable onPress={onBack}>
                <PoppinsText weight='medium' className='text-accent'>{'← Return'}</PoppinsText>
            </Pressable>

            <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                <ScrollView className='flex-1'>
                    <Column gap={7}>
                        <Column gap={4}>
                            <Row className='items-start gap-4'>
                                <TownSquareAvatar size={60} uri={selectedThread.authorImageUrl} />
                                <Column className='flex-1' gap={1}>
                                    <PoppinsText weight='bold' className='text-4xl leading-10'>{selectedThread.titleResolved}</PoppinsText>
                                    <PoppinsText>{selectedThread.authorDisplayName}</PoppinsText>
                                    <PoppinsText varient='subtext'>{formatTimestamp(selectedThread.createdAt)}</PoppinsText>
                                </Column>
                            </Row>

                            <MarkdownRenderer markdown={selectedThread.bodyMarkdownResolved} />

                            <Row className='items-center justify-between gap-3 border-b border-border/20 pb-4'>
                                <PoppinsText varient='subtext'>{`${selectedThread.replyCount} repl${selectedThread.replyCount === 1 ? 'y' : 'ies'}`}</PoppinsText>
                                <AppButton variant='outline' className='w-36' onPress={onReplyToThread}>
                                    <PoppinsText weight='medium'>Reply</PoppinsText>
                                </AppButton>
                            </Row>
                        </Column>

                        <Column gap={4}>
                            <Row className='items-center justify-between'>
                                <PoppinsText weight='medium' className='text-2xl'>Replies</PoppinsText>
                                <PoppinsText varient='subtext'>Nested branches open only where needed.</PoppinsText>
                            </Row>

                            {replyTree.length > 0 ? (
                                <TownSquareReplyBranch
                                    depth={0}
                                    expandedBranchIds={expandedBranchIds}
                                    nodes={replyTree}
                                    onExpandBranch={onExpandBranch}
                                    onReply={onReplyToComment}
                                />
                            ) : (
                                <Column className='py-8' gap={1}>
                                    <PoppinsText weight='medium'>No replies yet</PoppinsText>
                                    <PoppinsText varient='subtext'>Be the first person to answer this thread.</PoppinsText>
                                </Column>
                            )}
                        </Column>
                    </Column>
                </ScrollView>
            </ScrollShadow>
        </Column>
    );
};

export default TownSquareThreadDetailView;
