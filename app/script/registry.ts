import type { RuntimeValue } from './runtime/values';
import {
  NOTHING,
  isNothing,
  isTruthy,
  displayValue,
  runtimeEquals,
  isRuntimeFunction,
  isRuntimeObject,
} from './runtime/values';

export type BlockKind = 'statement' | 'expression';
export type InputType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'list'
  | 'expression'
  | 'lambda'
  | 'markdown';

export interface BlockInput {
  name: string;
  label: string;
  type: InputType;
  required?: boolean;
  default?: unknown;
  enumValues?: string[];
}

export interface StatementBlockDef {
  id: string;
  name: string;
  kind: 'statement';
  description: string;
  inputs: BlockInput[];
  category: 'variable' | 'input' | 'control' | 'function' | 'display';
  execute: (args: Record<string, RuntimeValue>, ctx: StatementContext) => void;
}

export interface ExpressionBlockDef {
  id: string;
  name: string;
  kind: 'expression';
  description: string;
  inputs: BlockInput[];
  category: 'list' | 'number' | 'string' | 'boolean' | 'data' | 'operator' | 'object' | 'math';
  appliesTo?: 'list' | 'number' | 'string' | 'any';
  evaluate: (receiver: RuntimeValue, args: RuntimeValue[], ctx: ExpressionContext) => RuntimeValue;
  isProperty?: boolean;
}

export interface StatementContext {
  defineVariable: (name: string, value: RuntimeValue) => void;
  emit: (instruction: Record<string, unknown>) => void;
  getVariable: (name: string) => RuntimeValue;
  getInputState: () => Record<string, unknown>;
  issues: { message: string; span?: unknown }[];
}

export interface ExpressionContext {
  evaluateLambda: (fn: RuntimeValue, item: RuntimeValue) => RuntimeValue;
  issues: { message: string; span?: unknown }[];
}

export type BlockDef = StatementBlockDef | ExpressionBlockDef;

const num = (v: RuntimeValue): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const str = (v: RuntimeValue): string => displayValue(v);

/**
 * Pretty-format any RuntimeValue as indented JSON-style text for CreateMarkdown.
 * Uses [] for lists, {} for objects, with 2-space indentation.
 * Strings are quoted, primitives are raw.
 */
const prettyFormat = (value: RuntimeValue, indent = 0): string => {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);
  if (isNothing(value)) return 'nothing';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isRuntimeFunction(value)) return '[Function]';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item) => padInner + prettyFormat(item, indent + 1));
    return '[\n' + items.join(',\n') + '\n' + pad + ']';
  }
  if (isRuntimeObject(value)) {
    const entries = Object.entries(value as Record<string, RuntimeValue>);
    if (entries.length === 0) return '{}';
    const lines = entries.map(
      ([k, v]) => padInner + JSON.stringify(k) + ': ' + prettyFormat(v, indent + 1)
    );
    return '{\n' + lines.join(',\n') + '\n' + pad + '}';
  }
  return displayValue(value);
};

const filterList = (
  list: RuntimeValue[],
  predicate: RuntimeValue,
  ctx: ExpressionContext
): RuntimeValue[] => {
  if (!isRuntimeFunction(predicate)) return list;
  return list.filter((item) => isTruthy(ctx.evaluateLambda(predicate, item)));
};

const mapList = (
  list: RuntimeValue[],
  mapper: RuntimeValue,
  ctx: ExpressionContext
): RuntimeValue[] => {
  if (!isRuntimeFunction(mapper)) return list;
  return list.map((item) => ctx.evaluateLambda(mapper, item));
};

/**
 * Auto-detect player objects and format them as dropdown options.
 * A player object has realName + email (+ optionally userId, role, isAlive).
 * - value: realName (the display name shown + submitted)
 * - label: "Real Name (email)" or just "Real Name"
 * - meta: { email, userId, role, isAlive } for downstream use
 *
 * Non-player objects/primitives pass through as { value, label }.
 */
const isPlayerObject = (v: RuntimeValue): v is Record<string, RuntimeValue> =>
  isRuntimeObject(v) && typeof (v as Record<string, RuntimeValue>).realName === 'string';

