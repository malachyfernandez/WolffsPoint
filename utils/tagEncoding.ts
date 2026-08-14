/**
 * Tag encoding utilities.
 *
 * Tags are stored inline within cell text using the format:
 *   [/TAG: "Infected"/]
 *
 * A cell value can contain:
 *   - Plain text (no tags) → "text mode"
 *   - One or more tags (no text) → "tag mode"
 *
 * Once a tag is added, typing is disabled — it's one or the other.
 */

export interface ParsedTag {
  name: string;
}

export interface ParsedCell {
  /** Raw cell value as stored */
  raw: string;
  /** Tags extracted from the cell */
  tags: ParsedTag[];
  /** Plain text portion (everything outside tag markers) */
  text: string;
  /** True if the cell contains any tags */
  hasTags: boolean;
}

const TAG_REGEX = /\[\/TAG:\s*"([^"]*)"\s*\/\]/g;

/**
 * Parse a cell value into tags and text.
 */
export const parseCell = (raw: string): ParsedCell => {
  if (!raw) return { raw: '', tags: [], text: '', hasTags: false };

  const tags: ParsedTag[] = [];
  let text = '';

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TAG_REGEX.lastIndex = 0;

  while ((match = TAG_REGEX.exec(raw)) !== null) {
    // Capture text before this tag
    text += raw.slice(lastIndex, match.index);
    tags.push({ name: match[1] });
    lastIndex = match.index + match[0].length;
  }
  // Capture remaining text
  text += raw.slice(lastIndex);

  return {
    raw,
    tags,
    text: text.trim(),
    hasTags: tags.length > 0,
  };
};

/**
 * Encode an array of tag names into the cell storage format.
 */
export const encodeTags = (tagNames: string[]): string => {
  return tagNames.map((name) => `[/TAG: "${name}"/]`).join('');
};

/**
 * Encode plain text into the cell storage format (just the text itself).
 */
export const encodeText = (text: string): string => {
  return text;
};

/**
 * Check if a raw cell value contains any tags.
 */
export const cellHasTags = (raw: string): boolean => {
  if (!raw) return false;
  TAG_REGEX.lastIndex = 0;
  return TAG_REGEX.test(raw);
};
