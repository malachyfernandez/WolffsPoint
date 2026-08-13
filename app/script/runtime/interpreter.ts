import type {
  CallArgument,
  CallExpression,
  Expression,
  Script,
  SourceSpan,
  Statement,
} from '../lang/ast';
import { parseScript } from '../lang/parser';
import {
  displayValue,
  isNothing,
  isRuntimeFunction,
  isRuntimeObject,
  isTruthy,
  NOTHING,
  runtimeEquals,
  toExternalValue,
  toRuntimeValue,
  type RuntimeFunction,
  type RuntimeValue,
} from './values';
import {
  lookupStatement,
  lookupExpression,
  type StatementContext,
  type ExpressionContext,
} from '../registry';

export type RenderInstructionKind =
  | 'select'
  | 'text'
  | 'number'
  | 'checkbox'
  | 'markdown'
  | 'divider';

export interface RenderInstruction {
  kind: RenderInstructionKind;
  key: string;
  label?: string;
  value?: unknown;
  options?: unknown[];
  multiple?: boolean;
  numberSelectable?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  markdown?: string;
  inset?: number;
  props: Record<string, unknown>;
  span: SourceSpan;
}

export interface RuntimeIssue {
  message: string;
  span?: SourceSpan;
}

export interface InterpreterOptions {
  globals?: Record<string, unknown>;
  inputState?: Record<string, unknown>;
  fuel?: number;
  maxDepth?: number;
}

export interface InterpreterResult {
  value: RuntimeValue;
  output: RenderInstruction[];
  variables: Record<string, RuntimeValue>;
  inputState: Record<string, unknown>;
  issues: RuntimeIssue[];
  fuelRemaining: number;
}

interface ReturnSignal {
  returned: true;
  value: RuntimeValue;
}

const NO_RETURN = { returned: false } as const;
type StatementResult = ReturnSignal | typeof NO_RETURN;

const normalize = (name: string): string => name.toLowerCase();

class Environment {
  private readonly values = new Map<string, { name: string; value: RuntimeValue }>();

  constructor(readonly parent?: Environment) {}

  define(name: string, value: RuntimeValue): void {
    this.values.set(normalize(name), { name, value });
  }

  get(name: string): RuntimeValue {
    return this.values.get(normalize(name))?.value ?? this.parent?.get(name) ?? NOTHING;
  }

  snapshot(): Record<string, RuntimeValue> {
    const result = this.parent?.snapshot() ?? {};
    for (const entry of this.values.values()) {
      result[entry.name] = entry.value;
    }
    return result;
  }
}

class Interpreter {
  private fuel: number;
  private readonly maxDepth: number;
  private readonly root = new Environment();
  private readonly output: RenderInstruction[] = [];
  private readonly issues: RuntimeIssue[] = [];
  private readonly inputState: Record<string, unknown>;

  constructor(private readonly options: InterpreterOptions) {
    this.fuel = Math.max(0, Math.floor(options.fuel ?? 100_000));
    this.maxDepth = Math.max(1, Math.floor(options.maxDepth ?? 32));
    this.inputState = { ...(options.inputState ?? {}) };
    for (const [name, value] of Object.entries(options.globals ?? {})) {
      this.root.define(name, toRuntimeValue(value));
    }
  }

  run(script: Script): InterpreterResult {
    for (const diagnostic of script.diagnostics) {
      this.issues.push({ message: diagnostic.message, span: diagnostic.span });
    }
    try {
      const result = this.executeStatements(script.statements, this.root, 0);
      return this.result(result.returned ? result.value : NOTHING);
    } catch (error) {
      this.issues.push({
        message: error instanceof Error ? error.message : 'Unknown interpreter failure',
      });
      return this.result(NOTHING);
    }
  }

  private result(value: RuntimeValue): InterpreterResult {
    return {
      value,
      output: this.output,
      variables: this.root.snapshot(),
      inputState: this.inputState,
      issues: this.issues,
      fuelRemaining: this.fuel,
    };
  }