const formatSelectOption = (item: RuntimeValue): Record<string, unknown> => {
  if (isPlayerObject(item)) {
    const obj = item as Record<string, RuntimeValue>;
    const realName = String(obj.realName ?? '');
    const email = typeof obj.email === 'string' ? obj.email : '';
    const isAlive = obj.isAlive === true;
    return {
      value: realName,
      label: email ? `${realName} (${email})` : realName,
      meta: {
        email,
        userId: typeof obj.userId === 'string' ? obj.userId : undefined,
        role: typeof obj.role === 'string' ? obj.role : undefined,
        isAlive,
      },
    };
  }
  if (isRuntimeObject(item)) {
    const obj = item as Record<string, RuntimeValue>;
    const labelKey = Object.keys(obj).find(
      (k) =>
        k.toLowerCase() === 'label' || k.toLowerCase() === 'name' || k.toLowerCase() === 'realname'
    );
    const valueKey = Object.keys(obj).find(
      (k) => k.toLowerCase() === 'value' || k.toLowerCase() === 'id'
    );
    if (labelKey || valueKey) {
      return {
        value: valueKey ? str(obj[valueKey]) : labelKey ? str(obj[labelKey]) : str(item),
        label: labelKey ? str(obj[labelKey]) : valueKey ? str(obj[valueKey]) : str(item),
      };
    }
  }
  const display = str(item);
  return { value: display, label: display };
};

const sortList = (
  list: RuntimeValue[],
  comparator: RuntimeValue,
  ctx: ExpressionContext
): RuntimeValue[] => {
  if (!isRuntimeFunction(comparator)) return [...list];
  return [...list].sort((a, b) => {
    const result = ctx.evaluateLambda(comparator, a);
    const n = num(result);
    return n === undefined ? 0 : n;
  });
};

export const STATEMENT_BLOCKS: StatementBlockDef[] = [
  {
    id: 'Variable',
    name: 'Variable',
    kind: 'statement',
    description: 'Define a named variable',
    category: 'variable',
    inputs: [
      { name: 'NAME', label: 'Name', type: 'string', required: true, default: 'newVariable' },
      { name: 'VALUE', label: 'Value', type: 'expression', required: true, default: 'nothing' },
    ],
    execute: (args, ctx) => {
      const rawName = str(args.name ?? NOTHING);
      const name = rawName.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');
      if (name) ctx.defineVariable(name, args.value ?? NOTHING);
    },
  },
  {
    id: 'CreateSelectInput',
    name: 'CreateSelectInput',
    kind: 'statement',
    description: 'Selectable dropdown input',
    category: 'input',
    inputs: [
      { name: 'LIST', label: 'Options', type: 'list', required: true },
      { name: 'LABEL', label: 'Label', type: 'string', default: 'Select' },
      { name: 'NUMSELECTABLE', label: 'Max selectable', type: 'number', default: 1 },
    ],
    execute: (args, ctx) => {
      const label = str(args.label ?? NOTHING) || 'input';
      const list = Array.isArray(args.list) ? args.list : [];
      const numSelectable = num(args.numselectable) ?? 1;
      const options = list.map(formatSelectOption);
      ctx.emit({
        kind: 'select',
        key: label,
        label,
        options,
        numberSelectable: Math.max(1, Math.floor(numSelectable)),
        multiple: numSelectable > 1,
      });
    },
  },
  {
    id: 'CreateTextInput',
    name: 'CreateTextInput',
    kind: 'statement',
    description: 'Text input field',
    category: 'input',
    inputs: [{ name: 'LABEL', label: 'Label', type: 'string', default: 'Text' }],
    execute: (args, ctx) => {
      const label = str(args.label ?? NOTHING) || 'input';
      ctx.emit({
        kind: 'text',
        key: label,
        label,
      });
    },
  },
  {
    id: 'CreateNumberInput',
    name: 'CreateNumberInput',
    kind: 'statement',
    description: 'Number input with optional bounds',
    category: 'input',
    inputs: [
      { name: 'LABEL', label: 'Label', type: 'string', default: 'Number' },
      { name: 'MIN', label: 'Min', type: 'number' },
      { name: 'MAX', label: 'Max', type: 'number' },
    ],
    execute: (args, ctx) => {
      const label = str(args.label ?? NOTHING) || 'input';
      ctx.emit({
        kind: 'number',
        key: label,
        label,
        min: args.min ? num(args.min) : undefined,
        max: args.max ? num(args.max) : undefined,
      });
    },
  },
  {
    id: 'CreateCheckbox',
    name: 'CreateCheckbox',
    kind: 'statement',
    description: 'Boolean toggle',
    category: 'input',
    inputs: [
      { name: 'LABEL', label: 'Label', type: 'string', default: 'Checkbox' },
      { name: 'DEFAULT', label: 'Default', type: 'boolean', default: false },
    ],
    execute: (args, ctx) => {
      const label = str(args.label ?? NOTHING) || 'input';
      ctx.emit({
        kind: 'checkbox',
        key: label,
        label,
        value: isTruthy(args.default),
      });
    },
  },
  {
    id: 'CreateMarkdown',
    name: 'CreateMarkdown',
    kind: 'statement',
    description: 'Render markdown content',
    category: 'display',
    inputs: [
      {
        name: 'CONTENT',
        label: 'Content',
        type: 'markdown',
        required: true,
        default: 'Markdown text',
      },
    ],
    execute: (args, ctx) => {
      const content = args.content ?? NOTHING;
      ctx.emit({
        kind: 'markdown',
        markdown: typeof content === 'string' ? content : prettyFormat(content),
      });
    },
  },
  {
    id: 'CreateDivider',
    name: 'CreateDivider',
    kind: 'statement',
    description: 'Horizontal divider line',
    category: 'display',
    inputs: [],
    execute: (_args, ctx) => {
      ctx.emit({ kind: 'divider' });
    },
  },
];

