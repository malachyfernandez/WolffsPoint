import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import LayoutStateAnimatedView, { fromRight } from '../ui/LayoutStateAnimatedView';
import Column from '../layout/Column';
import { PlayerProfile } from '../../../types/multiplayer';
import TownSquareComposerDialog from './townSquare/TownSquareComposerDialog';
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
    const [isReplyComposerOpen, setIsReplyComposerOpen] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState('');
    const [replyTargetCommentId, setReplyTargetCommentId] = useState<string | null>(null);
    const [threadListScrollY, setThreadListScrollY] = useState(0);
    const [expandedBranchIds, setExpandedBranchIds] = useState<Record<string, boolean>>({});

    const listScrollRef = useRef<ScrollView | null>(null);
    const {
        createReply,
        createThread,
        markThreadRead,
        replies,
        selectedThread,
        selectedThreadReplyTree,
        threads,
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

    const openThread = (postId: string) => {
        setSelectedPostId(postId);
        setExpandedBranchIds({});
        setReplyTargetCommentId(null);
        markThreadRead(postId);
    };

    const closeThread = () => {
        setSelectedPostId('');
        setExpandedBranchIds({});
        setReplyTargetCommentId(null);
    };

    const replyTargetLabel = selectedReplyTarget
        ? `Replying to ${selectedReplyTarget.authorDisplayName}: “${truncateText(selectedReplyTarget.plainTextResolved, 80)}”`
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
                                expandedBranchIds={expandedBranchIds}
                                onBack={closeThread}
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

            <TownSquareComposerDialog
                includeTitle={true}
                isOpen={isThreadComposerOpen}
                onOpenChange={setIsThreadComposerOpen}
                onSubmit={createThread}
                submitLabel='Publish'
                title='Create thread'
            />

            <TownSquareComposerDialog
                includeTitle={false}
                isOpen={isReplyComposerOpen}
                onOpenChange={setIsReplyComposerOpen}
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
                targetLabel={replyTargetLabel}
                title='Write reply'
            />
        </Column>
    );
};

export default TownSquarePagePLAYER;
