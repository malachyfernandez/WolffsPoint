import React, { useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useUserListGet } from '../../../hooks/useUserListGet';
import { useUserListSet } from '../../../hooks/useUserListSet';
import { PlayerProfile, TownSquarePost } from '../../../types/multiplayer';
import { createClientId, getGameScopedKey } from '../../../utils/multiplayer';
import Column from '../layout/Column';
import Row from '../layout/Row';
import PoppinsText from '../ui/text/PoppinsText';
import AppButton from '../ui/buttons/AppButton';
import MarkdownRenderer from '../ui/markdown/MarkdownRenderer';
import MarkdownComposerDialog from './MarkdownComposerDialog';
import TownSquarePostDialog from './TownSquarePostDialog';

interface TownSquarePagePLAYERProps {
    gameId: string;
    currentProfile: PlayerProfile;
}

const TownSquarePagePLAYER = ({ gameId, currentProfile }: TownSquarePagePLAYERProps) => {
    const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string>('');
    const setPost = useUserListSet<TownSquarePost>();
    const postKey = getGameScopedKey('townSquarePosts', gameId);
    const posts = useUserListGet<TownSquarePost>({
        key: postKey,
        returnTop: 200,
    });

    const sortedPosts = useMemo(() => {
        return [...(posts ?? [])].sort((left, right) => (right.value.createdAt ?? 0) - (left.value.createdAt ?? 0));
    }, [posts]);

    const selectedPost = sortedPosts.find((post) => post.value.postId === selectedPostId)?.value ?? null;

    return (
        <Column gap={4}>
            <Row className='justify-between items-center'>
                <Column gap={0}>
                    <PoppinsText weight='medium'>Town Square</PoppinsText>
                    <PoppinsText varient='subtext'>Markdown posts and comments for everyone in the game.</PoppinsText>
                </Column>
                <AppButton variant='black' className='w-36' onPress={() => setIsComposeDialogOpen(true)}>
                    <PoppinsText weight='medium' color='white'>New post</PoppinsText>
                </AppButton>
            </Row>
            <Column gap={3}>
                {sortedPosts.length > 0 ? sortedPosts.map((post) => (
                    <Pressable key={post.value.postId} onPress={() => setSelectedPostId(post.value.postId)}>
                        <Column className='rounded-xl border border-subtle-border bg-white p-4' gap={3}>
                            <Row className='items-center gap-3'>
                                {post.value.authorImageUrl ? (
                                    <Image source={{ uri: post.value.authorImageUrl }} className='w-12 h-12 rounded-full border border-subtle-border bg-white' />
                                ) : (
                                    <View className='w-12 h-12 rounded-full border border-subtle-border bg-white items-center justify-center'>
                                        <PoppinsText weight='medium'>{post.value.authorInGameName.slice(0, 1).toUpperCase()}</PoppinsText>
                                    </View>
                                )}
                                <Column gap={0}>
                                    <PoppinsText weight='medium'>{post.value.authorInGameName}</PoppinsText>
                                    <PoppinsText varient='subtext'>{new Date(post.value.createdAt).toLocaleString()}</PoppinsText>
                                </Column>
                            </Row>
                            <MarkdownRenderer markdown={post.value.markdown} />
                        </Column>
                    </Pressable>
                )) : (
                    <Column className='rounded-xl border border-subtle-border bg-white p-4'>
                        <PoppinsText varient='subtext'>No posts yet. Start the conversation.</PoppinsText>
                    </Column>
                )}
            </Column>
            <MarkdownComposerDialog
                isOpen={isComposeDialogOpen}
                onOpenChange={setIsComposeDialogOpen}
                title='New Town Square Post'
                submitLabel='Post'
                onSubmit={(markdown) => {
                    const postId = createClientId('post');
                    setPost({
                        key: postKey,
                        itemId: postId,
                        value: {
                            gameId,
                            postId,
                            authorUserId: currentProfile.userId,
                            authorInGameName: currentProfile.inGameName,
                            authorImageUrl: currentProfile.profileImageUrl,
                            markdown,
                            createdAt: Date.now(),
                        },
                        privacy: 'PUBLIC',
                        searchKeys: ['markdown', 'authorInGameName'],
                        sortKey: 'createdAt',
                    });
                }}
            />
            <TownSquarePostDialog
                gameId={gameId}
                isOpen={selectedPost !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedPostId('');
                    }
                }}
                post={selectedPost}
                currentProfile={currentProfile}
            />
        </Column>
    );
};

export default TownSquarePagePLAYER;
