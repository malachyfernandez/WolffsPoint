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

    console.log('[TOC] parseHeadings', {
        totalBlocks: blocks.length,
        headingCount: headings.length,
        headings: headings.map((h) => ({ blockIndex: h.blockIndex, level: h.level, text: h.text })),
    });

    return headings;
};

/**
 * Scrolls to a heading element by its nativeID.
 * Only scrolls the nearest scrollable ancestor (not the window).
 */
export const scrollToHeading = (headingIdPrefix: string, blockIndex: number) => {
    const id = `${headingIdPrefix}-heading-${blockIndex}`;
    console.log('[TOC] scrollToHeading', { id });
    if (typeof document !== 'undefined') {
        const el = document.getElementById(id);
        console.log('[TOC] scrollToHeading getElementById', { id, found: !!el });
        if (el) {
            scrollParentToElement(el, id);
        } else {
            // Log what heading IDs actually exist so we can diagnose mismatches.
            const existingIds: string[] = [];
            document.querySelectorAll('[id]').forEach((n) => {
                const idAttr = (n as HTMLElement).getAttribute('id');
                if (idAttr && idAttr.includes('heading')) {
                    existingIds.push(idAttr);
                }
            });
            console.log('[TOC] scrollToHeading — element NOT found. Existing heading IDs:', existingIds);
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
const scrollParentToElement = (el: HTMLElement, idForLog: string, buffer = 80) => {
    const elRect = el.getBoundingClientRect();
    const scrollParent = findScrollParent(el);

    console.log('[TOC] scrollParentToElement', {
        id: idForLog,
        elRectTop: elRect.top,
        elRectBottom: elRect.bottom,
        elHeight: elRect.height,
        windowScrollY: window.scrollY,
        bodyOverflow: typeof document !== 'undefined' ? window.getComputedStyle(document.body).overflowY : 'n/a',
        hasScrollParent: !!scrollParent,
    });

    // No scrollable ancestor found — the page relies on the window for
    // scrolling. Scroll the window directly (NOT scrollIntoView, which would
    // also scroll intermediate ancestors and push the page up/off-screen).
    if (!scrollParent) {
        const offset = elRect.top + window.scrollY - buffer;
        const clamped = Math.max(0, offset);
        console.log('[TOC] scrollParentToElement — no scroll parent, scrolling window', { offset, clamped });
        window.scrollTo({ top: clamped, behavior: 'smooth' });
        setTimeout(() => {
            console.log('[TOC] scrollParentToElement — after window.scrollTo (100ms)', {
                target: clamped,
                actual: window.scrollY,
            });
        }, 100);
        return;
    }

    const parentRect = scrollParent.getBoundingClientRect();
    const offset = elRect.top - parentRect.top + scrollParent.scrollTop - buffer;
    const clamped = Math.max(0, offset);
    const beforeTop = scrollParent.scrollTop;

    console.log('[TOC] scrollParentToElement — scroll parent found', {
        parentTag: scrollParent.tagName,
        parentId: scrollParent.id || '(none)',
        parentScrollTop: beforeTop,
        parentRectTop: parentRect.top,
        offset,
        clamped,
    });

    // Direct scrollTop assignment is more reliable than smooth scrollTo,
    // which gets cancelled/interrupted by layout changes when the dialog
    // unmounts and can leave the scroll at a wrong intermediate position.
    scrollParent.scrollTop = clamped;

    console.log('[TOC] scrollParentToElement — after direct scrollTop', {
        beforeTop,
        target: clamped,
        actual: scrollParent.scrollTop,
    });

    // Verify the scroll held after a short delay (catches re-layout resets).
    setTimeout(() => {
        console.log('[TOC] scrollParentToElement — scrollTop check (100ms)', {
            target: clamped,
            actual: scrollParent.scrollTop,
            held: Math.abs(scrollParent.scrollTop - clamped) < 2,
        });
    }, 100);
};

/** Scrolls to any element by ID with a small buffer above. */
export const scrollToElement = (elementId: string) => {
    if (typeof document === 'undefined') return;
    console.log('[TOC] scrollToElement', { elementId });
    const el = document.getElementById(elementId);
    console.log('[TOC] scrollToElement getElementById', { elementId, found: !!el });
    if (el) {
        scrollParentToElement(el, elementId);
    } else {
        const existingIds: string[] = [];
        document.querySelectorAll('[id]').forEach((n) => {
            const idAttr = (n as HTMLElement).getAttribute('id');
            if (idAttr && (idAttr.includes('top') || idAttr.includes('role'))) {
                existingIds.push(idAttr);
            }
        });
        console.log('[TOC] scrollToElement — element NOT found. Related IDs in DOM:', existingIds);
    }
};
