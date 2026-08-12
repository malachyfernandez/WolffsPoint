import type { BlockStatement, Expression } from '../lang/ast';

export const NOTHING = Object.freeze({ kind: 'nothing' } as const);
export type NothingValue = typeof NOTHING;

export interface RuntimeObject {
  [key: string]: RuntimeValue;
}

export interface RuntimeFunction {
  readonly kind: 'function';
  readonly parameters: string[];
  readonly body: Expression | BlockStatement;
  readonly closure: RuntimeScope;
  readonly name?: string;
}

export type RuntimeValue =
  | string
  | number
  | boolean
  | NothingValue
  | RuntimeValue[]
  | RuntimeObject
  | RuntimeFunction;

export type RuntimeScope = Record<string, RuntimeValue>;
export type ExternalValue = unknown;

export const isNothing = (value: unknown): value is NothingValue => value === NOTHING;

export const isRuntimeFunction = (value: RuntimeValue): value is RuntimeFunction =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  (value as { kind?: unknown }).kind === 'function';

export const isRuntimeObject = (value: RuntimeValue): value is RuntimeObject =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !isNothing(value) &&
  !isRuntimeFunction(value);

export const toRuntimeValue = (
  value: ExternalValue,
  seen: Set<object> = new Set()
): RuntimeValue => {
  if (value === null || value === undefined || isNothing(value)) {
    return NOTHING;
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NOTHING;
  }
  if (typeof value !== 'object') {
    return NOTHING;
  }
  if (seen.has(value)) {
    return NOTHING;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => toRuntimeValue(item, seen));
    seen.delete(value);
    return result;
  }
  const result: RuntimeObject = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      continue;
    }
    result[key] = toRuntimeValue(item, seen);
  }
  seen.delete(value);
  return result;
};

export const toExternalValue = (value: RuntimeValue): unknown => {
  if (isNothing(value) || isRuntimeFunction(value)) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(toExternalValue);
  }
  if (isRuntimeObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toExternalValue(item)])
    );
  }
  return value;
};

export const runtimeEquals = (left: RuntimeValue, right: RuntimeValue): boolean => {
  if (left === right) {
    return true;
  }
  if (isNothing(left) || isNothing(right) || isRuntimeFunction(left) || isRuntimeFunction(right)) {
    return false;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length && left.every((item, index) => runtimeEquals(item, right[index]))
    );
  }
  if (isRuntimeObject(left) && isRuntimeObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) => key === rightKeys[index] && runtimeEquals(left[key], right[key])
      )
    );
  }
  return false;
};

export const isTruthy = (value: RuntimeValue): boolean => {
  if (isNothing(value)) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0 && Number.isFinite(value);
  }
  if (typeof value === 'string') {
    return value.length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
};

export const displayValue = (value: RuntimeValue): string => {
  if (isNothing(value)) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (isRuntimeFunction(value)) {
    return `[Function${value.name ? ` ${value.name}` : ''}]`;
  }
  try {
    return JSON.stringify(toExternalValue(value));
  } catch {
    return '';
  }
};
