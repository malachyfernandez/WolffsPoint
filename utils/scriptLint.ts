import type { Expression, Statement } from '../script/lang/ast';
import { lookupStatement } from '../script/registry';
import type { UserTableTitle } from '../types/playerTable';
import { cellColumnKind, cellExpressionKind, cellOperationDisabledReason } from './cellColumnTypes';
import {
  getFileCallParts,
  INPUT_LABEL_CALLS,
  isFileInputStatement,
  isTriggerFile,
  resolveFileRef,
  findTagFile,
  fileName,
  type FileValidationFlag,
  type ScriptFilesIndex,
} from './scriptFiles';
import { getFolderCallParts, selectFolderFiles } from './scriptFolders';

/**
 * File-role lint: the single "block flag" pass that marks statements and
 * expressions that don't belong in a file's role. Display files render into
 * cells/messages (inputs, certify globals); trigger files run when a tag is
 * placed (placed* globals, no inputs). Flags surface as red blocks in the
 * editor via the same FileValidationFlag path as validateFileReferences.
 */

export interface ScriptLintContext {
  /** The containing file/script runs in trigger context. */
  isTrigger: boolean;
  /** The containing file is a tag file (tags/ folder, header-managed meta). */
  isTagFile: boolean;
  /** File index for File() include role checks. */
  index?: ScriptFilesIndex;
}

/** Statement-level calls that declare player inputs - display-only. */
const INPUT_CALLS = INPUT_LABEL_CALLS;

const statementCallName = (stmt: Statement): string | null =>
  stmt.kind === 'ExpressionStatement' &&
  stmt.expression.kind === 'CallExpression' &&
  stmt.expression.callee.kind === 'IdentifierExpression'
    ? stmt.expression.callee.name.toLowerCase()
    : null;

/** Globals that exist only in trigger context. */
const TRIGGER_ONLY_GLOBALS = new Set(['placedtag', 'placeduser', 'placedday', 'placedcolumn']);
/** Globals that trigger context does not provide. */
const NON_TRIGGER_GLOBALS = new Set([
  'currentplayer',
  'currentday',
  'daydates',
  'schedule',
  'profiles',
  'inputs',
  'inputswithdata',
]);

/** File-include call check against the context's role. */
const roleFlagForInclude = (
  stmt: Statement,
  ref: { id?: string; path?: string },
  ctx: ScriptLintContext
): FileValidationFlag | null => {
  if (!ctx.index) return null;
  const target = resolveFileRef(ctx.index, ref);
  if (!target) return null; // missing refs are reported by validateFileReferences
  const targetTrigger = isTriggerFile(target);
  const name = fileName(target.path);
  if (ctx.isTrigger && !targetTrigger) {
    return {
      message: `"${name}" is a display file - set its type to Trigger in its header to include it here`,
      statement: stmt,
    };
  }
  if (!ctx.isTrigger && targetTrigger) {
    return {
      message: `"${name}" is a trigger file - set its type to Display in its header to include it here`,
      statement: stmt,
    };
  }
  return null;
};

/** True when a File() call is an include (pulls the file into the run), not a
 *  cell-write target. UpdateCell action values write the ref into a cell - a
 *  display file placed into a cell is legal from a trigger, so those are
 *  exempt. `inActionValue` marks that slot. */
