import { useMemo } from 'react';
import { useUserListGet } from '../../../../hooks/useUserListGet';
import { useUserListRemove } from '../../../../hooks/useUserListRemove';
import { useUserListSet } from '../../../../hooks/useUserListSet';
import { useUndoRedo, createUndoSnapshot } from '../../../../hooks/useUndoRedo';
import { useUserVariable } from '../../../../hooks/useUserVariable';
import { PlayerProfile, TownSquareComment, TownSquarePost } from '../../../../types/multiplayer';
import { createClientId, getGameScopedKey } from '../../../../utils/multiplayer';
import {
    ComposerSubmitPayload,
    ReplyViewModel,
    buildReplyTree,
    getCommentBodyMarkdown,
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

    const [readState, setReadState] = useUserVariable<Record<string, number>>({
        defaultValue: {},
        key: readStateKey,
    });

    const replies = useMemo(() => {
        return [...(comments ?? [])]
            .map((record) => {
                const comment = record.value;
                const bodyMarkdownResolved = getCommentBodyMarkdown(comment);
                const plainTextResolved = comment.plainText?.trim() || stripMarkdownSyntax(bodyMarkdownResolved);

                return {
                    ...comment,
                    bodyMarkdownResolved,
                    plainTextResolved,
                } satisfies ReplyViewModel;
            })
            .sort((left, right) => left.createdAt - right.createdAt);
    }, [comments]);

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
                    bodyMarkdownResolved,
                    isUnread,
                    latestActivityAt: latestReplyAt,
                    previewText: truncateText(plainText, 120),
                    replyCount: matchingReplies.length,
                    titleResolved: post.title?.trim() || truncateText(plainText || 'Untitled thread', 56),
                };
            })
            .sort((left, right) => right.latestActivityAt - left.latestActivityAt);
    }, [posts, readState.value, replies]);

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
                    searchKeys: ['title', 'plainText', 'markdown'],
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
                    searchKeys: ['plainText', 'markdown'],
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

    const updateThread = ({ markdown, plainText, postId, title }: ComposerSubmitPayload & { postId: string }) => {
        const existingPost = posts?.find((record) => record.value.postId === postId)?.value;

        if (!existingPost) {
            return;
        }

        setPost({
            itemId: postId,
            key: postKey,
            overwriteStoredConfig: true,
            privacy: 'PUBLIC',
            searchKeys: ['title', 'plainText', 'markdown'],
            sortKey: 'createdAt',
            value: {
                ...existingPost,
                bodyMarkdown: markdown,
                markdown,
                plainText,
                title,
            },
        });
    };

    const updateReply = ({ commentId, markdown, plainText }: { commentId: string; markdown: string; plainText: string }) => {
        const existingComment = comments?.find((record) => record.value.commentId === commentId)?.value;

        if (!existingComment) {
            return;
        }

        setComment({
            filterKey: 'postId',
            itemId: commentId,
            key: commentKey,
            overwriteStoredConfig: true,
            privacy: 'PUBLIC',
            searchKeys: ['plainText', 'markdown'],
            sortKey: 'createdAt',
            value: {
                ...existingComment,
                markdown,
                plainText,
            },
        });
    };

    const getReplyCascadeIds = (commentId: string) => {
        const childrenByParentId = (comments ?? []).reduce<Record<string, string[]>>((accumulator, record) => {
            const parentId = record.value.parentCommentId;

            if (!parentId) {
                return accumulator;
            }

            if (!accumulator[parentId]) {
                accumulator[parentId] = [];
            }

            accumulator[parentId].push(record.value.commentId);
            return accumulator;
        }, {});

        const idsToDelete = new Set<string>();
        const queue = [commentId];

        while (queue.length > 0) {
            const currentId = queue.shift();

            if (!currentId || idsToDelete.has(currentId)) {
                continue;
            }

            idsToDelete.add(currentId);
            (childrenByParentId[currentId] ?? []).forEach((childId) => queue.push(childId));
        }

        return Array.from(idsToDelete);
    };

    const deleteThread = (postId: string) => {
        const postRecord = posts?.find((record) => record.value.postId === postId);
        const commentRecords = (comments ?? []).filter((record) => record.value.postId === postId);

        if (!postRecord) {
            return;
        }

        executeCommand({
            action: () => {
                removeUserListItem({
                    itemId: postId,
                    key: postKey,
                });

                commentRecords.forEach((record) => {
                    removeUserListItem({
                        itemId: record.value.commentId,
                        key: commentKey,
                    });
                });
            },
            description: 'Delete Town Square Thread',
            undoAction: () => {
                setPost({
                    itemId: postRecord.value.postId,
                    key: postKey,
                    overwriteStoredConfig: true,
                    privacy: 'PUBLIC',
                    searchKeys: ['title', 'plainText', 'markdown'],
                    sortKey: 'createdAt',
                    value: postRecord.value,
                });

                commentRecords.forEach((record) => {
                    setComment({
                        filterKey: 'postId',
                        itemId: record.value.commentId,
                        key: commentKey,
                        overwriteStoredConfig: true,
                        privacy: 'PUBLIC',
                        searchKeys: ['plainText', 'markdown'],
                        sortKey: 'createdAt',
                        value: record.value,
                    });
                });
            },
        });
    };

    const deleteReply = (commentId: string) => {
        const replyIdsToDelete = getReplyCascadeIds(commentId);
        const commentRecords = (comments ?? []).filter((record) => replyIdsToDelete.includes(record.value.commentId));

        if (commentRecords.length === 0) {
            return;
        }

        executeCommand({
            action: () => {
                commentRecords.forEach((record) => {
                    removeUserListItem({
                        itemId: record.value.commentId,
                        key: commentKey,
                    });
                });
            },
            description: 'Delete Town Square Reply',
            undoAction: () => {
                commentRecords.forEach((record) => {
                    setComment({
                        filterKey: 'postId',
                        itemId: record.value.commentId,
                        key: commentKey,
                        overwriteStoredConfig: true,
                        privacy: 'PUBLIC',
                        searchKeys: ['plainText', 'markdown'],
                        sortKey: 'createdAt',
                        value: record.value,
                    });
                });
            },
        });
    };

    return {
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
    };
};