  private spend(span?: SourceSpan): boolean {
    if (this.fuel <= 0) {
      if (!this.issues.some((issue) => issue.message === 'Execution fuel exhausted')) {
        this.issues.push({ message: 'Execution fuel exhausted', span });
      }
      return false;
    }
    this.fuel -= 1;
    return true;
  }

  private depthAllowed(depth: number, span?: SourceSpan): boolean {
    if (depth <= this.maxDepth) {
      return true;
    }
    this.issues.push({ message: `Maximum call depth of ${this.maxDepth} exceeded`, span });
    return false;
  }

  private executeStatements(
    statements: Statement[],
    environment: Environment,
    depth: number
  ): StatementResult {
    // Hoist function declarations so they can be called before their definition
    for (const statement of statements) {
      if (statement.kind === 'FunctionStatement') {
        const closure = environment.snapshot();
        const runtimeFunction: RuntimeFunction = {
          kind: 'function',
          name: statement.name,
          parameters: statement.parameters,
          body: statement.body,
          closure,
        };
        closure[statement.name] = runtimeFunction;
        environment.define(statement.name, runtimeFunction);
      }
    }
    for (const statement of statements) {
      const result = this.executeStatement(statement, environment, depth);
      if (result.returned) {
        return result;
      }
      if (this.fuel <= 0) {
        break;
      }
    }
    return NO_RETURN;
  }

  private executeStatement(
    statement: Statement,
    environment: Environment,
    depth: number
  ): StatementResult {
    if (!this.spend(statement.span)) {
      return NO_RETURN;
    }
    switch (statement.kind) {
      case 'BlockStatement':
        return this.executeStatements(statement.statements, new Environment(environment), depth);
      case 'ExpressionStatement':
        this.executeExpressionStatement(statement.expression, environment, depth);
        return NO_RETURN;
      case 'IfStatement':
        for (const branch of statement.branches) {
          if (isTruthy(this.evaluate(branch.condition, environment, depth))) {
            return this.executeStatements(
              branch.body.statements,
              new Environment(environment),
              depth
            );
          }
        }
        return statement.elseBody
          ? this.executeStatements(
              statement.elseBody.statements,
              new Environment(environment),
              depth
            )
          : NO_RETURN;
      case 'ForEachStatement': {
        const iterable = this.evaluate(statement.iterable, environment, depth);
        if (!Array.isArray(iterable)) {
          this.issues.push({ message: 'ForEach requires a list', span: statement.iterable.span });
          return NO_RETURN;
        }
        for (const item of iterable) {
          const child = new Environment(environment);
          child.define(statement.itemName, item);
          const result = this.executeStatements(statement.body.statements, child, depth);
          if (result.returned) {
            return result;
          }
          if (this.fuel <= 0) {
            break;
          }
        }
        return NO_RETURN;
      }
      case 'FunctionStatement': {
        const closure = environment.snapshot();
        const runtimeFunction: RuntimeFunction = {
          kind: 'function',
          name: statement.name,
          parameters: statement.parameters,
          body: statement.body,
          closure,
        };
        closure[statement.name] = runtimeFunction;
        environment.define(statement.name, runtimeFunction);
        return NO_RETURN;
      }
      case 'ReturnStatement':
        return {
          returned: true,
          value: statement.value ? this.evaluate(statement.value, environment, depth) : NOTHING,
        };
      case 'ErrorStatement':
        this.issues.push({
          message: `Skipped invalid statement: ${statement.source}`,
          span: statement.span,
        });
        return NO_RETURN;
    }
  }

