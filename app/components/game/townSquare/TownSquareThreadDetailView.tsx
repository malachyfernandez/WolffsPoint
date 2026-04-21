import React, { useEffect } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../../ui/buttons/AppButton';
import MarkdownRenderer from '../../ui/markdown/MarkdownRenderer';
import FontText from '../../ui/text/FontText';
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
        <Column className='gap-5 flex-1 px-0 sm:px-4 py-6'>
            <Pressable onPress={onBack} className='self-start py-1'>
                <Row className='gap-4 items-center'>
                    <ChevronLeft size={20} color='rgb(46, 41, 37)' />
                    <FontText weight='medium'>Town Square</FontText>
                </Row>
            </Pressable>

            <ScrollShadow LinearGradientComponent={LinearGradient} className='flex-1'>
                <ScrollView className='flex-1'>
                    <Column className='gap-7'>
                        <Column className='gap-4'>
                            <Row className='sm:hidden w-full items-center'>
                                <TownSquareAuthorAvatar gameId={selectedThread.gameId} size={60} userId={selectedThread.authorUserId} />
                                <Column className='flex-1 gap-2'>
                                    <TownSquareAuthorName gameId={selectedThread.gameId} userId={selectedThread.authorUserId} />
                                    <FontText variant='subtext'>{formatTimestamp(selectedThread.createdAt)}</FontText>
                                </Column>
                            </Row>
                            <Row className='gap-4 items-start'>
                                <TownSquareAuthorAvatar gameId={selectedThread.gameId} size={60} userId={selectedThread.authorUserId} className="hidden sm:flex" />
                                <Column className='gap-4 flex-1'>
                                    <FontText weight='bold' className='text-3xl leading-10'>{selectedThread.titleResolved}</FontText>
                                    <Column className='gap-1 hidden sm:flex'>
                                        <TownSquareAuthorName gameId={selectedThread.gameId} userId={selectedThread.authorUserId} />
                                        <FontText variant='subtext'>{formatTimestamp(selectedThread.createdAt)}</FontText>
                                    </Column>
                                </Column>
                            </Row>

                            <MarkdownRenderer markdown={selectedThread.bodyMarkdownResolved} />

                            <Row className='gap-4 items-center flex-wrap justify-between border-b border-border/20 pb-4'>
                                {isAnnouncement ? (
                                    <FontText weight='medium' className='text-accent'>Announcement</FontText>
                                ) : (
                                    <FontText variant='subtext'>{`${selectedThread.replyCount} repl${selectedThread.replyCount === 1 ? 'y' : 'ies'}`}</FontText>
                                )}
                                <Row className='gap-4 items-center'>
                                    {isOwnThread ? (
                                        <>
                                            <Pressable onPress={onEditThread}>
                                                <FontText weight='bold' className='text-accent'>Edit</FontText>
                                            </Pressable>
                                            <Pressable onPress={onDeleteThread}>
                                                <FontText weight='bold' className='text-red-500'>Delete</FontText>
                                            </Pressable>
                                        </>
                                    ) : null}
                                    {!isAnnouncement && (
                                        <AppButton variant='outline' className='w-20 sm:w-36' onPress={onReplyToThread}>
                                            <FontText weight='bold'>Reply</FontText>
                                        </AppButton>
                                    )}
                                </Row>
                            </Row>
                        </Column>

                        {!isAnnouncement && (
                            <Column className='gap-6'>
                                <Row className='gap-4 items-center justify-between'>
                                    <FontText weight='medium' className='text-2xl'>Replies</FontText>
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
                                    <Column className='gap-1 py-8'>
                                        <FontText weight='medium'>No replies yet</FontText>
                                        <FontText variant='subtext'>Be the first person to answer this thread.</FontText>
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