const visitExpressionForFlags = (
  expr: Expression,
  stmt: Statement,
  ctx: ScriptLintContext,
  flags: FileValidationFlag[],
  inActionValue: boolean
) => {
  if (expr.kind === 'IdentifierExpression') {
    const name = expr.name.toLowerCase();
    if (ctx.isTrigger && NON_TRIGGER_GLOBALS.has(name)) {
      flags.push({
        message: `"${expr.name}" isn't available in trigger files`,
        expression: expr,
        statement: stmt,
      });
    } else if (!ctx.isTrigger && TRIGGER_ONLY_GLOBALS.has(name)) {
      flags.push({
        message: `"${expr.name}" only exists in trigger files`,
        expression: expr,
        statement: stmt,
      });
    }
  }
  /* tag(...) references resolve by ID or name against the tags/ folder - a
   *  rename or delete silently breaks every cell op and expression that
   *  names it, so flag unresolved literals. */
  if (ctx.index && expr.kind === 'CallExpression' && expr.callee.kind === 'IdentifierExpression') {
    const calleeName = expr.callee.name.toLowerCase();
    if (calleeName === 'tag') {
      const ref: { tagId?: string; name?: string } = {};
      for (const arg of expr.arguments) {
        if (arg.kind === 'PositionalArgument' && arg.value.kind === 'StringLiteral' && !ref.name) {
          ref.name = arg.value.value;
        }
        if (arg.kind !== 'NamedArgument' || arg.value.kind !== 'StringLiteral') continue;
        const argName = arg.name.toLowerCase();
        if (argName === 'id') ref.tagId = arg.value.value;
        else if (argName === 'name') ref.name = arg.value.value;
      }
      if ((ref.tagId || ref.name) && !findTagFile(ctx.index, ref)) {
        flags.push({
          message: `Unknown tag "${ref.name ?? ref.tagId}" - no tag file with that name/id exists`,
          expression: expr,
          statement: stmt,
        });
      }
    }
  }
  if (!inActionValue && expr.kind === 'CallExpression') {
    const callee = expr.callee;
    if (callee.kind === 'IdentifierExpression' && callee.name.toLowerCase() === 'file') {
      const ref: { id?: string; path?: string } = {};
      for (const arg of expr.arguments) {
        if (
          arg.kind === 'NamedArgument' &&
          arg.name.toLowerCase() === 'id' &&
          arg.value.kind === 'StringLiteral'
        )
          ref.id = arg.value.value;
        if (
          arg.kind === 'NamedArgument' &&
          arg.name.toLowerCase() === 'path' &&
          arg.value.kind === 'StringLiteral'
        )
          ref.path = arg.value.value;
      }
      if (ref.id !== undefined || ref.path !== undefined) {
        const flag = roleFlagForInclude(stmt, ref, ctx);
        if (flag) flags.push({ ...flag, expression: expr });
      }
    }
  }
  for (const child of expressionChildren(expr)) {
    visitExpressionForFlags(child, stmt, ctx, flags, inActionValue);
  }
};

const expressionChildren = (expr: Expression): Expression[] => {
  switch (expr.kind) {
    case 'CallExpression':
      return [expr.callee, ...expr.arguments.map((a) => a.value)];
    case 'BinaryExpression':
      return [expr.left, expr.right];
    case 'UnaryExpression':
      return [expr.operand];
    case 'MemberExpression':
      return [expr.object];
    case 'IndexExpression':
      return [expr.object, expr.index];
    case 'ListExpression':
      return [...expr.items];
    case 'LambdaExpression':
      return expr.body.kind === 'BlockStatement' ? [] : [expr.body as Expression];
    case 'MarkdownLiteral':
      return (expr.variables ?? []).map((v) => v.expression);
    default:
      return [];
  }
};

/** Nested statement bodies for recursion. */
const statementBodies = (stmt: Statement): Statement[][] => {
  switch (stmt.kind) {
    case 'IfStatement':
      return [
        ...stmt.branches.map((b) => b.body.statements),
        ...(stmt.elseBody ? [stmt.elseBody.statements] : []),
      ];
    case 'ForEachStatement':
    case 'NavButtonStatement':
    case 'DisplayGroupStatement':
    case 'FunctionStatement':
    case 'OnTagAddedStatement':
    case 'OnTagRemovedStatement':
      return [stmt.body.statements];
    case 'UpdateCellStatement':
    case 'ForEachCellStatement':
      return [stmt.body.statements];
    default:
      return [];
  }
};

