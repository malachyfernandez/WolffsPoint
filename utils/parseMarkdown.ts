export type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'rule' }
  | { type: 'space' }
  | { type: 'script'; source: string }
  | { type: 'image'; alt: string; url: string };

export const parseMarkdown = (markdown: string): MarkdownBlock[] => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n').map((line) => line + '  ');
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (line.toLowerCase().startsWith('/*script')) {
      const scriptLines: string[] = [];
      let scriptLine = lines[index].trimEnd();
      scriptLine = scriptLine.slice(scriptLine.toLowerCase().indexOf('/*script') + 8);
      while (!scriptLine.toLowerCase().includes('script*/') && index + 1 < lines.length) {
        if (scriptLine.length > 0) scriptLines.push(scriptLine);
        index += 1;
        scriptLine = lines[index].trimEnd();
      }
      const closingIndex = scriptLine.toLowerCase().indexOf('script*/');
      const finalLine = closingIndex >= 0 ? scriptLine.slice(0, closingIndex) : scriptLine;
      if (finalLine.length > 0) scriptLines.push(finalLine);
      blocks.push({ type: 'script', source: scriptLines.join('\n').trim() });
      index += 1;
      continue;
    }
    if (!line.length) {
      blocks.push({ type: 'space' });
      index += 1;
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
    if (image) {
      blocks.push({ type: 'image', alt: image[1], url: image[2] });
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      blocks.push({ type: 'rule' });
      index += 1;
      continue;
    }
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];
      while (index < lines.length) {
        const next = lines[index].trim();
        const nextOrdered = /^\d+\.\s+/.test(next);
        const nextUnordered = /^[-*]\s+/.test(next);
        if ((!ordered && !nextUnordered) || (ordered && !nextOrdered)) break;
        items.push(next.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    blocks.push({ type: 'paragraph', text: line });
    index += 1;
  }
  return blocks;
};
