import type {
  CallArgument,
  CallExpression,
  Expression,
  Script,
  SourceSpan,
  Statement,
} from '../lang/ast';
import { parseScript } from '../lang/parser';
import { parseScriptBlock, printExpression } from '../lang/printer';
import { substituteMarkdownVariables } from '../markdownVariables';
import {
  displayValue,
  isInputsWithData,
  isNothing,
  isRuntimeFunction,
  isRuntimeObject,
  isTruthy,
  NOTHING,
  runtimeEquals,
  toExternalValue,
  toNumber,
  toRuntimeValue,
  type RuntimeFunction,
  type RuntimeValue,
} from './values';
import {
  lookupStatement,
  lookupExpression,
  type StatementContext,
  type ExpressionContext,
  type TableUpdate,
} from '../registry';
import type { PlannedUpdate } from '../../../types/multiplayer';

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
  /** When provided, UpdateCell blocks collect updates here */
  tableUpdates?: TableUpdate[];
  /** When provided, UpdateCell blocks collect planned updates (with
   * partially-evaluated expressions) here instead of tableUpdates. */
  plannedUpdates?: PlannedUpdate[];
  /** When provided, UpdateCell blocks can read current cell values */
  getCellValue?: (playerIndex: number | null, dayIndex: number | null, column: string) => string;
  /** When set, only OnTagAdded ('added') or OnTagRemoved ('removed') blocks
   * will execute their bodies. The other type is skipped. When undefined,
   * both execute (backward compat for non-trigger contexts). */
  triggerMode?: 'added' | 'removed';
}

export interface InterpreterResult {
  value: RuntimeValue;
  output: RenderInstruction[];
  variables: Record<string, RuntimeValue>;
  inputState: Record<string, unknown>;
  issues: RuntimeIssue[];
  fuelRemaining: number;
  tableUpdates: TableUpdate[];
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

  assignOrDefine(name: string, value: RuntimeValue): void {
    const key = normalize(name);
    const existing = this.values.get(key);
    if (existing) {
      this.values.set(key, { ...existing, value });
    } else if (this.parent?.has(name)) {
      this.parent.assignOrDefine(name, value);
    } else {
      this.define(name, value);
    }
  }

  get(name: string): RuntimeValue {
    return this.values.get(normalize(name))?.value ?? this.parent?.get(name) ?? NOTHING;
  }

