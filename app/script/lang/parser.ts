import type {
  BinaryOperator,
  BlockStatement,
  CallArgument,
  Diagnostic,
  Expression,
  FunctionTemplatePiece,
  IfBranch,
  Script,
  SourcePosition,
  SourceSpan,
  Statement,
  UpdateCellStatement,
} from './ast';
import { tokenize, type Token } from './tokens';

export interface ParseResult {
  script: Script;
  diagnostics: Diagnostic[];
}

const BINARY_PRECEDENCE: Record<string, number> = {
  OR: 1,
  AND: 2,
  '==': 3,
  '!=': 3,
  '>': 4,
  '<': 4,
  '>=': 4,
  '<=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};

const joinSpan = (start: SourcePosition, end: SourcePosition): SourceSpan => ({ start, end });

class Parser {
  private index = 0;
  readonly diagnostics: Diagnostic[];

  constructor(
    private readonly source: string,
    private readonly tokens: Token[],
    diagnostics: Diagnostic[]
  ) {
    this.diagnostics = [...diagnostics];
  }

  parse(): Script {
    const start = this.current().span.start;
    const statements: Statement[] = [];
    while (!this.atEnd()) {
      const before = this.index;
      statements.push(this.parseStatement());
      if (this.index === before) {
        this.advance();
      }
    }
    return {
      kind: 'Script',
      statements,
      diagnostics: this.diagnostics,
      span: joinSpan(start, this.current().span.end),
    };
  }

  private parseStatement(): Statement {
    if (this.matchKeyword('IF')) {
      return this.parseIf(this.previous());
    }
    if (this.matchKeyword('FOREACH')) {
      return this.parseForEach(this.previous());
    }
    if (this.matchKeyword('FUNCTION')) {
      return this.parseFunction(this.previous());
    }
    if (this.matchKeyword('RETURN')) {
      return this.parseReturn(this.previous());
    }
    // UpdateCell container statement: UpdateCell({ ... }) { body } Return expr;
    if (
      this.isName(this.current()) &&
      this.current().text.toUpperCase() === 'UPDATECELL' &&
      this.peek(1).text === '('
    ) {
      return this.parseUpdateCell(this.current());
    }
    if (this.matchText('{')) {
      return this.parseBlockAfterOpen(this.previous());
    }
    const start = this.current().span.start;
    const expression = this.parseExpression();
    const end = this.consumeOptionalSemicolon(expression.span.end);
    if (expression.kind === 'ErrorExpression') {
      this.synchronize();
      return { kind: 'ErrorStatement', source: expression.source, span: joinSpan(start, end) };
    }
    return { kind: 'ExpressionStatement', expression, span: joinSpan(start, end) };
  }

  private parseIf(keyword: Token): Statement {
    const branches: IfBranch[] = [];
    const condition = this.parseCondition();
    const body = this.parseRequiredBlock('Expected a block after If condition');
    branches.push({ condition, body, span: joinSpan(condition.span.start, body.span.end) });
    while (this.matchKeyword('ELSEIF')) {
      const branchCondition = this.parseCondition();
      const branchBody = this.parseRequiredBlock('Expected a block after ElseIf condition');
      branches.push({
        condition: branchCondition,
        body: branchBody,
        span: joinSpan(branchCondition.span.start, branchBody.span.end),
      });
    }
    let elseBody: BlockStatement | undefined;
    if (this.matchKeyword('ELSE')) {
      if (this.matchKeyword('IF')) {
        const nested = this.parseIf(this.previous());
        if (nested.kind === 'IfStatement') {
          branches.push(...nested.branches);
          elseBody = nested.elseBody;
        }
      } else {
        elseBody = this.parseRequiredBlock('Expected a block after Else');
      }
    }
    const end = elseBody?.span.end ?? branches[branches.length - 1].span.end;
    return { kind: 'IfStatement', branches, elseBody, span: joinSpan(keyword.span.start, end) };
  }

  private parseCondition(): Expression {
    if (this.matchText('(')) {
      const expression = this.parseExpression();
      this.consumeText(')', 'Expected ) after condition');
      return expression;
    }
    return this.parseExpression();
  }

  private parseForEach(keyword: Token): Statement {
    let itemName = 'Item';
    let iterable: Expression;
    if (this.matchText('(')) {
      if (
        this.isName(this.current()) &&
        (this.peek(1).text === ',' || this.peek(1).text.toUpperCase() === 'IN')
      ) {
        itemName = this.advance().text;
        if (this.current().text.toUpperCase() === 'IN') {
          this.advance();
        } else {
          this.consumeText(',', 'Expected , after item name');
        }
        iterable = this.parseExpression();
      } else {
        iterable = this.parseExpression();
        if (this.matchText(',')) {
          itemName = this.consumeName('Expected item name').text;
        }
      }
      this.consumeText(')', 'Expected ) after ForEach arguments');
    } else {
      iterable = this.parseExpression();
    }
    const body = this.parseRequiredBlock('Expected a block after ForEach');
    return {
      kind: 'ForEachStatement',
      itemName,
      iterable,
      body,
      span: joinSpan(keyword.span.start, body.span.end),
    };
  }

  private parseUpdateCell(keyword: Token): Statement {
    this.advance(); // consume 'UpdateCell'
    this.consumeText('(', 'Expected ( after UpdateCell');
    const wrapped = this.matchText('{');
    // Parse named arguments: PLAYERS, COLUMNTYPE, DAY, COLUMN, ITEM
    let players: Expression = { kind: 'NothingLiteral', span: keyword.span };
    let columnType: 'user' | 'day' = 'user';
    let dayIndex: Expression | null = null;
    let column: Expression = { kind: 'StringLiteral', value: '', span: keyword.span };
    let itemName = 'cellContents';
    const endText = wrapped ? '}' : ')';
    while (!this.atEnd() && !this.checkText(endText)) {
      if (this.isName(this.current()) && this.peek(1).text === '=') {
        const name = this.advance().text.toUpperCase();
        this.advance(); // consume '='
        const value = this.parseExpression();
        switch (name) {
          case 'PLAYERS':
            players = value;
            break;
          case 'COLUMNTYPE':
            if (value.kind === 'StringLiteral') {
              columnType = value.value.toLowerCase() === 'day' ? 'day' : 'user';
            }
            break;
          case 'DAY':
            dayIndex = value;
            break;
          case 'COLUMN':
            column = value;
            break;
          case 'ITEM':
            if (value.kind === 'StringLiteral') itemName = value.value;
            break;
        }
      }
      if (!this.matchText(',')) break;
    }
    if (wrapped) {
      this.consumeText('}', 'Expected } after UpdateCell arguments');
    }
    this.consumeText(')', 'Expected ) after UpdateCell arguments');

    const body = this.parseRequiredBlock('Expected a block after UpdateCell');

    // Extract the Return statement as updateValue
    let updateValue: Expression = { kind: 'NothingLiteral', span: body.span };
    const bodyStatements = [...body.statements];
    const lastIdx = bodyStatements.length - 1;
    if (lastIdx >= 0 && bodyStatements[lastIdx].kind === 'ReturnStatement') {
      const ret = bodyStatements[lastIdx];
      if (ret.value) updateValue = ret.value;
      bodyStatements.pop();
    }

    const result: UpdateCellStatement = {
      kind: 'UpdateCellStatement',
      players,
      columnType,
      dayIndex,
      column,
      itemName,
      body: { kind: 'BlockStatement', statements: bodyStatements, span: body.span },
      updateValue,
      span: joinSpan(keyword.span.start, body.span.end),
    };
    return result;
  }

  private parseFunction(keyword: Token): Statement {
    const name = this.consumeName('Expected function name');
    const parameters: string[] = [];
    this.consumeText('(', 'Expected ( after function name');
    while (!this.atEnd() && !this.checkText(')')) {
      parameters.push(this.consumeName('Expected parameter name').text);
      if (!this.matchText(',')) {
        break;
      }
    }
    this.consumeText(')', 'Expected ) after parameters');

    // Optionally parse template(...) before the body
    let template: FunctionTemplatePiece[] | undefined;
    if (
      this.isName(this.current()) &&
      this.current().text === 'template' &&
      this.peek(1).text === '('
    ) {
      this.advance(); // consume 'template'
      this.consumeText('(', 'Expected ( after template');
      template = [];
      while (!this.atEnd() && !this.checkText(')')) {
        const piece = this.parseTemplatePiece();
        if (piece) template.push(piece);
        if (!this.matchText(',')) {
          break;
        }
      }
      this.consumeText(')', 'Expected ) after template');
    }

    const body = this.parseRequiredBlock('Expected function body');
    return {
      kind: 'FunctionStatement',
      name: name.text,
      parameters,
      body,
      template,
      span: joinSpan(keyword.span.start, body.span.end),
    };
  }

  private parseTemplatePiece(): FunctionTemplatePiece | null {
    // input(label, defaultExpr) → input piece
    if (
      this.isName(this.current()) &&
      this.current().text === 'input' &&
      this.peek(1).text === '('
    ) {
      this.advance(); // consume 'input'
      this.consumeText('(', 'Expected ( after input');
      const labelExpr = this.parseExpression();
      const label = labelExpr.kind === 'StringLiteral' ? labelExpr.value : '';
      let defaultExpression: Expression | undefined;
      if (this.matchText(',')) {
        defaultExpression = this.parseExpression();
      }
      this.consumeText(')', 'Expected ) after input');
      return { kind: 'input', label, defaultExpression };
    }
    // String literal → text piece
    const expr = this.parseExpression();
    if (expr.kind === 'StringLiteral') {
      return { kind: 'text', text: expr.value };
    }
    // Fallback: treat any other expression as an input with no label
    return { kind: 'input', defaultExpression: expr };
  }

  private parseReturn(keyword: Token): Statement {
    if (this.checkText(';') || this.checkText('}') || this.atEnd()) {
      const end = this.consumeOptionalSemicolon(keyword.span.end);
      return { kind: 'ReturnStatement', span: joinSpan(keyword.span.start, end) };
    }
    const value = this.parseExpression();
    const end = this.consumeOptionalSemicolon(value.span.end);
    return { kind: 'ReturnStatement', value, span: joinSpan(keyword.span.start, end) };
  }

  private parseRequiredBlock(message: string): BlockStatement {
    if (this.matchText('{')) {
      return this.parseBlockAfterOpen(this.previous());
    }
    this.error(this.current(), message);
    const statement = this.parseStatement();
    return { kind: 'BlockStatement', statements: [statement], span: statement.span };
  }

  private parseBlockAfterOpen(open: Token): BlockStatement {
    const statements: Statement[] = [];
    while (!this.atEnd() && !this.checkText('}')) {
      const before = this.index;
      statements.push(this.parseStatement());
      if (this.index === before) {
        this.advance();
      }
    }
    const close = this.consumeText('}', 'Expected } after block');
    return { kind: 'BlockStatement', statements, span: joinSpan(open.span.start, close.span.end) };
  }

  private parseExpression(minimumPrecedence: number = 0): Expression {
    let left = this.parsePrefix();
    left = this.parsePostfix(left);
    while (true) {
      const operator = this.operatorText(this.current());
      const precedence = operator === undefined ? undefined : BINARY_PRECEDENCE[operator];
      if (precedence === undefined || precedence < minimumPrecedence) {
        break;
      }
      this.advance();
      const right = this.parseExpression(precedence + 1);
      left = {
        kind: 'BinaryExpression',
        operator: operator as BinaryOperator,
        left,
        right,
        span: joinSpan(left.span.start, right.span.end),
      };
    }
    return left;
  }

  private parsePrefix(): Expression {
    const token = this.advance();
    if (token.kind === 'String') {
      return { kind: 'StringLiteral', value: String(token.value ?? ''), span: token.span };
    }
    if (token.kind === 'BacktickString') {
      return { kind: 'MarkdownLiteral', value: String(token.value ?? ''), span: token.span };
    }
    if (token.kind === 'Number') {
      return {
        kind: 'NumberLiteral',
        value: Number(token.value),
        raw: token.text,
        span: token.span,
      };
    }
    const upper = token.text.toUpperCase();
    if (upper === 'TRUE' || upper === 'FALSE') {
      return { kind: 'BooleanLiteral', value: upper === 'TRUE', span: token.span };
    }
    if (upper === 'NOTHING') {
      return { kind: 'NothingLiteral', span: token.span };
    }
    if (upper === 'NOT' || token.text === '-' || token.text === '+') {
      const operand = this.parseExpression(7);
      return {
        kind: 'UnaryExpression',
        operator: upper === 'NOT' ? 'NOT' : (token.text as '-' | '+'),
        operand,
        span: joinSpan(token.span.start, operand.span.end),
      };
    }
    if (upper === 'ISTRUTHY' || upper === 'ISFALSY') {
      const operand = this.parseExpression(7);
      return {
        kind: 'UnaryExpression',
        operator: upper === 'ISTRUTHY' ? 'ISTRUTHY' : 'ISFALSY',
        operand,
        span: joinSpan(token.span.start, operand.span.end),
      };
    }
    if (this.isName(token)) {
      if (token.text === 'Dropdown' && this.current().text === '(') {
        this.consumeText('(', 'Expected ( after Dropdown');
        const valueExpr = this.parseExpression();
        this.consumeText(',', 'Expected , after Dropdown value');
        this.consumeText('[', 'Expected [ for Dropdown options');
        const options: string[] = [];
        while (!this.atEnd() && !this.checkText(']')) {
          const optExpr = this.parseExpression();
          if (optExpr.kind === 'StringLiteral') {
            options.push(optExpr.value);
          }
          if (!this.matchText(',')) {
            break;
          }
        }
        this.consumeText(']', 'Expected ] after Dropdown options');
        const close = this.consumeText(')', 'Expected ) after Dropdown');
        const value = valueExpr.kind === 'StringLiteral' ? valueExpr.value : '';
        return {
          kind: 'DropdownLiteral',
          options,
          value,
          span: joinSpan(token.span.start, close.span.end),
        };
      }
      if (this.matchText('=>')) {
        const body = this.checkText('{')
          ? this.parseRequiredBlock('Expected lambda body')
          : this.parseExpression();
        return {
          kind: 'LambdaExpression',
          parameters: [token.text],
          body,
          span: joinSpan(token.span.start, body.span.end),
        };
      }
      return { kind: 'IdentifierExpression', name: token.text, span: token.span };
    }
    if (token.text === '[') {
      const items: Expression[] = [];
      while (!this.atEnd() && !this.checkText(']')) {
        items.push(this.parseExpression());
        if (!this.matchText(',')) {
          break;
        }
      }
      const close = this.consumeText(']', 'Expected ] after list');
      return { kind: 'ListExpression', items, span: joinSpan(token.span.start, close.span.end) };
    }
    if (token.text === '(') {
      const lambdaIndex = this.findParenthesizedLambda(this.index);
      if (lambdaIndex !== -1) {
        const parameters: string[] = [];
        while (!this.atEnd() && !this.checkText(')')) {
          parameters.push(this.consumeName('Expected lambda parameter').text);
          if (!this.matchText(',')) {
            break;
          }
        }
        this.consumeText(')', 'Expected ) after lambda parameters');
        this.consumeText('=>', 'Expected => after lambda parameters');
        const body = this.checkText('{')
          ? this.parseRequiredBlock('Expected lambda body')
          : this.parseExpression();
        return {
          kind: 'LambdaExpression',
          parameters,
          body,
          span: joinSpan(token.span.start, body.span.end),
        };
      }
      const expression = this.parseExpression();
      const close = this.consumeText(')', 'Expected ) after expression');
      return { ...expression, span: joinSpan(token.span.start, close.span.end) };
    }
    this.error(token, `Expected expression, found ${token.text || 'end of input'}`);
    return { kind: 'ErrorExpression', source: token.text, span: token.span };
  }

  private parsePostfix(initial: Expression): Expression {
    let expression = initial;
    while (true) {
      if (this.matchText('.')) {
        const property = this.consumeName('Expected property name after .');
        expression = {
          kind: 'MemberExpression',
          object: expression,
          property: property.text,
          span: joinSpan(expression.span.start, property.span.end),
        };
        continue;
      }
      if (this.matchText('[')) {
        const index = this.parseExpression();
        const close = this.consumeText(']', 'Expected ] after index');
        expression = {
          kind: 'IndexExpression',
          object: expression,
          index,
          span: joinSpan(expression.span.start, close.span.end),
        };
        continue;
      }
      if (this.matchText('(')) {
        const argumentsList = this.parseCallArguments();
        const close = this.consumeText(')', 'Expected ) after arguments');
        expression = {
          kind: 'CallExpression',
          callee: expression,
          arguments: argumentsList,
          span: joinSpan(expression.span.start, close.span.end),
        };
        continue;
      }
      break;
    }
    return expression;
  }

  private parseCallArguments(): CallArgument[] {
    const argumentsList: CallArgument[] = [];
    const wrapped = this.matchText('{');
    const endText = wrapped ? '}' : ')';
    while (!this.atEnd() && !this.checkText(endText)) {
      const start = this.current().span.start;
      if (this.isName(this.current()) && this.peek(1).text === '=') {
        const name = this.advance();
        this.advance();
        const value = this.parseExpression();
        argumentsList.push({
          kind: 'NamedArgument',
          name: name.text,
          value,
          span: joinSpan(start, value.span.end),
        });
      } else {
        const value = this.parseExpression();
        argumentsList.push({ kind: 'PositionalArgument', value, span: value.span });
      }
      if (!this.matchText(',')) {
        break;
      }
    }
    if (wrapped) {
      this.consumeText('}', 'Expected } after named arguments');
    }
    return argumentsList;
  }

  private findParenthesizedLambda(start: number): number {
    let cursor = start;
    if (this.tokens[cursor]?.text === ')') {
      return this.tokens[cursor + 1]?.text === '=>' ? cursor : -1;
    }
    while (this.isName(this.tokens[cursor])) {
      cursor += 1;
      if (this.tokens[cursor]?.text === ')') {
        return this.tokens[cursor + 1]?.text === '=>' ? cursor : -1;
      }
      if (this.tokens[cursor]?.text !== ',') {
        return -1;
      }
      cursor += 1;
    }
    return -1;
  }

  private operatorText(token: Token): string | undefined {
    const upper = token.text.toUpperCase();
    return Object.prototype.hasOwnProperty.call(BINARY_PRECEDENCE, upper) ? upper : undefined;
  }

  private consumeOptionalSemicolon(fallback: SourcePosition): SourcePosition {
    return this.matchText(';') ? this.previous().span.end : fallback;
  }

  private synchronize(): void {
    while (!this.atEnd()) {
      if (this.previous().text === ';' || this.checkText('}')) {
        return;
      }
      if (
        ['IF', 'FOREACH', 'FUNCTION', 'RETURN', 'VARIABLE'].includes(
          this.current().text.toUpperCase()
        )
      ) {
        return;
      }
      this.advance();
    }
  }

  private consumeName(message: string): Token {
    if (this.isName(this.current())) {
      return this.advance();
    }
    return this.synthetic(message);
  }

  private consumeText(text: string, message: string): Token {
    if (this.checkText(text)) {
      return this.advance();
    }
    return this.synthetic(message);
  }

  private synthetic(message: string): Token {
    const token = this.current();
    this.error(token, message);
    return { kind: 'Unknown', text: '', span: { start: token.span.start, end: token.span.start } };
  }

  private error(token: Token, message: string): void {
    this.diagnostics.push({ message, span: token.span, severity: 'error' });
  }

  private isName(token: Token | undefined): boolean {
    return token !== undefined && (token.kind === 'Identifier' || token.kind === 'Keyword');
  }

  private matchKeyword(keyword: string): boolean {
    if (this.current().text.toUpperCase() !== keyword) {
      return false;
    }
    this.advance();
    return true;
  }

  private matchText(text: string): boolean {
    if (!this.checkText(text)) {
      return false;
    }
    this.advance();
    return true;
  }

  private checkText(text: string): boolean {
    return this.current().text === text;
  }

  private current(): Token {
    return this.tokens[this.index];
  }

  private previous(): Token {
    return this.tokens[Math.max(0, this.index - 1)];
  }

  private peek(distance: number): Token {
    return this.tokens[Math.min(this.tokens.length - 1, this.index + distance)];
  }

  private advance(): Token {
    const token = this.current();
    if (!this.atEnd()) {
      this.index += 1;
    }
    return token;
  }

  private atEnd(): boolean {
    return this.current().kind === 'EOF';
  }
}

export const parseScriptWithDiagnostics = (source: string): ParseResult => {
  const tokenized = tokenize(source);
  const parser = new Parser(source, tokenized.tokens, tokenized.diagnostics);
  const script = parser.parse();
  return { script, diagnostics: script.diagnostics };
};

export const parseScript = (source: string): Script => parseScriptWithDiagnostics(source).script;

export const parseExpression = (source: string): Expression => {
  const result = parseScript(source);
  const statement = result.statements[0];
  if (statement?.kind === 'ExpressionStatement') {
    return statement.expression;
  }
  return {
    kind: 'ErrorExpression',
    source,
    span: result.span,
  };
};
