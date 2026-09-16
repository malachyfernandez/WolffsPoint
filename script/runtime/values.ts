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

export interface InputsWithDataMarker {
  readonly kind: 'inputsWithData';
}

export type RuntimeValue =
  | string
  | number
  | boolean
  | NothingValue
  | RuntimeValue[]
  | RuntimeObject
  | RuntimeFunction
  | InputsWithDataMarker;

export type RuntimeScope = Record<string, RuntimeValue>;
export type ExternalValue = unknown;

export const decodeStoredInputState = (
  state: Record<string, unknown> = {}
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(state).map(([key, value]) => {
      if (typeof value !== 'string' || value === '') return [key, value];
      try {
        return [key, JSON.parse(value)];
      } catch {
        return [key, value];
      }
    })
  );

export const isNothing = (value: unknown): value is NothingValue => value === NOTHING;

export const isRuntimeFunction = (value: RuntimeValue): value is RuntimeFunction =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  (value as { kind?: unknown }).kind === 'function';

export const isInputsWithData = (value: RuntimeValue): value is InputsWithDataMarker =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  (value as { kind?: unknown }).kind === 'inputsWithData';

export const isRuntimeObject = (value: RuntimeValue): value is RuntimeObject =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !isNothing(value) &&
  !isRuntimeFunction(value) &&
  !isInputsWithData(value);

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
  if (isNothing(value) || isRuntimeFunction(value) || isInputsWithData(value)) {
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

/** Coerce a primitive value to a boolean, Scratch-style.
 *  - boolean → itself
 *  - number → 0 is false, anything else is true
 *  - "true" → true, "false" → false, "0" → false, "1" → true,
 *    other non-empty strings → true, empty string → false
 *  - nothing → false
 *  - arrays/objects → true if non-empty */
export const toBoolean = (value: RuntimeValue): boolean => {
  if (isNothing(value)) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0 && Number.isFinite(value);
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'false' || lower === '0' || lower === '') return false;
    return true;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (isRuntimeObject(value)) return Object.keys(value).length > 0;
  return true;
};

/** Coerce a primitive value to a number, Scratch-style.
 *  - number → itself
 *  - boolean → 1 or 0
 *  - "true" → 1, "false" → 0, numeric strings → parsed number, "" → 0
 *  - nothing → 0
 *  - arrays/objects → undefined (not a number) */
export const toNumber = (value: RuntimeValue): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (isNothing(value)) return 0;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true') return 1;
    if (trimmed === 'false') return 0;
    if (trimmed === '') return 0;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
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
  // Scratch-style primitive coercion: if both are primitives but different
  // types, coerce to the most specific common type and compare.
  if (
    (typeof left === 'string' || typeof left === 'number' || typeof left === 'boolean') &&
    (typeof right === 'string' || typeof right === 'number' || typeof right === 'boolean')
  ) {
    // If either side is a boolean, coerce both to boolean
    if (typeof left === 'boolean' || typeof right === 'boolean') {
      return toBoolean(left) === toBoolean(right);
    }
    // If either side is a number, coerce both to number
    if (typeof left === 'number' || typeof right === 'number') {
      const ln = toNumber(left);
      const rn = toNumber(right);
      return ln !== undefined && rn !== undefined && ln === rn;
    }
    // Both are strings
    return left === right;
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
    // Scratch-style: "false" and "0" are falsy, empty string is falsy
    const lower = value.trim().toLowerCase();
    if (lower === 'false' || lower === '0' || lower === '') return false;
    return true;
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
