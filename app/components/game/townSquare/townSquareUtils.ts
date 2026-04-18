import { TownSquareComment, TownSquarePost } from '../../../../types/multiplayer';

export type SelectionRange = {
    start: number;
    end: number;
};

export type ComposerSubmitPayload = {
    title?: string;
    markdown: string;
    plainText: string;
};

export type ThreadViewModel = TownSquarePost & {
    titleResolved: string;
    bodyMarkdownResolved: string;
    previewText: string;
    latestActivityAt: number;
    replyCount: number;
    isUnread: boolean;
};

export type ThreadReadState = {
    replyCount: number;
    lastReadAt: number;
};

export type TownSquareReadState = Record<string, ThreadReadState>;

export const getTownSquareReadStateKey = (gameId: string): string => `townSquareReadState-${gameId}`;

export type ReplyViewModel = TownSquareComment & {
    bodyMarkdownResolved: string;
    plainTextResolved: string;
};

export type ReplyTreeNode = ReplyViewModel & {
    children: ReplyTreeNode[];
};

export type MoreComposerAction = 'heading' | 'quote' | 'bullets' | 'numbered' | 'divider';

export type EditorUpdateResult = {
    value: string;
    selection: SelectionRange;
};

export const emptySelection: SelectionRange = { start: 0, end: 0 };

export const stripMarkdownSyntax = (value: string) => {
    return value
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/[`*_>#-]/g, ' ')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const truncateText = (value: string, maxLength: number) => {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

export const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString([], {
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        month: 'numeric',
        year: '2-digit',
    });
};

export const getPostBodyMarkdown = (post: TownSquarePost) => {
    return post.bodyMarkdown ?? post.markdown ?? '';
};

export const getCommentBodyMarkdown = (comment: TownSquareComment) => {
    return comment.markdown ?? '';
};

export const normalizeSelection = (selection: SelectionRange, value: string) => {
    const start = Math.max(0, Math.min(selection.start, value.length));
    const end = Math.max(start, Math.min(selection.end, value.length));
    return { start, end };
};

export const wrapSelection = (
    value: string,
    selection: SelectionRange,
    before: string,
    after: string,
    fallbackText: string,
): EditorUpdateResult => {
    const safeSelection = normalizeSelection(selection, value);
    const selectedText = value.slice(safeSelection.start, safeSelection.end) || fallbackText;
    const nextValue = `${value.slice(0, safeSelection.start)}${before}${selectedText}${after}${value.slice(safeSelection.end)}`;
    const nextSelectionStart = safeSelection.start + before.length;
    const nextSelectionEnd = nextSelectionStart + selectedText.length;

    return {
        selection: {
            end: nextSelectionEnd,
            start: nextSelectionStart,
        },
        value: nextValue,
    };
};

export const prefixSelectionLines = (
    value: string,
    selection: SelectionRange,
    lineBuilder: (line: string, index: number) => string,
    fallbackText: string,
): EditorUpdateResult => {
    const safeSelection = normalizeSelection(selection, value);
    const selectedText = value.slice(safeSelection.start, safeSelection.end) || fallbackText;
    const lines = selectedText.split('\n');
    const nextSelectedText = lines.map((line, index) => lineBuilder(line || fallbackText, index)).join('\n');
    const nextValue = `${value.slice(0, safeSelection.start)}${nextSelectedText}${value.slice(safeSelection.end)}`;

    return {
        selection: {
            end: safeSelection.start + nextSelectedText.length,
            start: safeSelection.start,
        },
        value: nextValue,
    };
};

export const insertAtSelection = (value: string, selection: SelectionRange, insertion: string): EditorUpdateResult => {
    const safeSelection = normalizeSelection(selection, value);
    const nextValue = `${value.slice(0, safeSelection.start)}${insertion}${value.slice(safeSelection.end)}`;
    const cursor = safeSelection.start + insertion.length;

    return {
        selection: {
            end: cursor,
            start: cursor,
        },
        value: nextValue,
    };
};

export const insertMarkdownLink = (
    value: string,
    selection: SelectionRange,
    label: string,
    url: string,
) => {
    return insertAtSelection(value, selection, `[${label}](${url})`);
};

export const insertMarkdownImage = (
    value: string,
    selection: SelectionRange,
    caption: string,
    url: string,
) => {
    return insertAtSelection(value, selection, `\n\n![${caption}](${url})\n\n`);
};

export const insertMarkdownInput = (
    value: string,
    selection: SelectionRange,
    label: string,
    inputType: string,
) => {
    return insertAtSelection(value, selection, `\n\n/["${label}":${inputType}]/\n\n`);
};

export const applyMoreComposerAction = (
    value: string,
    selection: SelectionRange,
    action: MoreComposerAction,
) => {
    if (action === 'heading') {
        return prefixSelectionLines(value, selection, (line) => `## ${line}`, 'Heading');
    }

    if (action === 'quote') {
        return prefixSelectionLines(value, selection, (line) => `> ${line}`, 'Quoted text');
    }

    if (action === 'bullets') {
        return prefixSelectionLines(value, selection, (line) => `- ${line}`, 'List item');
    }

    if (action === 'numbered') {
        return prefixSelectionLines(value, selection, (line, index) => `${index + 1}. ${line}`, 'List item');
    }

    return insertAtSelection(value, selection, '\n\n---\n\n');
};

export const buildReplyTree = (replies: ReplyViewModel[]) => {
    const childrenByParentId = replies.reduce<Record<string, ReplyTreeNode[]>>((accumulator, reply) => {
        const parentId = reply.parentCommentId ?? 'root';

        if (!accumulator[parentId]) {
            accumulator[parentId] = [];
        }

        accumulator[parentId].push({
            ...reply,
            children: [],
        });

        return accumulator;
    }, {});

    const attachChildren = (node: ReplyTreeNode): ReplyTreeNode => {
        const children = (childrenByParentId[node.commentId] ?? []).map(attachChildren);
        return {
            ...node,
            children,
        };
    };

    return (childrenByParentId.root ?? []).map(attachChildren);
};