export const EXPRESSION_BLOCKS: ExpressionBlockDef[] = [
  {
    id: 'filter',
    name: 'filter',
    kind: 'expression',
    description: 'Filter items by condition',
    category: 'list',
    appliesTo: 'list',
    inputs: [{ name: 'predicate', label: 'Condition', type: 'lambda', required: true }],
    evaluate: (receiver, args, ctx) => {
      if (!Array.isArray(receiver)) return NOTHING;
      return filterList(receiver, args[0], ctx);
    },
  },
  {
    id: 'map',
    name: 'map',
    kind: 'expression',
    description: 'Map each item to a new value',
    category: 'list',
    appliesTo: 'list',
    inputs: [{ name: 'mapper', label: 'Transform', type: 'lambda', required: true }],
    evaluate: (receiver, args, ctx) => {
      if (!Array.isArray(receiver)) return NOTHING;
      return mapList(receiver, args[0], ctx);
    },
  },
  {
    id: 'sort',
    name: 'sort',
    kind: 'expression',
    description: 'Sort items by comparator',
    category: 'list',
    appliesTo: 'list',
    inputs: [{ name: 'comparator', label: 'Comparator', type: 'lambda', required: true }],
    evaluate: (receiver, args, ctx) => {
      if (!Array.isArray(receiver)) return NOTHING;
      return sortList(receiver, args[0], ctx);
    },
  },
  {
    id: 'length',
    name: 'length',
    kind: 'expression',
    description: 'Length of a list or string',
    category: 'list',
    appliesTo: 'any',
    inputs: [],
    isProperty: true,
    evaluate: (receiver) => {
      if (Array.isArray(receiver)) return receiver.length;
      if (typeof receiver === 'string') return receiver.length;
      return NOTHING;
    },
  },
  {
    id: 'first',
    name: 'first',
    kind: 'expression',
    description: 'First item of a list',
    category: 'list',
    appliesTo: 'list',
    inputs: [],
    isProperty: true,
    evaluate: (receiver) => (Array.isArray(receiver) ? (receiver[0] ?? NOTHING) : NOTHING),
  },
  {
    id: 'last',
    name: 'last',
    kind: 'expression',
    description: 'Last item of a list',
    category: 'list',
    appliesTo: 'list',
    inputs: [],
    isProperty: true,
    evaluate: (receiver) =>
      Array.isArray(receiver) ? (receiver[receiver.length - 1] ?? NOTHING) : NOTHING,
  },
  {
    id: 'get',
    name: 'get',
    kind: 'expression',
    description: 'Get item at index',
    category: 'list',
    appliesTo: 'list',
    inputs: [{ name: 'index', label: 'Index', type: 'number', required: true }],
    evaluate: (receiver, args) => {
      if (!Array.isArray(receiver)) return NOTHING;
      const i = num(args[0]);
      return i === undefined ? NOTHING : (receiver[Math.trunc(i)] ?? NOTHING);
    },
  },
  {
    id: 'contains',
    name: 'contains',
    kind: 'expression',
    description: 'Check if it contains a value',
    category: 'list',
    appliesTo: 'any',
    inputs: [{ name: 'value', label: 'Value', type: 'expression', required: true }],
    evaluate: (receiver, args) => {
      if (typeof receiver === 'string') return receiver.includes(str(args[0] ?? NOTHING));
      if (Array.isArray(receiver))
        return receiver.some((item) => runtimeEquals(item, args[0] ?? NOTHING));
      return NOTHING;
    },
  },
  {
    id: 'count',
    name: 'count',
    kind: 'expression',
    description: 'Count items matching condition',
    category: 'list',
    appliesTo: 'list',
    inputs: [{ name: 'predicate', label: 'Condition', type: 'lambda', required: true }],
    evaluate: (receiver, args, ctx) => {
      if (!Array.isArray(receiver)) return NOTHING;
      return filterList(receiver, args[0], ctx).length;
    },
  },
  {
    id: 'join',
    name: 'join',
    kind: 'expression',
    description: 'Join list into a string',
    category: 'list',
    appliesTo: 'list',
    inputs: [{ name: 'separator', label: 'Separator', type: 'string', default: ', ' }],
    evaluate: (receiver, args) => {
      if (!Array.isArray(receiver)) return NOTHING;
      return receiver.map(displayValue).join(str(args[0] ?? ', '));
    },
  },
  {
    id: 'Round',
    name: 'Round',
    kind: 'expression',
    description: 'Round, floor, or ceil to integer',
    category: 'math',
    appliesTo: 'number',
    inputs: [
      {
        name: 'mode',
        label: 'Mode',
        type: 'string',
        default: 'round',
        enumValues: ['round', 'floor', 'ceil'],
      },
    ],
    evaluate: (receiver, args) => {
      const n = num(receiver);
      if (n === undefined) return NOTHING;
      const mode = str(args[0] ?? NOTHING) || 'round';
      if (mode === 'floor') return Math.floor(n);
      if (mode === 'ceil') return Math.ceil(n);
      return Math.round(n);
    },
  },
  {
    id: 'abs',
    name: 'abs',
    kind: 'expression',
    description: 'Absolute value',
    category: 'math',
    appliesTo: 'number',
    inputs: [],
    isProperty: true,
    evaluate: (receiver) => {
      const n = num(receiver);
      return n === undefined ? NOTHING : Math.abs(n);
    },
  },
  {
    id: 'MinMax',
    name: 'MinMax',
    kind: 'expression',
    description: 'Minimum or maximum of two numbers',
    category: 'math',
    appliesTo: 'number',
    inputs: [
      {
        name: 'mode',
        label: 'Mode',
        type: 'string',
        default: 'min',
        enumValues: ['min', 'max'],
      },
      { name: 'other', label: 'Other', type: 'number', required: true },
    ],
    evaluate: (receiver, args) => {
      const a = num(receiver);
      const b = num(args[1]);
      if (a === undefined || b === undefined) return NOTHING;
      const mode = str(args[0] ?? NOTHING) || 'min';
      return mode === 'max' ? Math.max(a, b) : Math.min(a, b);
    },
  },
  {
    id: 'toPowerOf',
    name: 'toPowerOf',
    kind: 'expression',
    description: 'Raise to a power',
    category: 'math',
    appliesTo: 'number',
    inputs: [{ name: 'exponent', label: 'Exponent', type: 'number', required: true, default: 2 }],
    evaluate: (receiver, args) => {
      const base = num(receiver);
      const exp = num(args[0]);
      if (base === undefined || exp === undefined) return NOTHING;
      return Math.pow(base, exp);
    },
  },
  {
    id: 'Root',
    name: 'Root',
    kind: 'expression',
    description: 'Square root or cube root',
    category: 'math',
    appliesTo: 'number',
    inputs: [
      {
        name: 'fn',
        label: 'Function',
        type: 'string',
        default: 'sqrt',
        enumValues: ['sqrt', 'cbrt'],
      },
    ],
    evaluate: (receiver, args) => {
      const n = num(receiver);
      if (n === undefined) return NOTHING;
      const fn = str(args[0] ?? NOTHING) || 'sqrt';
      if (fn === 'cbrt') return Math.cbrt(n);
      return Math.sqrt(n);
    },
  },
  {
    id: 'toNumber',
    name: 'toNumber',
    kind: 'expression',
    description: 'Convert text or boolean to number',
    category: 'math',
    appliesTo: 'any',
    inputs: [],
    isProperty: true,
    evaluate: (receiver) => {
      if (typeof receiver === 'number') return receiver;
      if (typeof receiver === 'boolean') return receiver ? 1 : 0;
      if (typeof receiver === 'string') {
        const parsed = Number(receiver);
        return Number.isNaN(parsed) ? NOTHING : parsed;
      }
      if (isNothing(receiver)) return NOTHING;
      return NOTHING;
    },
  },
  {
    id: 'Trig',
    name: 'Trig',
    kind: 'expression',
    description: 'Sine, cosine, tangent, and their inverses',
    category: 'math',
    appliesTo: 'number',
    inputs: [
      {
        name: 'fn',
        label: 'Function',
        type: 'string',
        default: 'sin',
        enumValues: ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'],
      },
    ],
    evaluate: (receiver, args) => {
      const n = num(receiver);
      if (n === undefined) return NOTHING;
      const fn = str(args[0] ?? NOTHING) || 'sin';
      const fns: Record<string, (x: number) => number> = {
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
      };
      const fnImpl = fns[fn];
      return fnImpl ? fnImpl(n) : NOTHING;
    },
  },
  {
    id: 'LogExp',
    name: 'LogExp',
    kind: 'expression',
    description: 'Logarithm or exponential',
    category: 'math',
    appliesTo: 'number',
    inputs: [
      {
        name: 'fn',
        label: 'Function',
        type: 'string',
        default: 'log',
        enumValues: ['log', 'log2', 'log10', 'exp'],
      },
    ],
    evaluate: (receiver, args) => {
      const n = num(receiver);
      if (n === undefined) return NOTHING;
      const fn = str(args[0] ?? NOTHING) || 'log';
      const fns: Record<string, (x: number) => number> = {
        log: Math.log,
        log2: Math.log2,
        log10: Math.log10,
        exp: Math.exp,
      };
      const fnImpl = fns[fn];
      return fnImpl ? fnImpl(n) : NOTHING;
    },
  },
  {
    id: 'Sign',
    name: 'Sign',
    kind: 'expression',
    description: 'Sign (-1, 0, 1) or truncate to integer',
    category: 'math',
    appliesTo: 'number',
    inputs: [
      {
        name: 'fn',
        label: 'Function',
        type: 'string',
        default: 'sign',
        enumValues: ['sign', 'trunc'],
      },
    ],
    evaluate: (receiver, args) => {
      const n = num(receiver);
      if (n === undefined) return NOTHING;
      const fn = str(args[0] ?? NOTHING) || 'sign';
      if (fn === 'trunc') return Math.trunc(n);
      return Math.sign(n);
    },
  },
  {
    id: 'toString',
    name: 'toString',
    kind: 'expression',
    description: 'Convert to text',
    category: 'string',
    appliesTo: 'any',
    inputs: [],
    isProperty: true,
    evaluate: (receiver) => displayValue(receiver),
  },
  {
    id: 'upper',
    name: 'upper',
    kind: 'expression',
    description: 'Convert to uppercase',
    category: 'string',
    appliesTo: 'string',
    inputs: [],
    isProperty: true,
    evaluate: (receiver) => (typeof receiver === 'string' ? receiver.toUpperCase() : NOTHING),
  },
  {
    id: 'lower',
    name: 'lower',
    kind: 'expression',
    description: 'Convert to lowercase',
    category: 'string',
    appliesTo: 'string',
    inputs: [],
    isProperty: true,
    evaluate: (receiver) => (typeof receiver === 'string' ? receiver.toLowerCase() : NOTHING),
  },
  {
    id: 'startsWith',
    name: 'startsWith',
    kind: 'expression',
    description: 'Check if it starts with a prefix',
    category: 'string',
    appliesTo: 'string',
    inputs: [{ name: 'prefix', label: 'Prefix', type: 'string', required: true }],
    evaluate: (receiver, args) => {
      if (typeof receiver !== 'string') return NOTHING;
      return receiver.startsWith(str(args[0] ?? NOTHING));
    },
  },
  {
    id: 'endsWith',
    name: 'endsWith',
    kind: 'expression',
    description: 'Check if it ends with a suffix',
    category: 'string',
    appliesTo: 'string',
    inputs: [{ name: 'suffix', label: 'Suffix', type: 'string', required: true }],
    evaluate: (receiver, args) => {
      if (typeof receiver !== 'string') return NOTHING;
      return receiver.endsWith(str(args[0] ?? NOTHING));
    },
  },
  {
    id: 'concat',
    name: 'concat',
    kind: 'expression',
    description: 'Concatenate strings together',
    category: 'string',
    appliesTo: 'string',
    inputs: [{ name: 'other', label: 'Other', type: 'string', required: true }],
    evaluate: (receiver, args) => {
      if (typeof receiver !== 'string') return NOTHING;
      return receiver + str(args[0] ?? NOTHING);
    },
  },
  {
    id: 'entry',
    name: 'entry',
    kind: 'expression',
    description: 'Get a field from an object',
    category: 'data',
    appliesTo: 'any',
    inputs: [{ name: 'key', label: 'Key', type: 'string', required: true }],
    evaluate: (receiver, args) => {
      if (!isRuntimeObject(receiver)) return NOTHING;
      const key = str(args[0] ?? NOTHING).toLowerCase();
      const obj = receiver as Record<string, RuntimeValue>;
      const matching = Object.keys(obj).find((k) => k.toLowerCase() === key);
      return matching === undefined ? NOTHING : obj[matching];
    },
  },
  {
    id: 'index',
    name: 'index',
    kind: 'expression',
    description: 'Get an item at a position in a list',
    category: 'data',
    appliesTo: 'any',
    inputs: [{ name: 'position', label: 'Position', type: 'number', required: true, default: 0 }],
    evaluate: (receiver, args) => {
      if (!Array.isArray(receiver) && typeof receiver !== 'string') return NOTHING;
      const i = num(args[0]);
      return i === undefined ? NOTHING : (receiver[Math.trunc(i)] ?? NOTHING);
    },
  },
];

