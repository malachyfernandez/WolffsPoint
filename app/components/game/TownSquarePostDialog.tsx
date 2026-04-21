import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserListSet } from '../../../hooks/useUserListSet';
import { PlayerProfile, TownSquareComment, TownSquarePost } from '../../../types/multiplayer';
import { createClientId, getGameScopedKey } from '../../../utils/multiplayer';
import ConvexDialog from '../ui/dialog/ConvexDialog';
import DialogHeader from '../ui/dialog/DialogHeader';
import Column from '../layout/Column';
import Row from '../layout/Row';
import FontText from '../ui/text/FontText';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import AppButton from '../ui/buttons/AppButton';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import { TownSquareAuthorAvatar, TownSquareAuthorName } from './townSquare/TownSquareAuthorIdentity';

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
                        <ConvexDialog.Close iconProps={{ color: 'rgb(246, 238, 219)' }} className="w-10 h-10 bg-text-inverted/10 hover:bg-text-inverted/15 rounded-full absolute right-0 top-0 z-10" />
                        <DialogHeader text='Town Square Thread' />
                        <ScrollView className='p-4'>
                            <Column className='gap-4'>
                                <Row className='gap-4 items-center'>
                                    <TownSquareAuthorAvatar gameId={post.gameId} size={48} userId={post.authorUserId} />
                                    <Column className='gap-0'>
                                        <TownSquareAuthorName gameId={post.gameId} userId={post.authorUserId} weight='medium' />
                                        <FontText variant='subtext'>{new Date(post.createdAt).toLocaleString()}</FontText>
                                    </Column>
                                </Row>
                                <Column className='gap-4 rounded-xl border border-subtle-border bg-white p-4'>
                                    <MarkdownRenderer markdown={post.markdown} />
                                </Column>
                                <Row className='gap-4 justify-between items-center'>
                                    <FontText weight='medium'>Comments</FontText>
                                    <AppButton variant='accent' className='w-40' onPress={() => setIsCommentDialogOpen(true)}>
                                        <FontText weight='medium' color='white'>Add comment</FontText>
                                    </AppButton>
                                </Row>
                                <Column className='gap-3'>
                                    {sortedComments.length > 0 ? sortedComments.map((comment) => (
                                        <Row key={comment.value.commentId} className='gap-4 items-start rounded-xl border border-subtle-border bg-white p-3'>
                                            <TownSquareAuthorAvatar gameId={comment.value.gameId} size={40} userId={comment.value.authorUserId} />
                                            <Column className='gap-1 flex-1'>
                                                <Row className='gap-4 justify-between'>
                                                    <TownSquareAuthorName gameId={comment.value.gameId} userId={comment.value.authorUserId} weight='medium' />
                                                    <FontText variant='subtext'>{new Date(comment.value.createdAt).toLocaleString()}</FontText>
                                                </Row>
                                                <MarkdownRenderer markdown={comment.value.markdown} />
                                            </Column>
                                        </Row>
                                    )) : (
                                        <FontText variant='subtext'>No comments yet.</FontText>
                                    )}
                                </Column>
                            </Column>
                        </ScrollView>
                    </ConvexDialog.Content>
                </ConvexDialog.Portal>
            </ConvexDialog.Root>
            <MarkdownEditorDialog
                isOpen={isCommentDialogOpen}
                onOpenChange={setIsCommentDialogOpen}
                title='Add comment'
                submitLabel='Post comment'
                requireMarkdown={true}
                onSubmit={({ markdown, plainText }) => {
                    const commentId = createClientId('comment');
                    setComment({
                        key: commentKey,
                        itemId: commentId,
                        value: {
                            gameId,
                            postId: post.postId,
                            commentId,
                            authorUserId: currentProfile.userId,
                            markdown,
                            plainText,
                            createdAt: Date.now(),
                        },
                        privacy: 'PUBLIC',
                        filterKey: 'postId',
                        searchKeys: ['plainText', 'markdown'],
                        sortKey: 'createdAt',
                    });
                }}
            />
        </>
    );
};

export default TownSquarePostDialog;
