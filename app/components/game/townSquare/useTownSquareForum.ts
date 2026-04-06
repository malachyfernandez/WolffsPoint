import { useMemo } from 'react';
import { useUserListGet } from '../../../../hooks/useUserListGet';
import { useUserListRemove } from '../../../../hooks/useUserListRemove';
import { useUserListSet } from '../../../../hooks/useUserListSet';
import { useSharedListValue } from '../../../../hooks/useSharedListValue';
import { useUndoRedo, createUndoSnapshot } from '../../../../hooks/useUndoRedo';
import { useUserVariable } from '../../../../hooks/useUserVariable';
import { PlayerProfile, TownSquareComment, TownSquarePost } from '../../../../types/multiplayer';
import { UserTableItem } from '../../../../types/playerTable';
import { createClientId, getGameScopedKey } from '../../../../utils/multiplayer';
import {
    ComposerSubmitPayload,
    ReplyViewModel,
    buildReplyTree,
    getCommentBodyMarkdown,
    getDisplayName,
    getPostBodyMarkdown,
    stripMarkdownSyntax,
    truncateText,
} from './townSquareUtils';

interface UseTownSquareForumParams {
    currentProfile: PlayerProfile;
    gameId: string;
    selectedPostId: string;
}

export const useTownSquareForum = ({ currentProfile, gameId, selectedPostId }: UseTownSquareForumParams) => {
    const { executeCommand } = useUndoRedo();
    const setPost = useUserListSet<TownSquarePost>();
    const setComment = useUserListSet<TownSquareComment>();
    const removeUserListItem = useUserListRemove();
    const postKey = getGameScopedKey('townSquarePosts', gameId);
    const commentKey = getGameScopedKey('townSquareComments', gameId);
    const readStateKey = getGameScopedKey('townSquareReadState', gameId);

    const posts = useUserListGet<TownSquarePost>({
        key: postKey,
        returnTop: 200,
    });

    const comments = useUserListGet<TownSquareComment>({
        key: commentKey,
        returnTop: 500,
    });

    const { value: userTable } = useSharedListValue<UserTableItem[]>({
        defaultValue: [],
        itemId: gameId,
        key: 'userTable',
    });

    const [readState, setReadState] = useUserVariable<Record<string, number>>({
        defaultValue: {},
        key: readStateKey,
    });

    const realNameByUserId = useMemo(() => {
        return userTable.reduce<Record<string, string>>((accumulator, user) => {
            if (user.userId !== 'NOT-JOINED') {
                accumulator[user.userId] = user.realName;
            }

            return accumulator;
        }, {});
    }, [userTable]);

    const replies = useMemo(() => {
        return [...(comments ?? [])]
            .map((record) => {
                const comment = record.value;
                const bodyMarkdownResolved = getCommentBodyMarkdown(comment);
                const plainTextResolved = comment.plainText?.trim() || stripMarkdownSyntax(bodyMarkdownResolved);

                return {
                    ...comment,
                    authorDisplayName: getDisplayName(comment.authorInGameName, realNameByUserId[comment.authorUserId]),
                    bodyMarkdownResolved,
                    plainTextResolved,
                } satisfies ReplyViewModel;
            })
            .sort((left, right) => left.createdAt - right.createdAt);
    }, [comments, realNameByUserId]);

    const threads = useMemo(() => {
        return [...(posts ?? [])]
            .map((record) => {
                const post = record.value;
                const bodyMarkdownResolved = getPostBodyMarkdown(post);
                const plainText = post.plainText?.trim() || stripMarkdownSyntax(bodyMarkdownResolved);
                const matchingReplies = replies.filter((reply) => reply.postId === post.postId);
                const latestReplyAt = matchingReplies.reduce((maxValue, reply) => Math.max(maxValue, reply.createdAt), post.createdAt);
                const readAt = readState.value[post.postId] ?? 0;
                const isUnread = matchingReplies.some((reply) => reply.createdAt > readAt);

                return {
                    ...post,
                    authorDisplayName: getDisplayName(post.authorInGameName, realNameByUserId[post.authorUserId]),
                    bodyMarkdownResolved,
                    isUnread,
                    latestActivityAt: latestReplyAt,
                    previewText: truncateText(plainText, 120),
                    replyCount: matchingReplies.length,
                    titleResolved: post.title?.trim() || truncateText(plainText || 'Untitled thread', 56),
                };
            })
            .sort((left, right) => right.latestActivityAt - left.latestActivityAt);
    }, [posts, readState.value, realNameByUserId, replies]);

    const selectedThread = useMemo(() => {
        return threads.find((thread) => thread.postId === selectedPostId) ?? null;
    }, [selectedPostId, threads]);

    const selectedThreadReplies = useMemo(() => {
        if (!selectedThread) {
            return [];
        }

        return replies.filter((reply) => reply.postId === selectedThread.postId);
    }, [replies, selectedThread]);

    const selectedThreadReplyTree = useMemo(() => {
        return buildReplyTree(selectedThreadReplies);
    }, [selectedThreadReplies]);

    const markThreadRead = (postId: string) => {
        setReadState({
            ...readState.value,
            [postId]: Date.now(),
        });
    };

    const createThread = ({ markdown, plainText, title }: ComposerSubmitPayload) => {
        const postId = createClientId('post');
        const postValue: TownSquarePost = {
            authorImageUrl: currentProfile.profileImageUrl,
            authorInGameName: currentProfile.inGameName,
            authorUserId: currentProfile.userId,
            bodyMarkdown: markdown,
            createdAt: Date.now(),
            gameId,
            markdown,
            plainText,
            postId,
            title,
        };

        executeCommand({
            action: () => {
                setPost({
                    itemId: postId,
                    key: postKey,
                    privacy: 'PUBLIC',
                    searchKeys: ['title', 'plainText', 'markdown', 'authorInGameName'],
                    sortKey: 'createdAt',
                    value: postValue,
                });
            },
            description: 'Create Town Square Thread',
            undoAction: () => {
                removeUserListItem({
                    itemId: postId,
                    key: postKey,
                });
            },
        });
    };

    const createReply = ({
        markdown,
        plainText,
        parentCommentId,
        postId,
    }: {
        markdown: string;
        parentCommentId?: string;
        plainText: string;
        postId: string;
    }) => {
        const commentId = createClientId('comment');
        const previousReadState = createUndoSnapshot(readState.value);
        const nextReadState = createUndoSnapshot({
            ...previousReadState,
            [postId]: Date.now(),
        });
        const commentValue: TownSquareComment = {
            authorImageUrl: currentProfile.profileImageUrl,
            authorInGameName: currentProfile.inGameName,
            authorUserId: currentProfile.userId,
            commentId,
            createdAt: Date.now(),
            gameId,
            markdown,
            parentCommentId,
            plainText,
            postId,
            replyToCommentId: parentCommentId,
        };

        executeCommand({
            action: () => {
                setComment({
                    filterKey: 'postId',
                    itemId: commentId,
                    key: commentKey,
                    overwriteStoredConfig: true,
                    privacy: 'PUBLIC',
                    searchKeys: ['plainText', 'markdown', 'authorInGameName'],
                    sortKey: 'createdAt',
                    value: commentValue,
                });
                setReadState(createUndoSnapshot(nextReadState));
            },
            description: 'Create Town Square Reply',
            undoAction: () => {
                removeUserListItem({
                    itemId: commentId,
                    key: commentKey,
                });
                setReadState(createUndoSnapshot(previousReadState));
            },
        });
    };

    return {
        createReply,
        createThread,
        markThreadRead,
        replies,
        selectedThread,
        selectedThreadReplyTree,
        threads,
    };
};