export const ALL_BLOCKS: BlockDef[] = [...STATEMENT_BLOCKS, ...EXPRESSION_BLOCKS];

const statementMap = new Map(STATEMENT_BLOCKS.map((b) => [b.id.toLowerCase(), b]));
const expressionMap = new Map(EXPRESSION_BLOCKS.map((b) => [b.id.toLowerCase(), b]));

export const lookupStatement = (name: string): StatementBlockDef | undefined =>
  statementMap.get(name.toLowerCase());

export const lookupExpression = (name: string): ExpressionBlockDef | undefined =>
  expressionMap.get(name.toLowerCase());

export const isStatementName = (name: string): boolean => statementMap.has(name.toLowerCase());

export const isExpressionMethod = (name: string): boolean => expressionMap.has(name.toLowerCase());

const toExternalValue = (value: RuntimeValue): unknown => {
  if (isNothing(value) || isRuntimeFunction(value)) return null;
  if (Array.isArray(value)) return value.map(toExternalValue);
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toExternalValue(v)]));
  }
  return value;
};

export const getStatementTemplates = () =>
  STATEMENT_BLOCKS.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    category: b.category,
    inputs: b.inputs,
  }));

export const getExpressionTemplates = () =>
  EXPRESSION_BLOCKS.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    category: b.category,
    appliesTo: b.appliesTo,
    inputs: b.inputs,
    isProperty: b.isProperty,
  }));
