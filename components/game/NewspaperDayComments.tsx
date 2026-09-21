import React, { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Plus } from 'lucide-react-native';
import Column from '../layout/Column';
import Row from '../layout/Row';
import AppButton from '../ui/buttons/AppButton';
import FontText from '../ui/text/FontText';
import MarkdownEditorDialog from './MarkdownEditorDialog';
import TownSquareReplyBranch from './townSquare/TownSquareReplyBranch';
import { useTownSquareAuthorIdentity } from './townSquare/TownSquareAuthorIdentity';
import {
  ReplyViewModel,
  buildReplyTree,
  getCommentBodyMarkdown,
  stripMarkdownSyntax,
  truncateText,
} from './townSquare/townSquareUtils';
import { usePlayerStatus } from 'contexts/PlayerStatusContext';
import { useCanEditScripts } from 'hooks/useCanEditScripts';
import { useFindListItems, useListRemove, useListSet, useValue } from 'hooks/useData';
import { useUndoRedo } from 'hooks/useUndoRedo';
import { TownSquareComment } from 'types/multiplayer';
import { createClientId, getGameScopedKey } from 'utils/multiplayer';
import { getNewspaperDayItemId } from 'utils/newspaperControl';

interface NewspaperDayCommentsProps {
  gameId: string;
  dayIndex: number;
}

/**
 * Per-day comment section rendered below a newspaper day. Reuses the Town
 * Square reply system (TownSquareComment records, buildReplyTree,
 * TownSquareReplyBranch, MarkdownEditorDialog) but stores comments under a
 * newspaper-scoped list key with the day's newspaper itemId as the postId, so
 * each day gets one flat top-level reply list with nested replies — identical
 * to the replies section inside a Town Square thread.
 */
