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
 * Uses smooth scrollIntoView on web.
 */
export const scrollToHeading = (headingIdPrefix: string, blockIndex: number) => {
    const id = `${headingIdPrefix}-heading-${blockIndex}`;
    if (typeof document !== 'undefined') {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
};
