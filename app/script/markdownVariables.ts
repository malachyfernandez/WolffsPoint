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
      if (typeof name === 'string' && name.trim() && !seen.has(name)) {
        seen.add(name);
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
  return markdown.replace(MARKDOWN_VARIABLE_PATTERN, (marker, encodedName: string) => {
    try {
      const name = JSON.parse(encodedName);
      return typeof name === 'string' ? (values.get(name) ?? '') : marker;
    } catch {
      return marker;
    }
  });
};
