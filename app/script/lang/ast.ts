export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface SourceSpan {
  start: SourcePosition;
  end: SourcePosition;
}

export interface Diagnostic {
  message: string;
  span: SourceSpan;
  severity: 'error' | 'warning';
}

export interface NodeBase {
  span: SourceSpan;
  /** Optional comment text associated with this node (rendered above it). */
  comment?: string;
}

export interface Script extends NodeBase {
  kind: 'Script';
  statements: Statement[];
  diagnostics: Diagnostic[];
}

export interface BlockStatement extends NodeBase {
  kind: 'BlockStatement';
  statements: Statement[];
}

export interface ExpressionStatement extends NodeBase {
  kind: 'ExpressionStatement';
  expression: Expression;
}

export interface IfBranch extends NodeBase {
  condition: Expression;
  body: BlockStatement;
}

export interface IfStatement extends NodeBase {
  kind: 'IfStatement';
  branches: IfBranch[];
  elseBody?: BlockStatement;
}

export interface ForEachStatement extends NodeBase {
  kind: 'ForEachStatement';
  itemName: string;
  iterable: Expression;
  body: BlockStatement;
}

export interface FunctionTemplatePiece {
  kind: 'text' | 'input';
  text?: string;
  label?: string;
  defaultExpression?: Expression;
}

export interface FunctionStatement extends NodeBase {
  kind: 'FunctionStatement';
  name: string;
  parameters: string[];
  body: BlockStatement;
  template?: FunctionTemplatePiece[];
}

export interface ReturnStatement extends NodeBase {
  kind: 'ReturnStatement';
  value?: Expression;
}

export interface UpdateCellStatement extends NodeBase {
  kind: 'UpdateCellStatement';
  players: Expression;
  columnType: 'user' | 'day';
  dayIndex: Expression | null;
  column: Expression;
  itemName: string;
  body: BlockStatement;
  updateValue: Expression;
}

export interface OnTagAddedStatement extends NodeBase {
  kind: 'OnTagAddedStatement';
  body: BlockStatement;
}

export interface OnTagRemovedStatement extends NodeBase {
  kind: 'OnTagRemovedStatement';
  body: BlockStatement;
}

export interface ErrorStatement extends NodeBase {
  kind: 'ErrorStatement';
  source: string;
}

export type Statement =
  | BlockStatement
  | ExpressionStatement
  | IfStatement
  | ForEachStatement
  | FunctionStatement
  | ReturnStatement
  | UpdateCellStatement
  | OnTagAddedStatement
  | OnTagRemovedStatement
  | ErrorStatement;

export interface StringLiteral extends NodeBase {
  kind: 'StringLiteral';
  value: string;
}

export interface NumberLiteral extends NodeBase {
  kind: 'NumberLiteral';
  value: number;
  raw?: string;
}

export interface BooleanLiteral extends NodeBase {
  kind: 'BooleanLiteral';
  value: boolean;
}

export interface NothingLiteral extends NodeBase {
  kind: 'NothingLiteral';
}

export interface IdentifierExpression extends NodeBase {
  kind: 'IdentifierExpression';
  name: string;
}

export interface ListExpression extends NodeBase {
  kind: 'ListExpression';
  items: Expression[];
}

export interface UnaryExpression extends NodeBase {
  kind: 'UnaryExpression';
  operator: 'NOT' | '-' | '+' | 'ISTRUTHY' | 'ISFALSY';
  operand: Expression;
}

export type BinaryOperator =
  | 'OR'
  | 'AND'
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | '+'
  | '-'
  | '*'
  | '/'
  | '%';

export interface BinaryExpression extends NodeBase {
  kind: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export interface MemberExpression extends NodeBase {
  kind: 'MemberExpression';
  object: Expression;
  property: string;
}

export interface IndexExpression extends NodeBase {
  kind: 'IndexExpression';
  object: Expression;
  index: Expression;
}

export interface NamedArgument extends NodeBase {
  kind: 'NamedArgument';
  name: string;
  value: Expression;
}

export interface PositionalArgument extends NodeBase {
  kind: 'PositionalArgument';
  value: Expression;
}

export type CallArgument = NamedArgument | PositionalArgument;

export interface CallExpression extends NodeBase {
  kind: 'CallExpression';
  callee: Expression;
  arguments: CallArgument[];
}

export interface LambdaExpression extends NodeBase {
  kind: 'LambdaExpression';
  parameters: string[];
  body: Expression | BlockStatement;
}

export interface ErrorExpression extends NodeBase {
  kind: 'ErrorExpression';
  source: string;
}

export interface MarkdownLiteral extends NodeBase {
  kind: 'MarkdownLiteral';
  value: string;
}

export interface DropdownLiteral extends NodeBase {
  kind: 'DropdownLiteral';
  options: string[];
  value: string;
}

export interface ListLiteral extends NodeBase {
  kind: 'ListLiteral';
  items: string[];
}

export type Expression =
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | NothingLiteral
  | IdentifierExpression
  | ListExpression
  | UnaryExpression
  | BinaryExpression
  | MemberExpression
  | IndexExpression
  | CallExpression
  | LambdaExpression
  | MarkdownLiteral
  | DropdownLiteral
  | ListLiteral
  | ErrorExpression;

export const positionAt = (
  offset: number,
  line: number = 1,
  column: number = 1
): SourcePosition => ({
  offset,
  line,
  column,
});

export const spanFrom = (start: SourcePosition, end: SourcePosition): SourceSpan => ({
  start,
  end,
});

export const emptySpan = (): SourceSpan => spanFrom(positionAt(0), positionAt(0));
