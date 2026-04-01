import React, { useMemo, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserListSet } from '../../../hooks/useUserListSet';
import { TownSquareComment, TownSquarePost } from '../../../types/multiplayer';
import { createClientId, getGameScopedKey } from '../../../utils/multiplayer';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import AppButton from '../ui/buttons/AppButton';
import MarkdownComposerDialog from './MarkdownComposerDialog';
import { PlayerProfile } from '../../../types/multiplayer';

interface TownSquarePostDialogProps {
    gameId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    post: TownSquarePost | null;
    currentProfile: PlayerProfile;
}

const TownSquarePostDialog = ({ gameId, isOpen, onOpenChange, post, currentProfile }: TownSquarePostDialogProps) => {
    const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
    const setComment = useUserListSet<TownSquareComment>();
    const commentKey = getGameScopedKey('townSquareComments', gameId);
    const comments = useUserListGet<TownSquareComment>({
        key: commentKey,
        filterFor: post?.postId,
        returnTop: 200,
    });

    const sortedComments = useMemo(() => {
        return [...(comments ?? [])].sort((left, right) => (left.value.createdAt ?? 0) - (right.value.createdAt ?? 0));
    }, [comments]);

    if (!post) {
        return null;
    }

    return (
        <>
            <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
                <ConvexDialog.Trigger asChild>
                    <View />
                </ConvexDialog.Trigger>
                <ConvexDialog.Portal>
                    <ConvexDialog.Overlay />
                    <ConvexDialog.Content className='p-1 h-[85vh] max-w-4xl'>
                        <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-accent-hover absolute right-4 top-4 z-10" />
                        <DialogHeader text='Town Square Thread' />
                        <ScrollView className='p-4'>
                            <Column gap={4}>
                                <Row className='items-center gap-3'>
                                    {post.authorImageUrl ? (
                                        <Image source={{ uri: post.authorImageUrl }} className='w-12 h-12 rounded-full border border-subtle-border bg-white' />
                                    ) : (
                                        <View className='w-12 h-12 rounded-full border border-subtle-border bg-white items-center justify-center'>
                                            <PoppinsText weight='medium'>{post.authorInGameName.slice(0, 1).toUpperCase()}</PoppinsText>
                                        </View>
                                    )}
                                    <Column gap={0}>
                                        <PoppinsText weight='medium'>{post.authorInGameName}</PoppinsText>
                                        <PoppinsText varient='subtext'>{new Date(post.createdAt).toLocaleString()}</PoppinsText>
                                    </Column>
                                </Row>
                                <Column className='rounded-xl border border-subtle-border bg-white p-4'>
                                    <MarkdownRenderer markdown={post.markdown} />
                                </Column>
                                <Row className='justify-between items-center'>
                                    <PoppinsText weight='medium'>Comments</PoppinsText>
                                    <AppButton variant='black' className='w-40' onPress={() => setIsCommentDialogOpen(true)}>
                                        <PoppinsText weight='medium' color='white'>Add comment</PoppinsText>
                                    </AppButton>
                                </Row>
                                <Column gap={3}>
                                    {sortedComments.length > 0 ? sortedComments.map((comment) => (
                                        <Row key={comment.value.commentId} className='items-start gap-3 rounded-xl border border-subtle-border bg-white p-3'>
                                            {comment.value.authorImageUrl ? (
                                                <Image source={{ uri: comment.value.authorImageUrl }} className='w-10 h-10 rounded-full border border-subtle-border bg-white' />
                                            ) : (
                                                <View className='w-10 h-10 rounded-full border border-subtle-border bg-white items-center justify-center'>
                                                    <PoppinsText weight='medium'>{comment.value.authorInGameName.slice(0, 1).toUpperCase()}</PoppinsText>
                                                </View>
                                            )}
                                            <Column className='flex-1' gap={1}>
                                                <Row className='justify-between'>
                                                    <PoppinsText weight='medium'>{comment.value.authorInGameName}</PoppinsText>
                                                    <PoppinsText varient='subtext'>{new Date(comment.value.createdAt).toLocaleString()}</PoppinsText>
                                                </Row>
                                                <MarkdownRenderer markdown={comment.value.markdown} />
                                            </Column>
                                        </Row>
                                    )) : (
                                        <PoppinsText varient='subtext'>No comments yet.</PoppinsText>
                                    )}
                                </Column>
                            </Column>
                        </ScrollView>
                    </ConvexDialog.Content>
                </ConvexDialog.Portal>
            </ConvexDialog.Root>
            <MarkdownComposerDialog
                isOpen={isCommentDialogOpen}
                onOpenChange={setIsCommentDialogOpen}
                title='Add comment'
                submitLabel='Post comment'
                onSubmit={(markdown) => {
                    const commentId = createClientId('comment');
                    setComment({
                        key: commentKey,
                        itemId: commentId,
                        value: {
                            gameId,
                            postId: post.postId,
                            commentId,
                            authorUserId: currentProfile.userId,
                            authorInGameName: currentProfile.inGameName,
                            authorImageUrl: currentProfile.profileImageUrl,
                            markdown,
                            createdAt: Date.now(),
                        },
                        privacy: 'PUBLIC',
                        filterKey: 'postId',
                        searchKeys: ['markdown', 'authorInGameName'],
                        sortKey: 'createdAt',
                    });
                }}
            />
        </>
    );
};

export default TownSquarePostDialog;
