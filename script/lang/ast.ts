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

/**
 * A cell operation block - lives inside an UpdateCell block.
 * - scope 'all' ("For All Cells"): applies the op to every cell matched by
 *   the UpdateCell selector. Valid anywhere inside UpdateCell's body.
 * - scope 'cell' ("For Cell"): applies the op to the cell currently being
 *   iterated. Only valid inside a ForEachCellStatement body.
 * Ops:
 * - 'add': append a piece (tag / text / file) contributed by this run
 * - 'remove': append a remove tombstone masking earlier matching pieces
 * - 'replace': set the cell's effective base (a SET marker on content cells,
 *   a direct field set on typed fields like voteMultiplier)
 */
export interface CellOpStatement extends NodeBase {
  kind: 'CellOpStatement';
  scope: 'all' | 'cell';
  op: 'add' | 'remove' | 'replace';
  value: Expression;
}

/**
 * "For each cell" loop - iterates the cells matched by the enclosing
 * UpdateCell, binding `itemName` (and `cellContents`) to each cell's value.
 * The body holds data manipulation plus 'cell'-scope CellOps. Only those
 * explicit operations write cells; Return has no effect in this body.
 */
export interface ForEachCellStatement extends NodeBase {
  kind: 'ForEachCellStatement';
  itemName: string;
  body: BlockStatement;
}

export interface UpdateCellStatement extends NodeBase {
  kind: 'UpdateCellStatement';
  /** Editor-only: generated body can follow column selection until its first edit. Never printed. */
  editorDefaultBody?: boolean;
  players: Expression;
  columnType: 'user' | 'day';
  dayIndex: Expression | null;
  column: Expression;
  allowDuplicates?: boolean;
  autoRemove?: boolean;
  /** Cell-op blocks: 'all'-scope CellOps, ForEachCell loops, and generic
   *  statements (e.g. an If gating an op). Legacy `{...; Return e;}` parses
   *  into a single ForEachCell. */
  body: BlockStatement;
}

/**
 * Tag file meta header - first statement of a file inside the `tags/`
 * folder. `Tag({NAME = "Infected", COLOR = "Red"})`. The file's remaining
 * statements are its on-added trigger script.
 */
export interface TagStatement extends NodeBase {
  kind: 'TagStatement';
  name: string;
  color: string;
}

export interface OnTagAddedStatement extends NodeBase {
  kind: 'OnTagAddedStatement';
  body: BlockStatement;
}

export interface OnTagRemovedStatement extends NodeBase {
  kind: 'OnTagRemovedStatement';
  body: BlockStatement;
}

export interface NavButtonStatement extends NodeBase {
  kind: 'NavButtonStatement';
  label: Expression;
  body: BlockStatement;
}

/** Internal folder-item presentation container, retained through source expansion. */
export interface DisplayGroupStatement extends NodeBase {
  kind: 'DisplayGroupStatement';
  arguments: CallArgument[];
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
  | CellOpStatement
  | ForEachCellStatement
  | OnTagAddedStatement
  | OnTagRemovedStatement
  | NavButtonStatement
  | DisplayGroupStatement
  | TagStatement
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

export interface MarkdownVariableBinding {
  name: string;
  expression: Expression;
}

export interface MarkdownLiteral extends NodeBase {
  kind: 'MarkdownLiteral';
  value: string;
  variables?: MarkdownVariableBinding[];
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
