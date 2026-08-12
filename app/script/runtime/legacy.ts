import type { Expression, Script, SourceSpan, Statement } from '../lang/ast';
import { emptySpan } from '../lang/ast';
import { parseScript } from '../lang/parser';
import { printScript } from '../lang/printer';

export interface LegacyToken {
    type?: string;
    kind?: string;
    label?: string;
    name?: string;
    key?: string;
    value?: unknown;
    options?: unknown[];
    min?: number;
    max?: number;
    multiple?: boolean;
    numSelectable?: number;
    [key: string]: unknown;
}

export type LegacyTokenInput = LegacyToken | string;

const LEGACY_PATTERN = /^\/?\[\s*(["'])(.*?)\1\s*:\s*([A-Za-z0-9_]+)\s*\]\/?$/;

const literal = (value: unknown, span: SourceSpan): Expression => {
    if (typeof value === 'string') return { kind: 'StringLiteral', value, span };
    if (typeof value === 'number' && Number.isFinite(value)) return { kind: 'NumberLiteral', value, span };
    if (typeof value === 'boolean') return { kind: 'BooleanLiteral', value, span };
    if (Array.isArray(value)) return { kind: 'ListExpression', items: value.map((item) => literal(item, span)), span };
    return { kind: 'NothingLiteral', span };
};

const callStatement = (
    functionName: string,
    properties: Record<string, unknown>,
    span: SourceSpan,
): Statement => ({
    kind: 'ExpressionStatement',
    expression: {
        kind: 'CallExpression',
        callee: { kind: 'IdentifierExpression', name: functionName, span },
        arguments: Object.entries(properties)
            .filter(([, value]) => value !== undefined)
            .map(([name, value]) => ({
                kind: 'NamedArgument',
                name: name.toUpperCase(),
                value: literal(value, span),
                span,
            })),
        span,
    },
    span,
});

const parseLegacyString = (token: string): LegacyToken => {
    const match = LEGACY_PATTERN.exec(token.trim());
    if (!match) {
        return { type: 'MARKDOWN', value: token };
    }
    return { label: match[2], type: match[3] };
};

export const legacyTokenToAst = (input: LegacyTokenInput, span: SourceSpan = emptySpan()): Statement => {
    const token = typeof input === 'string' ? parseLegacyString(input) : input;
    const type = String(token.type ?? token.kind ?? '').toUpperCase();
    const label = String(token.label ?? token.name ?? '');
    const key = String(token.key ?? token.name ?? label);
    if (type.includes('SELECT')) {
        const list = token.options ?? (
            type.includes('PLAYER')
                ? [{ source: 'players', state: type.includes('ALIVE') ? 'alive' : type.includes('DEAD') ? 'dead' : 'all' }]
                : []
        );
        return callStatement('CreateSelectInput', {
            KEY: key,
            LABEL: label,
            LIST: list,
            MULTIPLE: token.multiple,
            NUMSELECTABLE: token.numSelectable,
        }, span);
    }
    if (type.includes('NUMBER')) {
        return callStatement('CreateNumberInput', {
            KEY: key,
            LABEL: label,
            VALUE: token.value,
            MIN: token.min,
            MAX: token.max,
        }, span);
    }
    if (type.includes('CHECKBOX') || type.includes('BOOLEAN')) {
        return callStatement('CreateCheckbox', { KEY: key, LABEL: label, VALUE: token.value }, span);
    }
    if (type.includes('DIVIDER')) {
        return callStatement('CreateDivider', {}, span);
    }
    if (type.includes('MARKDOWN')) {
        return callStatement('CreateMarkdown', { MARKDOWN: token.value ?? label }, span);
    }
    return callStatement('CreateTextInput', {
        KEY: key,
        LABEL: label,
        VALUE: token.value,
    }, span);
};

export const legacyTokensToAst = (tokens: readonly LegacyTokenInput[]): Script => {
    const span = emptySpan();
    return {
        kind: 'Script',
        statements: tokens.map((token) => legacyTokenToAst(token, span)),
        diagnostics: [],
        span,
    };
};

export const legacyTokenToScript = (token: LegacyTokenInput): string => printScript(legacyTokensToAst([token]));

export const legacyTokensToScript = (tokens: readonly LegacyTokenInput[]): string => printScript(legacyTokensToAst(tokens));

export const legacyScriptToAst = (source: string): Script => parseScript(source);