const visitStatement = (stmt: Statement, ctx: ScriptLintContext, flags: FileValidationFlag[]) => {
  if (ctx.isTrigger && stmt.kind === 'NavButtonStatement') {
    flags.push({ message: 'Nav Buttons are only available in display scripts', statement: stmt });
  }
  const folder = getFolderCallParts(stmt);
  if (folder) {
    const selection = ctx.index
      ? selectFolderFiles(ctx.index, folder, ctx.isTrigger ? 'trigger' : 'display')
      : { issues: folder.issues, excluded: [] };
    flags.push(...selection.issues.map((message) => ({ message, statement: stmt })));
    for (const file of selection.excluded) {
      flags.push({ message: `Folder excludes incompatible file: ${file.path}`, statement: stmt });
    }
  }
  // Tag meta header: file-level meta managed by the file header, never a
  // block. In tag files the editor strips it before the body - one in the
  // body is a stray. Outside tags/ it does nothing.
  if (stmt.kind === 'TagStatement') {
    flags.push({
      message: ctx.isTagFile
        ? 'Tag name/color live in the file header - remove this block'
        : 'Tag headers only take effect inside the tags/ folder',
      statement: stmt,
    });
  }

  // On Tag blocks only run in trigger context.
  if (
    !ctx.isTrigger &&
    (stmt.kind === 'OnTagAddedStatement' || stmt.kind === 'OnTagRemovedStatement')
  ) {
    flags.push({
      message:
        "On Tag blocks only run in trigger files - set this file's type to Trigger or remove it",
      statement: stmt,
    });
  }

  // Inputs only exist in display context (players/type-in UI). FileInput
  // declarations are the file-mode input form.
  const callName = statementCallName(stmt);
  if (ctx.isTrigger && (isFileInputStatement(stmt) || (callName && INPUT_CALLS.has(callName)))) {
    flags.push({
      message:
        "Inputs aren't available in trigger files - set the type back to Display or remove this block",
      statement: stmt,
    });
  }

  // Statement-level File() include → role check.
  const fileCall = getFileCallParts(stmt);
  if (fileCall) {
    const flag = roleFlagForInclude(stmt, { id: fileCall.id, path: fileCall.path }, ctx);
    if (flag) flags.push(flag);
  }

  // Identifier + nested-include checks in expression positions.
  const exprs: { e: Expression; inActionValue: boolean }[] = [];
  switch (stmt.kind) {
    case 'ExpressionStatement':
      exprs.push({ e: stmt.expression, inActionValue: false });
      break;
    case 'IfStatement':
      for (const b of stmt.branches) exprs.push({ e: b.condition, inActionValue: false });
      break;
    case 'ForEachStatement':
      exprs.push({ e: stmt.iterable, inActionValue: false });
      break;
    case 'NavButtonStatement':
      exprs.push({ e: stmt.label, inActionValue: false });
      break;
    case 'DisplayGroupStatement':
      exprs.push(...stmt.arguments.map((arg) => ({ e: arg.value, inActionValue: false })));
      break;
    case 'ReturnStatement':
      if (stmt.value) exprs.push({ e: stmt.value, inActionValue: false });
      break;
    case 'UpdateCellStatement':
      exprs.push({ e: stmt.players, inActionValue: false });
      if (stmt.dayIndex) exprs.push({ e: stmt.dayIndex, inActionValue: false });
      exprs.push({ e: stmt.column, inActionValue: false });
      break;
    case 'CellOpStatement':
      // Cell-op values are cell-write targets, not file includes.
      exprs.push({ e: stmt.value, inActionValue: true });
      break;
    default:
      break;
  }
  for (const { e, inActionValue } of exprs) {
    visitExpressionForFlags(e, stmt, ctx, flags, inActionValue);
  }

  for (const body of statementBodies(stmt)) {
    body.forEach((s) => visitStatement(s, ctx, flags));
  }
};

/**
 * Lint a statement list against the file's role. Returns flags consumable by
 * the same invalid-statement/expression sets as `validateFileReferences`.
 */
export const lintScriptStatements = (
  statements: Statement[],
  ctx: ScriptLintContext
): FileValidationFlag[] => {
  const flags: FileValidationFlag[] = [...lintCellPlacement(statements)];
  statements.forEach((stmt) => visitStatement(stmt, ctx, flags));
  return flags;
};

// ---------------------------------------------------------------------------
// Cell-op placement lint
// ---------------------------------------------------------------------------

/** Where a statement sits relative to UpdateCell: 'updateCell' = inside an
 *  UpdateCell body (any depth through generic blocks), 'forEachCell' =
 *  inside a For-each-cell loop. Placement is lexical - it propagates
 *  through Function bodies the same way the parser's loop-depth does. */
type CellPlacement = 'updateCell' | 'forEachCell' | 'none';

/**
 * Structural lint for cell-op blocks - role-independent, runs in every
 * script editor. Catches blocks the move tool (or text mode) put somewhere
 * they can't run: "For Cell" outside a loop, "For All Cells" inside one,
 * any cell op outside UpdateCell, and misplaced/nested For-each loops.
 */
