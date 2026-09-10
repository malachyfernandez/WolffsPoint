export interface MarkdownHeading {
    /** 1-based index of the block in the parsed markdown (matches the id assigned by MarkdownRenderer) */
    blockIndex: number;
    level: number;
    text: string;
}

/**
 * Extracts headings from markdown text, matching the same parsing logic
 * used by MarkdownRenderer (#{1,3} at the start of a line).
 *
 * The `blockIndex` corresponds to the index of the heading block in the
 * full parsed markdown, which matches the id format `${prefix}-heading-${blockIndex}`
 * assigned by MarkdownRenderer when `headingIdPrefix` is provided.
 */
export const parseHeadings = (markdown: string): MarkdownHeading[] => {
    if (!markdown) {
        return [];
    }

    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const headings: MarkdownHeading[] = [];

    let index = 0;
    while (index < lines.length) {
        const line = lines[index];

        // Skip code fences (same logic as MarkdownRenderer)
        if (line.trim().startsWith('```')) {
            index += 1;
            while (index < lines.length && !lines[index].trim().startsWith('```')) {
                index += 1;
            }
            index += 1;
            continue;
        }

        // Skip script blocks
        if (line.includes('/*script')) {
            index += 1;
            while (index < lines.length && !lines[index].includes('script*/')) {
                index += 1;
            }
            index += 1;
            continue;
        }

        const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
        if (headingMatch) {
            headings.push({
                blockIndex: index,
                level: headingMatch[1].length,
                text: headingMatch[2].trim(),
            });
        }

        index += 1;
    }

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
 * small buffer above. Does NOT use scrollIntoView (which would also scroll
 * the window and push the page content up/off-screen).
 */
const scrollParentToElement = (el: HTMLElement, buffer = 24) => {
    const scrollParent = findScrollParent(el);

    // No scrollable ancestor found — the page relies on the window for
    // scrolling. Scroll the window directly (NOT scrollIntoView, which would
    // also scroll intermediate ancestors and push the page up/off-screen).
    if (!scrollParent) {
        const offset = el.getBoundingClientRect().top + window.scrollY - buffer;
        window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
        return;
    }

    const parentRect = scrollParent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = elRect.top - parentRect.top + scrollParent.scrollTop - buffer;
    scrollParent.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
};

/** Scrolls to any element by ID with a small buffer above. */
export const scrollToElement = (elementId: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(elementId);
    if (el) {
        scrollParentToElement(el);
    }
};
