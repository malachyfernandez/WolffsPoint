import React, { useEffect } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import PoppinsText from '../../ui/text/PoppinsText';
import { TownSquareAuthorAvatar, TownSquareAuthorName } from './TownSquareAuthorIdentity';
import TownSquareReplyBranch from './TownSquareReplyBranch';
import { ReplyTreeNode, ThreadViewModel, formatTimestamp } from './townSquareUtils';

interface TownSquareThreadDetailViewProps {
    currentUserId: string;
    expandedBranchIds: Record<string, boolean>;
    onBack: () => void;
    onDeleteReply: (reply: ReplyTreeNode) => void;
    onDeleteThread: () => void;
    onEditReply: (reply: ReplyTreeNode) => void;
    onEditThread: () => void;
    onExpandBranch: (branchId: string) => void;
    onReplyToThread: () => void;
    onReplyToComment: (reply: ReplyTreeNode) => void;
    onThreadViewed?: (postId: string, replyCount: number) => void;
    replyTree: ReplyTreeNode[];
    selectedThread: ThreadViewModel;
}

const TownSquareThreadDetailView = ({
    currentUserId,
    expandedBranchIds,
    onBack,
    onDeleteReply,
    onDeleteThread,
    onEditReply,
    onEditThread,
    onExpandBranch,
    onReplyToComment,
    onReplyToThread,
    onThreadViewed,
    replyTree,
    selectedThread,
}: TownSquareThreadDetailViewProps) => {
    const isOwnThread = selectedThread.authorUserId === currentUserId;
    const isAnnouncement = selectedThread.postType === 'announcement';

    // Mark thread as read with current reply count when viewed
    useEffect(() => {
        onThreadViewed?.(selectedThread.postId, selectedThread.replyCount);
    }, [selectedThread.postId, selectedThread.replyCount, onThreadViewed]);

    return (
        <Column className='flex-1 px-6 py-6' gap={5}>
            <Pressable onPress={onBack} className='self-start py-1'>
                <Row className='items-center gap-2'>
                    <ChevronLeft size={20} color='rgb(46, 41, 37)' />
                    <PoppinsText weight='medium'>Town Square</PoppinsText>
                </Row>
            </Pressable>

            <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                <ScrollView className='flex-1'>
                    <Column gap={7}>
                        <Column gap={4}>
                            <Row className='items-start gap-4'>
                                <TownSquareAuthorAvatar gameId={selectedThread.gameId} size={60} userId={selectedThread.authorUserId} />
                                <Column className='flex-1' gap={1}>
                                    <PoppinsText weight='bold' className='text-4xl leading-10'>{selectedThread.titleResolved}</PoppinsText>
                                    <TownSquareAuthorName gameId={selectedThread.gameId} userId={selectedThread.authorUserId} />
                                    <PoppinsText varient='subtext'>{formatTimestamp(selectedThread.createdAt)}</PoppinsText>
                                </Column>
                            </Row>

                            <MarkdownRenderer markdown={selectedThread.bodyMarkdownResolved} />

                            <Row className='items-center justify-between gap-3 border-b border-border/20 pb-4'>
                                {isAnnouncement ? (
                                    <PoppinsText weight='medium' className='text-accent'>Announcement</PoppinsText>
                                ) : (
                                    <PoppinsText varient='subtext'>{`${selectedThread.replyCount} repl${selectedThread.replyCount === 1 ? 'y' : 'ies'}`}</PoppinsText>
                                )}
                                <Row className='items-center gap-3'>
                                    {isOwnThread ? (
                                        <>
                                            <Pressable onPress={onEditThread}>
                                                <PoppinsText weight='medium' className='text-accent'>Edit</PoppinsText>
                                            </Pressable>
                                            <Pressable onPress={onDeleteThread}>
                                                <PoppinsText weight='medium' className='text-red-500'>Delete</PoppinsText>
                                            </Pressable>
                                        </>
                                    ) : null}
                                    {!isAnnouncement && (
                                        <AppButton variant='outline' className='w-36' onPress={onReplyToThread}>
                                            <PoppinsText weight='medium'>Reply</PoppinsText>
                                        </AppButton>
                                    )}
                                </Row>
                            </Row>
                        </Column>

                        {!isAnnouncement && (
                            <Column gap={4}>
                                <Row className='items-center justify-between'>
                                    <PoppinsText weight='medium' className='text-2xl'>Replies</PoppinsText>
                                </Row>

                                {replyTree.length > 0 ? (
                                    <TownSquareReplyBranch
                                        currentUserId={currentUserId}
                                        depth={0}
                                        expandedBranchIds={expandedBranchIds}
                                        onDeleteReply={onDeleteReply}
                                        onEditReply={onEditReply}
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
                        )}
                    </Column>
                </ScrollView>
            </ScrollShadow>
        </Column>
    );
};

export default TownSquareThreadDetailView;