export const lintCellPlacement = (statements: Statement[]): FileValidationFlag[] => {
  const flags: FileValidationFlag[] = [];

  const nestedBodies = (stmt: Statement): Statement[][] => {
    switch (stmt.kind) {
      case 'IfStatement':
        return [
          ...stmt.branches.map((b) => b.body.statements),
          ...(stmt.elseBody ? [stmt.elseBody.statements] : []),
        ];
      case 'ForEachStatement':
      case 'NavButtonStatement':
      case 'DisplayGroupStatement':
      case 'OnTagAddedStatement':
      case 'OnTagRemovedStatement':
      case 'UpdateCellStatement':
      case 'ForEachCellStatement':
      case 'FunctionStatement':
        return [stmt.body.statements];
      case 'BlockStatement':
        return [stmt.statements];
      default:
        return [];
    }
  };

  const visit = (stmts: Statement[], placement: CellPlacement) => {
    for (const stmt of stmts) {
      if (placement !== 'none') {
        if (
          stmt.kind === 'NavButtonStatement' ||
          stmt.kind === 'DisplayGroupStatement' ||
          getFolderCallParts(stmt)
        ) {
          flags.push({
            message: 'Display containers cannot run inside Update Cell',
            statement: stmt,
          });
        }
        const name = statementCallName(stmt);
        const category = name ? lookupStatement(name)?.category : undefined;
        if (stmt.kind === 'ReturnStatement') {
          flags.push({
            message: 'Return does not update cells. Use a For Cell Add / Remove / Replace action.',
            statement: stmt,
          });
        } else if (
          category === 'display' ||
          category === 'input' ||
          category === 'file' ||
          getFileCallParts(stmt)
        ) {
          flags.push({
            message: 'Cell update bodies only manipulate data. Write files through a cell action.',
            statement: stmt,
          });
        }
      }
      if (stmt.kind === 'CellOpStatement') {
        if (placement === 'none') {
          flags.push({
            message: 'Cell actions only run inside an Update Cell block',
            statement: stmt,
          });
        } else if (placement === 'forEachCell' && stmt.scope === 'all') {
          flags.push({
            message:
              '"For All Cells" actions belong at the Update Cell level - inside the loop use "For Cell"',
            statement: stmt,
          });
        } else if (placement === 'updateCell' && stmt.scope === 'cell') {
          flags.push({
            message: '"For Cell" actions only work inside a For each cell loop',
            statement: stmt,
          });
        }
      } else if (stmt.kind === 'ForEachCellStatement' && placement !== 'updateCell') {
        flags.push({
          message: '"For each cell" loops only work inside an Update Cell block',
          statement: stmt,
        });
      }

      const next =
        stmt.kind === 'FunctionStatement'
          ? 'none'
          : stmt.kind === 'UpdateCellStatement'
            ? 'updateCell'
            : stmt.kind === 'ForEachCellStatement'
              ? 'forEachCell'
              : placement;
      for (const body of nestedBodies(stmt)) visit(body, next);
    }
  };

  visit(statements, 'none');
  return flags;
};

/** Column compatibility is independent of file role, including legacy script islands. */
export const lintCellColumnTypes = (
  statements: Statement[],
  titles?: UserTableTitle,
  index?: ScriptFilesIndex
): FileValidationFlag[] => {
  const flags: FileValidationFlag[] = [];
  const visit = (
    body: Statement[],
    update?: Extract<Statement, { kind: 'UpdateCellStatement' }>
  ) => {
    for (const statement of body) {
      const owner = statement.kind === 'UpdateCellStatement' ? statement : update;
      if (statement.kind === 'UpdateCellStatement' && statement.column.kind === 'StringLiteral') {
        const column = statement.column.value;
        if (!column.trim() || (titles && !cellColumnKind(titles, statement.columnType, column))) {
          flags.push({
            message: column.trim()
              ? `Column "${column}" does not exist in this column type`
              : 'Select a column for Update Cell',
            statement,
            expression: statement.column,
          });
        }
      }
      if (statement.kind === 'CellOpStatement' && owner?.column.kind === 'StringLiteral') {
        const expected = cellColumnKind(titles, owner.columnType, owner.column.value);
        const operationReason = cellOperationDisabledReason(
          expected,
          statement.scope,
          statement.op
        );
        if (operationReason) flags.push({ message: operationReason, statement });
        const actual = cellExpressionKind(statement.value);
        const empty = statement.value.kind === 'StringLiteral' && statement.value.value === '';
        if (expected && actual && expected !== actual && !empty) {
          flags.push({
            message: `"${owner.column.value}" requires ${expected === 'files' ? 'a File(...) module' : expected === 'tags' ? 'a tag(...) module' : 'a direct value'}, not ${actual === 'files' ? 'a file' : actual === 'tags' ? 'a tag' : 'text or a scalar'}`,
            statement,
            expression: statement.value,
          });
        }
        if (actual === 'files' && index) {
          const parts = getFileCallParts({
            kind: 'ExpressionStatement',
            expression: statement.value,
            span: statement.span,
          });
          const file = parts ? resolveFileRef(index, parts) : undefined;
          if (file && isTriggerFile(file))
            flags.push({
              message: 'Cell file modules must be display files, not tags or trigger files',
              statement,
              expression: statement.value,
            });
        }
      }
      for (const children of statementBodies(statement)) visit(children, owner);
      if (statement.kind === 'BlockStatement') visit(statement.statements, owner);
    }
  };
  visit(statements);
  return flags;
};