  private executeExpressionStatement(
    expression: Expression,
    environment: Environment,
    depth: number
  ): void {
    if (expression.kind !== 'CallExpression' || expression.callee.kind !== 'IdentifierExpression') {
      this.evaluate(expression, environment, depth);
      return;
    }
    const name = expression.callee.name;
    const def = lookupStatement(name);
    if (!def) {
      this.evaluate(expression, environment, depth);
      return;
    }
    const named = this.namedArguments(expression.arguments, environment, depth);
    const ctx: StatementContext = {
      defineVariable: (varName, value) => environment.define(varName, value),
      emit: (instruction) => {
        const key = String(
          instruction.key ||
            instruction.name ||
            instruction.label ||
            `${instruction.kind}-${this.output.length}`
        );
        const value = (instruction.value ??
          (key in this.inputState
            ? toRuntimeValue(this.inputState[key])
            : NOTHING)) as RuntimeValue;
        const props = Object.fromEntries(
          Object.entries(instruction).map(([k, v]) => [k, toExternalValue(v as RuntimeValue)])
        );
        this.output.push({
          kind: instruction.kind as RenderInstructionKind,
          key,
          label: this.optionalString(instruction.label as RuntimeValue | undefined),
          value: toExternalValue(value),
          options: Array.isArray(instruction.options)
            ? (instruction.options as RuntimeValue[]).map(toExternalValue)
            : undefined,
          multiple: instruction.multiple as boolean | undefined,
          numberSelectable: instruction.numberSelectable as number | undefined,
          min: instruction.min as number | undefined,
          max: instruction.max as number | undefined,
          placeholder: this.optionalString(instruction.placeholder as RuntimeValue | undefined),
          disabled: instruction.disabled as boolean | undefined,
          markdown: this.optionalString(instruction.markdown as RuntimeValue | undefined),
          inset: instruction.inset as number | undefined,
          props,
          span: expression.span,
        });
      },
      getVariable: (varName) => environment.get(varName),
      getInputState: () => this.inputState,
      issues: this.issues,
    };
    try {
      def.execute(named, ctx);
    } catch (error) {
      this.issues.push({
        message: error instanceof Error ? error.message : `${def.name} failed`,
        span: expression.span,
      });
    }
  }

  private evaluate(expression: Expression, environment: Environment, depth: number): RuntimeValue {
    if (!this.spend(expression.span) || !this.depthAllowed(depth, expression.span)) {
      return NOTHING;
    }
    try {
      switch (expression.kind) {
        case 'StringLiteral':
        case 'NumberLiteral':
        case 'BooleanLiteral':
          return expression.value;
        case 'MarkdownLiteral':
          return expression.value;
        case 'DropdownLiteral':
          return expression.value;
        case 'NothingLiteral':
        case 'ErrorExpression':
          return NOTHING;
        case 'IdentifierExpression':
          return environment.get(expression.name);
        case 'ListExpression':
          return expression.items.map((item) => this.evaluate(item, environment, depth));
        case 'UnaryExpression': {
          const operand = this.evaluate(expression.operand, environment, depth);
          if (expression.operator === 'NOT') {
            return !isTruthy(operand);
          }
          if (expression.operator === 'ISTRUTHY') {
            return isTruthy(operand);
          }
          if (expression.operator === 'ISFALSY') {
            return !isTruthy(operand);
          }
          const number = this.number(operand);
          return number === undefined ? NOTHING : expression.operator === '-' ? -number : number;
        }
        case 'BinaryExpression':
          return this.evaluateBinary(
            expression.operator,
            expression.left,
            expression.right,
            environment,
            depth
          );
        case 'MemberExpression': {
          const object = this.evaluate(expression.object, environment, depth);
          return this.readMember(object, expression.property);
        }
        case 'IndexExpression': {
          const object = this.evaluate(expression.object, environment, depth);
          const index = this.evaluate(expression.index, environment, depth);
          return this.readIndex(object, index);
        }
        case 'LambdaExpression':
          return {
            kind: 'function',
            parameters: expression.parameters,
            body: expression.body,
            closure: environment.snapshot(),
          };
        case 'CallExpression':
          return this.evaluateCall(expression, environment, depth);
      }
    } catch (error) {
      this.issues.push({
        message: error instanceof Error ? error.message : 'Expression evaluation failed',
        span: expression.span,
      });
      return NOTHING;
    }
  }

