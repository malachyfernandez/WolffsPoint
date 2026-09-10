import { parseMarkdown } from '../app/components/ui/markdown/MarkdownRenderer';

export interface MarkdownHeading {
    /** Index of the block in the parsed markdown (matches the id assigned by MarkdownRenderer) */
    blockIndex: number;
    level: number;
    text: string;
}

/**
 * Extracts headings from markdown text by using the exact same `parseMarkdown`
 * function that MarkdownRenderer uses to render the content. This guarantees
 * that the `blockIndex` matches the id format `${prefix}-heading-${blockIndex}`
 * assigned by MarkdownRenderer when `headingIdPrefix` is provided.
 *
 * Previously this function independently parsed lines and used the LINE number
 * as the block index, which diverged from MarkdownRenderer's BLOCK index
 * whenever multi-line blocks (lists, quotes, script blocks) appeared before a
 * heading — causing the TOC to scroll to the wrong element.
 */
export const parseHeadings = (markdown: string): MarkdownHeading[] => {
    if (!markdown) {
        return [];
    }

    const blocks = parseMarkdown(markdown);
    const headings: MarkdownHeading[] = [];
    blocks.forEach((block, index) => {
        if (block.type === 'heading') {
            headings.push({
                blockIndex: index,
                level: block.level,
                text: block.text.trim(),
            });
        }
    });

    return headings;
};

/**
 * Scrolls to a heading element by its nativeID.
 * Only scrolls the nearest scrollable ancestor (not the window).
 */
export const scrollToHeading = (headingIdPrefix: string, blockIndex: number) => {
    const id = `${headingIdPrefix}-heading-${blockIndex}`;
    if (typeof document !== 'undefined') {
        const el = document.getElementById(id);
        if (el) {
            scrollParentToElement(el);
        }
    }
};

/** Walk up the DOM to find the nearest scrollable ancestor. */
const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
    if (!el) return null;
    let node: HTMLElement | null = el.parentElement;
    while (node) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        const canScroll = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay');
        if (canScroll && node.scrollHeight > node.clientHeight) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
};

/**
 * Scrolls the nearest scrollable ancestor so the element is visible with a
 * buffer above. Does NOT use scrollIntoView (which would also scroll the
 * window and push the page up/off-screen).
 */
const scrollParentToElement = (el: HTMLElement, buffer = 80) => {
    const elRect = el.getBoundingClientRect();
    const scrollParent = findScrollParent(el);

    // No scrollable ancestor found — the page relies on the window for
    // scrolling. Scroll the window directly (NOT scrollIntoView, which would
    // also scroll intermediate ancestors and push the page up/off-screen).
    if (!scrollParent) {
        const offset = elRect.top + window.scrollY - buffer;
        window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
        return;
    }

    const parentRect = scrollParent.getBoundingClientRect();
    const offset = elRect.top - parentRect.top + scrollParent.scrollTop - buffer;
    const clamped = Math.max(0, offset);
    // Direct scrollTop assignment is more reliable than smooth scrollTo,
    // which gets cancelled/interrupted by layout changes when the dialog
    // unmounts and can leave the scroll at a wrong intermediate position.
    scrollParent.scrollTop = clamped;
};

/** Scrolls to any element by ID with a small buffer above. */
export const scrollToElement = (elementId: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(elementId);
    if (el) {
        scrollParentToElement(el);
    }
};
