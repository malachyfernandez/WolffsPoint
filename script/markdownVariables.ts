const MARKDOWN_VARIABLE_PATTERN = /\/\*markdownVariable:\s*("(?:\\.|[^"\\])*")\s*\*\//g;

export const createMarkdownVariableMarker = (name: string): string =>
  `/*markdownVariable: ${JSON.stringify(name)}*/`;

export const getMarkdownVariableNames = (markdown: string): string[] => {
  const names: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  MARKDOWN_VARIABLE_PATTERN.lastIndex = 0;
  while ((match = MARKDOWN_VARIABLE_PATTERN.exec(markdown)) !== null) {
    try {
      const name = JSON.parse(match[1]);
      if (typeof name === 'string' && name.trim() && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        names.push(name);
      }
    } catch {
      continue;
    }
  }

  return names;
};

export const substituteMarkdownVariables = (
  markdown: string,
  values: ReadonlyMap<string, string>
): string => {
  MARKDOWN_VARIABLE_PATTERN.lastIndex = 0;
  const normalized = new Map([...values].map(([name, value]) => [name.toLowerCase(), value]));
  return markdown.replace(MARKDOWN_VARIABLE_PATTERN, (marker, encodedName: string) => {
    try {
      const name = JSON.parse(encodedName);
      return typeof name === 'string' ? (normalized.get(name.toLowerCase()) ?? '') : marker;
    } catch {
      return marker;
    }
  });
};

export const renameMarkdownVariable = (markdown: string, from: string, to: string): string =>
  markdown.replace(MARKDOWN_VARIABLE_PATTERN, (marker, encodedName: string) => {
    try {
      return JSON.parse(encodedName).toLowerCase() === from.toLowerCase()
        ? createMarkdownVariableMarker(to)
        : marker;
    } catch {
      return marker;
    }
  });
