import type { Diagnostic, SourcePosition, SourceSpan } from './ast';

export type TokenKind =
  | 'String'
  | 'BacktickString'
  | 'Number'
  | 'Identifier'
  | 'Keyword'
  | 'Punctuation'
  | 'Operator'
  | 'Unknown'
  | 'Comment'
  | 'EOF';

export interface Token {
  kind: TokenKind;
  text: string;
  value?: string | number;
  span: SourceSpan;
}

export interface TokenizeResult {
  tokens: Token[];
  diagnostics: Diagnostic[];
}

export const KEYWORDS = new Set([
  'AND',
  'ELSE',
  'ELSEIF',
  'FALSE',
  'FOREACH',
  'FUNCTION',
  'IF',
  'NOT',
  'NOTHING',
  'OR',
  'RETURN',
  'TRUE',
  'VARIABLE',
]);

const PUNCTUATION = new Set(['(', ')', '{', '}', '[', ']', ',', ';', '.']);
const OPERATOR_STARTS = new Set(['=', '!', '>', '<', '+', '-', '*', '/', '%']);

export const tokenize = (source: string): TokenizeResult => {
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  const position = (): SourcePosition => ({ offset, line, column });
  const advance = (): string => {
    const character = source[offset++] ?? '';
    if (character === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return character;
  };
  const push = (
    kind: TokenKind,
    start: SourcePosition,
    text: string,
    value?: string | number
  ): void => {
    tokens.push({ kind, text, value, span: { start, end: position() } });
  };

  while (offset < source.length) {
    const character = source[offset];
    if (/\s/.test(character)) {
      advance();
      continue;
    }
    if (character === '/' && source[offset + 1] === '/') {
      const commentStart = position();
      advance();
      advance();
      let commentText = '';
      while (offset < source.length && source[offset] !== '\n') {
        commentText += advance();
      }
      push('Comment', commentStart, commentText, commentText.trim());
      continue;
    }
    if (character === '/' && source[offset + 1] === '*') {
      const start = position();
      advance();
      advance();
      while (offset < source.length && !(source[offset] === '*' && source[offset + 1] === '/')) {
        advance();
      }
      if (offset >= source.length) {
        diagnostics.push({
          message: 'Unterminated block comment',
          span: { start, end: position() },
          severity: 'error',
        });
      } else {
        advance();
        advance();
      }
      continue;
    }
    const start = position();
    if (character === '"' || character === "'") {
      const quote = advance();
      let value = '';
      let terminated = false;
      while (offset < source.length) {
        const current = advance();
        if (current === quote) {
          terminated = true;
          break;
        }
        if (current === '\\') {
          const escaped = advance();
          const escapes: Record<string, string> = {
            n: '\n',
            r: '\r',
            t: '\t',
            '\\': '\\',
            '"': '"',
            "'": "'",
          };
          value += escapes[escaped] ?? escaped;
        } else {
          value += current;
        }
      }
      const text = source.slice(start.offset, offset);
      push('String', start, text, value);
      if (!terminated) {
        diagnostics.push({
          message: 'Unterminated string',
          span: { start, end: position() },
          severity: 'error',
        });
      }
      continue;
    }
    if (character === '`') {
      const quote = advance();
      let value = '';
      let terminated = false;
      while (offset < source.length) {
        const current = advance();
        if (current === '`') {
          terminated = true;
          break;
        }
        if (current === '\\') {
          const escaped = advance();
          const escapes: Record<string, string> = {
            n: '\n',
            r: '\r',
            t: '\t',
            '\\': '\\',
            '`': '`',
          };
          value += escapes[escaped] ?? escaped;
        } else {
          value += current;
        }
      }
      const text = source.slice(start.offset, offset);
      push('BacktickString', start, text, value);
      if (!terminated) {
        diagnostics.push({
          message: 'Unterminated backtick string',
          span: { start, end: position() },
          severity: 'error',
        });
      }
      continue;
    }
    if (/\d/.test(character) || (character === '.' && /\d/.test(source[offset + 1] ?? ''))) {
      advance();
      while (/\d/.test(source[offset] ?? '')) {
        advance();
      }
      if (source[offset] === '.' && /\d/.test(source[offset + 1] ?? '')) {
        advance();
        while (/\d/.test(source[offset] ?? '')) {
          advance();
        }
      }
      if (
        (source[offset] === 'e' || source[offset] === 'E') &&
        /[+\-\d]/.test(source[offset + 1] ?? '')
      ) {
        advance();
        if (source[offset] === '+' || source[offset] === '-') {
          advance();
        }
        while (/\d/.test(source[offset] ?? '')) {
          advance();
        }
      }
      const text = source.slice(start.offset, offset);
      push('Number', start, text, Number(text));
      continue;
    }
    if (/[A-Za-z_]/.test(character)) {
      advance();
      while (/[A-Za-z0-9_]/.test(source[offset] ?? '')) {
        advance();
      }
      const text = source.slice(start.offset, offset);
      const upper = text.toUpperCase();
      if (KEYWORDS.has(upper)) {
        push('Keyword', start, text, upper);
      } else {
        push('Identifier', start, text, text);
      }
      continue;
    }
    const pair = source.slice(offset, offset + 2);
    if (['=>', '->', '==', '!=', '>=', '<='].includes(pair)) {
      advance();
      advance();
      push('Operator', start, pair, pair);
      continue;
    }
    if (PUNCTUATION.has(character)) {
      advance();
      push('Punctuation', start, character, character);
      continue;
    }
    if (OPERATOR_STARTS.has(character)) {
      advance();
      push('Operator', start, character, character);
      continue;
    }
    advance();
    push('Unknown', start, character, character);
    diagnostics.push({
      message: `Unknown character ${JSON.stringify(character)}`,
      span: { start, end: position() },
      severity: 'error',
    });
  }
  const end = position();
  tokens.push({ kind: 'EOF', text: '', span: { start: end, end } });
  return { tokens, diagnostics };
};

export const tokenizeScript = tokenize;