const NewspaperDayComments = ({ gameId, dayIndex }: NewspaperDayCommentsProps) => {
  const { isPlayerDead } = usePlayerStatus();
  const { width } = useWindowDimensions();
  const showCommentsTitle = width >= 440;
  const [userData] = useValue<{ userId?: string }>('userData');
  const currentUserId = userData.value.userId ?? '';
  const canEditScripts = useCanEditScripts(gameId, currentUserId);
  const { executeCommand } = useUndoRedo();
  const setComment = useListSet<TownSquareComment>();
  const removeUserListItem = useListRemove();
  const commentKey = getGameScopedKey('newspaperDayComments', gameId);
  const postId = getNewspaperDayItemId(gameId, dayIndex);

  const [isReplyComposerOpen, setIsReplyComposerOpen] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyTargetCommentId, setReplyTargetCommentId] = useState<string | null>(null);
  const [expandedBranchIds, setExpandedBranchIds] = useState<Record<string, boolean>>({});

  const comments = useFindListItems<TownSquareComment>(commentKey, {
    filterFor: postId,
    returnTop: 500,
  });

  const replies = useMemo(() => {
    return [...(comments ?? [])]
      .map((record) => {
        const comment = record.value;
        const bodyMarkdownResolved = getCommentBodyMarkdown(comment);
        const plainTextResolved =
          comment.plainText?.trim() || stripMarkdownSyntax(bodyMarkdownResolved);

        return {
          ...comment,
          bodyMarkdownResolved,
          plainTextResolved,
        } satisfies ReplyViewModel;
      })
      .sort((left, right) => left.createdAt - right.createdAt);
  }, [comments]);

  const replyTree = useMemo(() => buildReplyTree(replies), [replies]);

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
    userId: selectedReplyTarget?.authorUserId ?? currentUserId,
  });

  const replyTargetLabel = selectedReplyTarget
    ? `Replying to ${selectedReplyAuthor.displayName}: “${truncateText(selectedReplyTarget.plainTextResolved, 80)}”`
    : `Replying to the Day ${dayIndex + 1} newspaper`;

  const createReply = ({
    markdown,
    plainText,
    parentCommentId,
  }: {
    markdown: string;
    parentCommentId?: string;
    plainText: string;
  }) => {
    const commentId = createClientId('comment');
    const commentValue: TownSquareComment = {
      authorUserId: currentUserId,
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
      },
      description: 'Create Newspaper Comment',
      undoAction: () => {
        removeUserListItem({
          itemId: commentId,
          key: commentKey,
        });
      },
    });
  };

  const updateReply = ({
    commentId,
    markdown,
    plainText,
  }: {
    commentId: string;
    markdown: string;
    plainText: string;
  }) => {
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
    const childrenByParentId = (comments ?? []).reduce<Record<string, string[]>>(
      (accumulator, record) => {
        const parentId = record.value.parentCommentId;

        if (!parentId) {
          return accumulator;
        }

        if (!accumulator[parentId]) {
          accumulator[parentId] = [];
        }

        accumulator[parentId].push(record.value.commentId);
        return accumulator;
      },
      {}
    );

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

  const deleteReply = (commentId: string) => {
    const replyIdsToDelete = getReplyCascadeIds(commentId);
    const commentRecords = (comments ?? []).filter((record) =>
      replyIdsToDelete.includes(record.value.commentId)
    );

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
      description: 'Delete Newspaper Comment',
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

  return (
    <Column className="w-full gap-0 pt-6">
      <View className="border-border/20 mb-6 w-full border-t" />

      <Column className="gap-6">
        <Row className="items-center justify-between gap-4">
          {showCommentsTitle && (
            <FontText weight="bold" className="text-2xl uppercase tracking-widest">
              Comments
            </FontText>
          )}
          {!isPlayerDead && (
            <AppButton
              variant="accent"
              className={`whitespace-nowrap ${showCommentsTitle ? '' : 'w-full'}`}
              onPress={() => {
                setReplyTargetCommentId(null);
                setIsReplyComposerOpen(true);
              }}>
              <Row className="items-center gap-2">
                <Plus size={20} color="white" />
                <FontText weight="medium" color="white">
                  Add comment
                </FontText>
              </Row>
            </AppButton>
          )}
        </Row>

        {replyTree.length > 0 ? (
          <TownSquareReplyBranch
            currentUserId={currentUserId}
            depth={0}
            expandedBranchIds={expandedBranchIds}
            isPlayerDead={isPlayerDead}
            nodes={replyTree}
            onDeleteReply={(reply) => {
              deleteReply(reply.commentId);
              if (replyTargetCommentId === reply.commentId) {
                setReplyTargetCommentId(null);
              }
              if (editingReplyId === reply.commentId) {
                setEditingReplyId(null);
              }
            }}
            onEditReply={(reply) => {
              setEditingReplyId(reply.commentId);
            }}
            onExpandBranch={(branchId) =>
              setExpandedBranchIds((currentValue) => ({
                ...currentValue,
                [branchId]: true,
              }))
            }
            onReply={(reply) => {
              setReplyTargetCommentId(reply.commentId);
              setIsReplyComposerOpen(true);
            }}
          />
        ) : (
          <Column className="gap-1 py-8">
            <FontText weight="medium">No comments yet</FontText>
            <FontText variant="subtext">Be the first person to share a comment.</FontText>
          </Column>
        )}
      </Column>

      {!isPlayerDead && (
        <>
          <MarkdownEditorDialog
            isOpen={isReplyComposerOpen}
            onOpenChange={setIsReplyComposerOpen}
            dialogSubtext={replyTargetLabel}
            requireMarkdown={true}
            onSubmit={({ markdown, plainText }) => {
              createReply({
                markdown,
                parentCommentId: replyTargetCommentId ?? undefined,
                plainText,
              });

              if (replyTargetCommentId) {
                setExpandedBranchIds((currentValue) => ({
                  ...currentValue,
                  [replyTargetCommentId]: true,
                }));
              }

              setReplyTargetCommentId(null);
            }}
            title="Write comment"
            gameId={gameId}
            showScript={canEditScripts}
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
            title="Edit comment"
            gameId={gameId}
            showScript={canEditScripts}
            historyKey={`newspaperDayComment:${gameId}:${editingReply?.commentId ?? ''}`}
            onRestore={() => setEditingReplyId(editingReplyId)}
          />
        </>
      )}
    </Column>
  );
};

export default NewspaperDayComments;