  has(name: string): boolean {
    return this.values.has(normalize(name)) || this.parent?.has(name) === true;
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
  private readonly tableUpdates: TableUpdate[];
  private readonly plannedUpdates: PlannedUpdate[];

  constructor(private readonly options: InterpreterOptions) {
    this.fuel = Math.max(0, Math.floor(options.fuel ?? 100_000));
    this.maxDepth = Math.max(1, Math.floor(options.maxDepth ?? 32));
    this.inputState = { ...(options.inputState ?? {}) };
    this.tableUpdates = options.tableUpdates ?? [];
    this.plannedUpdates = options.plannedUpdates ?? [];
    for (const [name, value] of Object.entries(options.globals ?? {})) {
      this.root.define(name, toRuntimeValue(value));
    }
    // InputsWithData resolves selected input values back to their full data objects
    this.root.define('InputsWithData', { kind: 'inputsWithData' } as const);
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
      tableUpdates: this.tableUpdates,
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
      case 'OnTagAddedStatement': {
        // Only execute if triggerMode is 'added' or undefined (non-trigger context)
        if (this.options.triggerMode === 'removed') return NO_RETURN;
        this.executeStatements(statement.body.statements, environment, depth);
        return NO_RETURN;
      }
      case 'OnTagRemovedStatement': {
        // Only execute if triggerMode is 'removed' or undefined (non-trigger context)
        if (this.options.triggerMode === 'added') return NO_RETURN;
        this.executeStatements(statement.body.statements, environment, depth);
        return NO_RETURN;
      }
      case 'UpdateCellStatement': {
        if (!this.options.getCellValue) {
          this.issues.push({ message: 'UpdateCell is not available in this context' });
          return NO_RETURN;
        }
        const getCellValue = this.options.getCellValue;
        const players = this.evaluate(statement.players, environment, depth);
        const playerList = Array.isArray(players) ? players : [players];
        const dayNum = statement.dayIndex
          ? (() => {
              const d = this.evaluate(statement.dayIndex, environment, depth);
              return typeof d === 'number' && Number.isFinite(d) ? Math.trunc(d) : null;
            })()
          : null;
        const col = displayValue(this.evaluate(statement.column, environment, depth));
        if (!col) {
          this.issues.push({ message: 'UpdateCell requires a column title' });
          return NO_RETURN;
        }
        const playersGlobal = environment.get('players');
        const playersArr = Array.isArray(playersGlobal) ? playersGlobal : [];

        // Helper: find the index of a player in the players list.
        // Accepts a player object (with email/realName) or a plain string
        // (matched against realName or email).
        const findPlayerIndex = (player: RuntimeValue): number | null => {
          if (typeof player === 'string') {
            const lower = player.toLowerCase();
            for (let i = 0; i < playersArr.length; i++) {
              const existing = playersArr[i] as Record<string, RuntimeValue>;
              if (
                typeof existing.realName === 'string' &&
                existing.realName.toLowerCase() === lower
              ) {
                return i;
              }
              if (typeof existing.email === 'string' && existing.email.toLowerCase() === lower) {
                return i;
              }
            }
            return null;
          }
          if (!isRuntimeObject(player)) return null;
          const p = player as Record<string, RuntimeValue>;
          const email = typeof p.email === 'string' ? p.email.toLowerCase() : '';
          const realName = typeof p.realName === 'string' ? p.realName : '';
          for (let i = 0; i < playersArr.length; i++) {
            const existing = playersArr[i] as Record<string, RuntimeValue>;
            if (
              typeof existing.email === 'string' &&
              existing.email.toLowerCase() === email &&
              email
            ) {
              return i;
            }
            if (
              typeof existing.realName === 'string' &&
              existing.realName === realName &&
              realName
            ) {
              return i;
            }
          }
          return null;
        };

        for (const player of playerList) {
          const idx = findPlayerIndex(player);
          if (idx === null) continue;

          // Get the current cell value
          const currentCellValue = getCellValue(
            idx,
            statement.columnType === 'day' ? dayNum : null,
            col
          );

          // Create a child environment with the loop variable
          const child = new Environment(environment);
          child.define(statement.itemName, currentCellValue);

          // Execute body statements
          this.executeStatements(statement.body.statements, child, depth);

          if (this.plannedUpdates.length > 0 || this.options.plannedUpdates) {
            // Planning mode: partially evaluate the update expression, keeping
            // function calls (tag, .append, etc.) but resolving all variables.
            const partialExpr = this.partialEvaluateExpression(
              statement.updateValue,
              child,
              statement.itemName,
              depth
            );
            this.plannedUpdates.push({
              playerIndex: idx,
              dayIndex: statement.columnType === 'day' ? dayNum : null,
              column: col,
              columnType: statement.columnType,
              updateExpression: printExpression(partialExpr),
              itemName: statement.itemName,
            });
          } else {
            // Execution mode: fully evaluate and collect a TableUpdate
            if (statement.columnType === 'day' && dayNum === null) {
              this.issues.push({
                message: `UpdateCell: columnType is "day" but day index is null (placedDay may be null). Skipping update to column "${col}".`,
              });
              continue;
            }
            const newValue = this.evaluate(statement.updateValue, child, depth);
            const newValueStr = displayValue(newValue);
            this.tableUpdates.push({
              playerIndex: idx,
              dayIndex: statement.columnType === 'day' ? dayNum : null,
              column: col,
              value: newValueStr,
              mode: 'replace',
            });
          }

          if (this.fuel <= 0) break;
        }
        return NO_RETURN;
      }
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
    // Resilience: coerce inputs to match expected types
    for (const input of def.inputs) {
      const key = normalize(input.name);
      if (!(key in named)) continue;
      const value = named[key];
      if (input.type === 'list') {
        if (!Array.isArray(value)) {
          named[key] = isNothing(value) ? [] : [value];
        }
      } else {
        // Non-list inputs: unwrap single-element arrays
        if (Array.isArray(value) && value.length === 1) {
          named[key] = value[0];
        }
      }
    }
    const ctx: StatementContext = {
      defineVariable: (varName, value) => environment.assignOrDefine(varName, value),
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
      collectUpdate: (update) => this.tableUpdates.push(update),
      getCellValue: this.options.getCellValue,
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

  /** Convert a runtime value to an AST literal expression for serialization. */
  private valueToExpression(value: RuntimeValue, span: SourceSpan): Expression {
    if (typeof value === 'string') return { kind: 'StringLiteral', value, span };
    if (typeof value === 'number') return { kind: 'NumberLiteral', value, span };
    if (typeof value === 'boolean') return { kind: 'BooleanLiteral', value, span };
    if (value === null || value === undefined || isNothing(value)) {
      return { kind: 'NothingLiteral', span };
    }
    if (Array.isArray(value)) {
      return {
        kind: 'ListExpression',
        items: value.map((v) => this.valueToExpression(v, span)),
        span,
      };
    }
    // For objects, fall back to a string representation
    return { kind: 'StringLiteral', value: displayValue(value), span };
  }

  /** Partially evaluate an expression: replace all variable references (except
   * the cell variable `itemName`) with their computed literal values, while
   * keeping function calls (tag(), .append(), etc.) structurally intact.
   * The result can be serialized with printExpression and later evaluated at
   * certify time with only the cell variable in scope. */
  private partialEvaluateExpression(
    expr: Expression,
    environment: Environment,
    itemName: string,
    depth: number
  ): Expression {
    const span = expr.span;
    switch (expr.kind) {
      case 'StringLiteral':
      case 'NumberLiteral':
      case 'BooleanLiteral':
      case 'NothingLiteral':
      case 'MarkdownLiteral':
      case 'DropdownLiteral':
      case 'ListLiteral':
        return expr;

      case 'IdentifierExpression':
        if (expr.name === itemName) return expr;
        // Evaluate and convert to literal
        try {
          const value = this.evaluate(expr, environment, depth);
          return this.valueToExpression(value, span);
        } catch {
          return expr;
        }

      case 'ListExpression':
        return {
          ...expr,
          items: expr.items.map((item) =>
            this.partialEvaluateExpression(item, environment, itemName, depth)
          ),
        };

      case 'UnaryExpression':
        return {
          ...expr,
          operand: this.partialEvaluateExpression(expr.operand, environment, itemName, depth),
        };

      case 'BinaryExpression':
        return {
          ...expr,
          left: this.partialEvaluateExpression(expr.left, environment, itemName, depth),
          right: this.partialEvaluateExpression(expr.right, environment, itemName, depth),
        };

      case 'MemberExpression': {
        // If object is itemName (e.g. cellContents.append), keep as-is
        if (expr.object.kind === 'IdentifierExpression' && expr.object.name === itemName) {
          return expr;
        }
        // Otherwise, try to evaluate the whole member expression
        try {
          const value = this.evaluate(expr, environment, depth);
          return this.valueToExpression(value, span);
        } catch {
          // Can't evaluate — partially evaluate the object
          return {
            ...expr,
            object: this.partialEvaluateExpression(expr.object, environment, itemName, depth),
          };
        }
      }

      case 'IndexExpression':
        return {
          ...expr,
          object: this.partialEvaluateExpression(expr.object, environment, itemName, depth),
          index: this.partialEvaluateExpression(expr.index, environment, itemName, depth),
        };

      case 'CallExpression': {
        const callee = expr.callee;
        // If callee is a method on itemName (e.g. cellContents.append(...)),
        // keep the callee as-is and partially evaluate arguments.
        if (
          callee.kind === 'MemberExpression' &&
          callee.object.kind === 'IdentifierExpression' &&
          callee.object.name === itemName
        ) {
          return {
            ...expr,
            arguments: expr.arguments.map((arg) => ({
              ...arg,
              value: this.partialEvaluateExpression(arg.value, environment, itemName, depth),
            })),
          };
        }
        // If callee is a plain function name (e.g. tag(...)),
        // keep the callee as-is and partially evaluate arguments.
        if (callee.kind === 'IdentifierExpression') {
          return {
            ...expr,
            arguments: expr.arguments.map((arg) => ({
              ...arg,
              value: this.partialEvaluateExpression(arg.value, environment, itemName, depth),
            })),
          };
        }
        // Otherwise, try to evaluate the whole call
        try {
          const value = this.evaluate(expr, environment, depth);
          return this.valueToExpression(value, span);
        } catch {
          // Can't evaluate — partially evaluate callee and arguments
          return {
            ...expr,
            callee: this.partialEvaluateExpression(callee, environment, itemName, depth),
            arguments: expr.arguments.map((arg) => ({
              ...arg,
              value: this.partialEvaluateExpression(arg.value, environment, itemName, depth),
            })),
          };
        }
      }

      case 'LambdaExpression':
        return expr;

      default:
        return expr;
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
        case 'MarkdownLiteral': {
          const values = new Map(
            expression.variables?.map((variable) => [
              variable.name,
              displayValue(this.evaluate(variable.expression, environment, depth)),
            ]) ?? []
          );
          return substituteMarkdownVariables(expression.value, values);
        }
        case 'DropdownLiteral':
          return expression.value;
        case 'ListLiteral':
          return expression.items;
        case 'NothingLiteral':
        case 'ErrorExpression':
          return NOTHING;
        case 'IdentifierExpression':
          if (!environment.has(expression.name)) {
            this.issues.push({
              message: `Unknown variable or function: ${expression.name}`,
              span: expression.span,
            });
          }
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
      // Scratch-style: try numeric comparison first, fall back to string
      const ln = toNumber(left);
      const rn = toNumber(right);
      if (ln !== undefined && rn !== undefined) {
        if (operator === '>') return ln > rn;
        if (operator === '<') return ln < rn;
        if (operator === '>=') return ln >= rn;
        return ln <= rn;
      }
      // Fall back to string comparison
      const ls = displayValue(left);
      const rs = displayValue(right);
      if (operator === '>') return ls > rs;
      if (operator === '<') return ls < rs;
      if (operator === '>=') return ls >= rs;
      return ls <= rs;
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
    // Builtin: tag("Name") — produce the encoded tag string [/TAG: "Name"/]
    if (call.callee.kind === 'IdentifierExpression' && normalize(call.callee.name) === 'tag') {
      const arg = call.arguments[0];
      if (arg) {
        const tagName = displayValue(this.evaluate(arg.value, environment, depth));
        return `[/TAG: "${tagName}"/]`;
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
    // InputsWithData: resolve selected value to full data object
    if (isInputsWithData(receiver)) {
      return this.resolveInputsWithData(name, args, span);
    }
    const def = lookupExpression(name);
    if (def) {
      // Resilience: coerce receiver to match expected type
      let resolvedReceiver: RuntimeValue = receiver;
      if (def.appliesTo === 'list') {
        if (!Array.isArray(receiver)) {
          resolvedReceiver = isNothing(receiver) ? [] : [receiver];
        }
      } else if (def.appliesTo !== 'any') {
        // Non-list methods: unwrap single-element arrays
        if (Array.isArray(receiver) && receiver.length === 1) {
          resolvedReceiver = receiver[0];
        }
      }
      const ctx: ExpressionContext = {
        evaluateLambda: (fn, item) => {
          if (!isRuntimeFunction(fn)) return NOTHING;
          return this.callFunction(fn, [item], depth + 1, span);
        },
        issues: this.issues,
      };
      try {
        return def.evaluate(resolvedReceiver, args, ctx);
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

  /**
   * Resolve InputsWithData.entry("key") — returns the full data object
   * for the selected input value, not just the stored string.
   *
   * Looks up the emitted output instruction for the given key to find
   * the options (with their meta/data), then matches the selected value
   * from inputState back to the full option object.
   */
  private resolveInputsWithData(
    method: string,
    args: RuntimeValue[],
    span: SourceSpan
  ): RuntimeValue {
    if (method.toLowerCase() !== 'entry') {
      this.issues.push({ message: `InputsWithData only supports .entry(), not .${method}`, span });
      return NOTHING;
    }
    const key = displayValue(args[0] ?? NOTHING).toLowerCase();
    const inputKey = Object.keys(this.inputState).find((k) => k.toLowerCase() === key);
    const selectedValue = inputKey ? toRuntimeValue(this.inputState[inputKey]) : NOTHING;

    // Find the emitted instruction for this key to get the options with metadata
    const instruction = this.output.find((instr) => instr.key.toLowerCase() === key);
    if (instruction?.options && Array.isArray(instruction.options)) {
      const options = instruction.options as Array<{
        value: unknown;
        label?: string;
        meta?: Record<string, unknown>;
      }>;

      // For multi-select, selectedValue is an array; for single-select, it's a primitive
      if (Array.isArray(selectedValue)) {
        return selectedValue.map((sel) => {
          const match = options.find(
            (opt) =>
              runtimeEquals(toRuntimeValue(opt.value), sel) || opt.label === displayValue(sel)
          );
          return match?.meta ? toRuntimeValue(match.meta) : sel;
        });
      }
      const match = options.find(
        (opt) =>
          runtimeEquals(toRuntimeValue(opt.value), selectedValue) ||
          opt.label === displayValue(selectedValue)
      );
      return match?.meta ? toRuntimeValue(match.meta) : selectedValue;
    }

    // No options found — return the raw selected value
    return selectedValue;
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
    return toNumber(value);
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
    const parsed =
      typeof script === 'string'
        ? script.trim().startsWith('/*script')
          ? parseScriptBlock(script)
          : parseScript(script)
        : script;
    return new Interpreter(options).run(parsed);
  } catch (error) {
    return {
      value: NOTHING,
      output: [],
      variables: {},
      inputState: { ...(options.inputState ?? {}) },
      issues: [{ message: error instanceof Error ? error.message : 'Interpreter failed' }],
      fuelRemaining: Math.max(0, Math.floor(options.fuel ?? 100_000)),
      tableUpdates: options.tableUpdates ?? [],
    };
  }
};

export const executeScript = interpretScript;
