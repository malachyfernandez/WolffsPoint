import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import Column from '../layout/Column';
import { PlayerProfile } from '../../../types/multiplayer';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import TownSquareThreadDetailView from './townSquare/TownSquareThreadDetailView';
import TownSquareThreadListView from './townSquare/TownSquareThreadListView';
import { truncateText } from './townSquare/townSquareUtils';
import { useTownSquareForum } from './townSquare/useTownSquareForum';

interface TownSquarePagePLAYERProps {
    gameId: string;
    currentProfile: PlayerProfile;
}

type TownSquareScreenState = 'list' | 'thread';

const TownSquarePagePLAYER = ({ gameId, currentProfile }: TownSquarePagePLAYERProps) => {
    const [isThreadComposerOpen, setIsThreadComposerOpen] = useState(false);
    const [isThreadEditComposerOpen, setIsThreadEditComposerOpen] = useState(false);
    const [isReplyComposerOpen, setIsReplyComposerOpen] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState('');
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [replyTargetCommentId, setReplyTargetCommentId] = useState<string | null>(null);
    const [threadListScrollY, setThreadListScrollY] = useState(0);
    const [expandedBranchIds, setExpandedBranchIds] = useState<Record<string, boolean>>({});

    const listScrollRef = useRef<ScrollView | null>(null);
    const {
        createReply,
        createThread,
        deleteReply,
        deleteThread,
        markThreadRead,
        replies,
        selectedThread,
        selectedThreadReplyTree,
        threads,
        updateReply,
        updateThread,
    } = useTownSquareForum({
        currentProfile,
        gameId,
        selectedPostId,
    });

    const activeScreen: TownSquareScreenState = selectedThread ? 'thread' : 'list';

    useEffect(() => {
        if (activeScreen !== 'list') {
            return;
        }

        const timeoutId = setTimeout(() => {
            listScrollRef.current?.scrollTo({ animated: false, y: threadListScrollY });
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [activeScreen, threadListScrollY]);

    const selectedReplyTarget = useMemo(() => {
        if (!replyTargetCommentId) {
            return null;
        }

        return replies.find((reply) => reply.commentId === replyTargetCommentId) ?? null;
    }, [replies, replyTargetCommentId]);

    const editingReply = useMemo(() => {
        if (!editingReplyId) {
            return null;
        }

        return replies.find((reply) => reply.commentId === editingReplyId) ?? null;
    }, [editingReplyId, replies]);

    const selectedReplyAuthor = useTownSquareAuthorIdentity({
        gameId,
        userId: selectedReplyTarget?.authorUserId ?? currentProfile.userId,
    });

    const openThread = (postId: string) => {
        setSelectedPostId(postId);
        setExpandedBranchIds({});
        setEditingReplyId(null);
        setIsThreadEditComposerOpen(false);
        setReplyTargetCommentId(null);
        markThreadRead(postId);
    };

    const closeThread = () => {
        setSelectedPostId('');
        setExpandedBranchIds({});
        setEditingReplyId(null);
        setIsThreadEditComposerOpen(false);
        setReplyTargetCommentId(null);
    };

    const replyTargetLabel = selectedReplyTarget
        ? `Replying to ${selectedReplyAuthor.displayName}: “${truncateText(selectedReplyTarget.plainTextResolved, 80)}”`
        : selectedThread
            ? `Replying inside ${selectedThread.titleResolved}`
            : undefined;

    return (
        <Column className='flex-1 min-h-[760px]' gap={0}>
            <LayoutStateAnimatedView.Container stateVar={activeScreen} className='flex-1'>
                <LayoutStateAnimatedView.Option page={1} stateValue='list'>
                    <TownSquareThreadListView
                        listScrollRef={listScrollRef}
                        onNewThread={() => setIsThreadComposerOpen(true)}
                        onOpenThread={(thread) => openThread(thread.postId)}
                        onScrollYChange={setThreadListScrollY}
                        threads={threads}
                    />
                </LayoutStateAnimatedView.Option>

                <LayoutStateAnimatedView.OptionContainer page={2} pushInAnimation={fromRight}>
                    <LayoutStateAnimatedView.Option stateValue='thread'>
                        {selectedThread ? (
                            <TownSquareThreadDetailView
                                currentUserId={currentProfile.userId}
                                expandedBranchIds={expandedBranchIds}
                                onBack={closeThread}
                                onDeleteReply={(reply) => {
                                    deleteReply(reply.commentId);
                                    if (replyTargetCommentId === reply.commentId) {
                                        setReplyTargetCommentId(null);
                                    }
                                    if (editingReplyId === reply.commentId) {
                                        setEditingReplyId(null);
                                    }
                                }}
                                onDeleteThread={() => {
                                    deleteThread(selectedThread.postId);
                                    closeThread();
                                }}
                                onEditReply={(reply) => {
                                    setEditingReplyId(reply.commentId);
                                }}
                                onEditThread={() => setIsThreadEditComposerOpen(true)}
                                onExpandBranch={(branchId) => setExpandedBranchIds((currentValue) => ({
                                    ...currentValue,
                                    [branchId]: true,
                                }))}
                                onReplyToComment={(reply) => {
                                    setReplyTargetCommentId(reply.commentId);
                                    setIsReplyComposerOpen(true);
                                }}
                                onReplyToThread={() => {
                                    setReplyTargetCommentId(null);
                                    setIsReplyComposerOpen(true);
                                }}
                                replyTree={selectedThreadReplyTree}
                                selectedThread={selectedThread}
                            />
                        ) : (
                            <Column className='flex-1' />
                        )}
                    </LayoutStateAnimatedView.Option>
                </LayoutStateAnimatedView.OptionContainer>
            </LayoutStateAnimatedView.Container>

            <MarkdownEditorDialog
                includeTitle={true}
                isOpen={isThreadComposerOpen}
                onOpenChange={setIsThreadComposerOpen}
                requireMarkdown={true}
                onSubmit={createThread}
                submitLabel='Publish'
                title='Create thread'
            />

            <MarkdownEditorDialog
                includeTitle={true}
                initialMarkdown={selectedThread?.bodyMarkdownResolved ?? ''}
                initialTitle={selectedThread?.title ?? ''}
                isOpen={isThreadEditComposerOpen}
                onOpenChange={setIsThreadEditComposerOpen}
                requireMarkdown={true}
                onSubmit={({ markdown, plainText, title }) => {
                    if (!selectedThread) {
                        return;
                    }

                    updateThread({
                        markdown,
                        plainText,
                        postId: selectedThread.postId,
                        title,
                    });
                }}
                submitLabel='Save changes'
                title='Edit thread'
            />

            <MarkdownEditorDialog
                isOpen={isReplyComposerOpen}
                onOpenChange={setIsReplyComposerOpen}
                dialogSubtext={replyTargetLabel}
                requireMarkdown={true}
                onSubmit={({ markdown, plainText }) => {
                    if (!selectedThread) {
                        return;
                    }

                    createReply({
                        markdown,
                        parentCommentId: replyTargetCommentId ?? undefined,
                        plainText,
                        postId: selectedThread.postId,
                    });

                    if (replyTargetCommentId) {
                        setExpandedBranchIds((currentValue) => ({
                            ...currentValue,
                            [replyTargetCommentId]: true,
                        }));
                    }

                    setReplyTargetCommentId(null);
                }}
                submitLabel='Post reply'
                title='Write reply'
            />

            <MarkdownEditorDialog
                initialMarkdown={editingReply?.bodyMarkdownResolved ?? ''}
                isOpen={editingReply !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingReplyId(null);
                    }
                }}
                requireMarkdown={true}
                onSubmit={({ markdown, plainText }) => {
                    if (!editingReply) {
                        return;
                    }

                    updateReply({
                        commentId: editingReply.commentId,
                        markdown,
                        plainText,
                    });
                    setEditingReplyId(null);
                }}
                submitLabel='Save changes'
                title='Edit reply'
            />
        </Column>
    );
};

export default TownSquarePagePLAYER;