  private evaluateBinary(
    operator: string,
    leftExpression: Expression,
    rightExpression: Expression,
    environment: Environment,
    depth: number
  ): RuntimeValue {
    const left = this.evaluate(leftExpression, environment, depth);
    if (operator === 'AND' && !isTruthy(left)) {
      return false;
    }
    if (operator === 'OR' && isTruthy(left)) {
      return true;
    }
    const right = this.evaluate(rightExpression, environment, depth);
    if (operator === 'AND') {
      return isTruthy(right);
    }
    if (operator === 'OR') {
      return isTruthy(right);
    }
    if (operator === '==') {
      return runtimeEquals(left, right);
    }
    if (operator === '!=') {
      return !runtimeEquals(left, right);
    }
    if (['>', '<', '>=', '<='].includes(operator)) {
      if ((typeof left !== 'number' && typeof left !== 'string') || typeof left !== typeof right) {
        return false;
      }
      if (operator === '>') return left > right;
      if (operator === '<') return left < right;
      if (operator === '>=') return left >= right;
      return left <= right;
    }
    if (operator === '+' && (typeof left === 'string' || typeof right === 'string')) {
      return displayValue(left) + displayValue(right);
    }
    const leftNumber = this.number(left);
    const rightNumber = this.number(right);
    if (leftNumber === undefined || rightNumber === undefined) {
      return NOTHING;
    }
    if (operator === '+') return leftNumber + rightNumber;
    if (operator === '-') return leftNumber - rightNumber;
    if (operator === '*') return leftNumber * rightNumber;
    if ((operator === '/' || operator === '%') && rightNumber === 0) return NOTHING;
    if (operator === '/') return leftNumber / rightNumber;
    if (operator === '%') return leftNumber % rightNumber;
    return NOTHING;
  }

  private evaluateCall(
    call: CallExpression,
    environment: Environment,
    depth: number
  ): RuntimeValue {
    if (call.callee.kind === 'MemberExpression') {
      const receiver = this.evaluate(call.callee.object, environment, depth);
      const args = call.arguments.map((argument) =>
        this.evaluate(argument.value, environment, depth)
      );
      return this.callMethod(receiver, call.callee.property, args, depth, call.span);
    }
    // Builtin: Var("name") — look up a variable by name
    if (call.callee.kind === 'IdentifierExpression' && normalize(call.callee.name) === 'var') {
      const arg = call.arguments[0];
      if (arg) {
        const rawName = displayValue(this.evaluate(arg.value, environment, depth));
        const varName = rawName.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');
        return environment.get(varName);
      }
      return NOTHING;
    }
    const callable = this.evaluate(call.callee, environment, depth);
    if (!isRuntimeFunction(callable)) {
      this.issues.push({ message: 'Value is not callable', span: call.callee.span });
      return NOTHING;
    }
    const evaluated = call.arguments.map((argument) => ({
      argument,
      value: this.evaluate(argument.value, environment, depth),
    }));
    const positional = evaluated
      .filter(({ argument }) => argument.kind === 'PositionalArgument')
      .map(({ value }) => value);
    const named = new Map(
      evaluated
        .filter(({ argument }) => argument.kind === 'NamedArgument')
        .map(({ argument, value }) => [
          normalize(argument.kind === 'NamedArgument' ? argument.name : ''),
          value,
        ])
    );
    const args = callable.parameters.map(
      (parameter, index) => named.get(normalize(parameter)) ?? positional[index] ?? NOTHING
    );
    return this.callFunction(callable, args, depth + 1, call.span);
  }

  private callFunction(
    callable: RuntimeFunction,
    args: RuntimeValue[],
    depth: number,
    span?: SourceSpan
  ): RuntimeValue {
    if (!this.depthAllowed(depth, span)) {
      return NOTHING;
    }
    const closure = new Environment();
    for (const [name, value] of Object.entries(callable.closure)) {
      closure.define(name, value);
    }
    callable.parameters.forEach((parameter, index) =>
      closure.define(parameter, args[index] ?? NOTHING)
    );
    const value =
      callable.body.kind === 'BlockStatement'
        ? (() => {
            const result = this.executeStatements(callable.body.statements, closure, depth);
            return result.returned ? result.value : NOTHING;
          })()
        : this.evaluate(callable.body, closure, depth);
    return value;
  }

  private callMethod(
    receiver: RuntimeValue,
    name: string,
    args: RuntimeValue[],
    depth: number,
    span: SourceSpan
  ): RuntimeValue {
    const def = lookupExpression(name);
    if (def) {
      const ctx: ExpressionContext = {
        evaluateLambda: (fn, item) => {
          if (!isRuntimeFunction(fn)) return NOTHING;
          return this.callFunction(fn, [item], depth + 1, span);
        },
        issues: this.issues,
      };
      try {
        return def.evaluate(receiver, args, ctx);
      } catch (error) {
        this.issues.push({
          message: error instanceof Error ? error.message : `${def.name} failed`,
          span,
        });
        return NOTHING;
      }
    }
    this.issues.push({ message: `Unsupported method ${name}`, span });
    return NOTHING;
  }

  private readMember(value: RuntimeValue, property: string): RuntimeValue {
    // Only registry-defined property expressions work (length, floor, etc.)
    // Direct field access on objects is NOT supported — use .entry("key") instead
    const def = lookupExpression(property);
    if (def && def.isProperty) {
      try {
        return def.evaluate(value, [], {
          evaluateLambda: () => NOTHING,
          issues: this.issues,
        });
      } catch {
        return NOTHING;
      }
    }
    this.issues.push({
      message: `Unknown property .${property} — use .entry("${property}") to access object fields`,
      span: undefined,
    });
    return NOTHING;
  }

  private readIndex(value: RuntimeValue, index: RuntimeValue): RuntimeValue {
    if (Array.isArray(value)) {
      const numeric = this.number(index);
      return numeric === undefined ? NOTHING : (value[Math.trunc(numeric)] ?? NOTHING);
    }
    if (typeof value === 'string') {
      const numeric = this.number(index);
      return numeric === undefined ? NOTHING : (value[Math.trunc(numeric)] ?? NOTHING);
    }
    if (isRuntimeObject(value) && typeof index === 'string') {
      return (value as Record<string, RuntimeValue>)[index] ?? NOTHING;
    }
    return NOTHING;
  }

  private number(value: RuntimeValue): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private namedArguments(
    args: CallArgument[],
    environment: Environment,
    depth: number
  ): Record<string, RuntimeValue> {
    const result: Record<string, RuntimeValue> = {};
    const positional: RuntimeValue[] = [];
    args.forEach((argument) => {
      const value = this.evaluate(argument.value, environment, depth);
      if (argument.kind === 'NamedArgument') {
        result[normalize(argument.name)] = value;
      } else {
        positional.push(value);
      }
    });
    positional.forEach((value, index) => {
      result[String(index)] = value;
    });
    return result;
  }

  private optionalString(value: RuntimeValue | undefined): string | undefined {
    return value === undefined || isNothing(value) ? undefined : displayValue(value);
  }

  private optionalBoolean(value: RuntimeValue | undefined): boolean | undefined {
    return value === undefined || isNothing(value) ? undefined : isTruthy(value);
  }

  private optionalNumber(value: RuntimeValue | undefined): number | undefined {
    return value === undefined ? undefined : this.number(value);
  }
}

export const interpretScript = (
  script: Script | string,
  options: InterpreterOptions = {}
): InterpreterResult => {
  try {
    const parsed = typeof script === 'string' ? parseScript(script) : script;
    return new Interpreter(options).run(parsed);
  } catch (error) {
    return {
      value: NOTHING,
      output: [],
      variables: {},
      inputState: { ...(options.inputState ?? {}) },
      issues: [{ message: error instanceof Error ? error.message : 'Interpreter failed' }],
      fuelRemaining: Math.max(0, Math.floor(options.fuel ?? 100_000)),
    };
  }
};

export const executeScript = interpretScript;
