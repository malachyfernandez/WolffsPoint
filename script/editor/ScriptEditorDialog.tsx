import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Animated, Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import {
  Copy,
  Eye,
  FolderInput,
  Move,
  Plus,
  Redo2,
  Tag,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react-native';
import ConvexDialog from '../../components/ui/dialog/ConvexDialog';
import DialogHeader from '../../components/ui/dialog/DialogHeader';
import UnsavedChangesDialog from '../../components/ui/dialog/UnsavedChangesDialog';
import ConfirmDialog from '../../components/ui/dialog/ConfirmDialog';
import Column from '../../components/layout/Column';
import Row from '../../components/layout/Row';
import AppButton from '../../components/ui/buttons/AppButton';
import KeyCap from '../../components/ui/KeyCap';
import FontText from '../../components/ui/text/FontText';
import ShadowScrollView from '../../components/ui/ShadowScrollView';
import { CloseButton } from '../../components/game/markdownEditor';
import { parseScript } from '../lang/parser';
import { printExpression, printScript, printScriptBlock, parseScriptBlock } from '../lang/printer';
import type { Expression, FunctionTemplatePiece, Script, Statement } from '../lang/ast';
import { emptySpan } from '../lang/ast';
import {
  editorReducer,
  initialState,
  createScript,
  createOnTagAddedStatement,
  deleteStatementInList,
  getStatementAtPath,
  insertStatementInList,
  replaceStatementAtPath,
} from './editorReducer';
import type { EditorAction } from './editorReducer';
import Canvas, {
  BlockPreview,
  type ExpressionMoveTarget,
  type FileBlocksContextValue,
  type MoveToolControls,
} from './Canvas';
import {
  collectClosureStatements,
  cleanupFileInputStatements,
  cleanupFileInputText,
  collectDraftFileInputs,
  collectFileInputNames,
  encodeFileMarker,
  ScriptFilesIndexContext,
  fileName as filePathName,
  flattenStatementsToMarkdown,
  folderOfPath,
  isFileInputStatement,
  isValidFileName,
  fileInputDefaults,
  fileOnlyInsertRoute,
  getFileInputParts,
  hoistFileInputs,
  INPUT_LABEL_CALLS,
  joinFilePath,
  makeFileInputStatement,
  makeFileStatement,
  retargetFileStatement,
  validateFileReferences,
  type ScriptFile,
  type ScriptFileKind,
  type ScriptFileRole,
  type ScriptFilesIndex,
  type TagMeta,
  type FileInputDecl,
} from '../../utils/scriptFiles';
import { getFolderCallParts, makeFolderStatement } from '../../utils/scriptFolders';
import {
  lintCellColumnTypes,
  lintCellPlacement,
  lintScriptStatements,
} from '../../utils/scriptLint';
import { cellColumnKind, cellColumnValueType } from '../../utils/cellColumnTypes';
import {
  hasFileInputReferences,
  markdownFileBody,
  normalizeMarkdownFileInputs,
  renameFileInputReferences,
  withMarkdownFileBody,
} from '../../utils/markdownFileEditor';
import FileEditorModeSwitch from './FileEditorModeSwitch';
import type { SelectionRange } from '../../components/game/townSquare/townSquareUtils';
import FilePathControls from './FilePathControls';
import { TAG_COLORS } from '../../components/game/TagPill';
import FilePreviewDialog from '../../components/game/scriptFiles/FilePreviewDialog';
import FolderSettingsDialog from '../../components/game/scriptFiles/FolderSettingsDialog';
import MoveToDialog from '../../components/game/scriptFiles/MoveToDialog';
import TemplatePickerModal from './TemplatePickerModal';
import TemplateInputModal from './TemplateInputModal';
import InsertModal, {
  type DefinedFunction,
  type InsertTarget,
  BUILTIN_FUNCTION_NAMES,
} from './InsertModal';
import { createScriptGlobals, type ScriptSourceData } from '../runtime/sources';
import {
  decomposeChain,
  getExpressionAtLocation,
  recomposeChain,
  setExpressionAtLocation,
  traceEntrySource,
  type ChainLink,
  type ExpressionLocation,
} from './expressionEditor';
import { useTooltip } from './useTooltip';
import type { EntryKeysBySource } from './typeInference';
import { useUndoRedo, useCreateUndoSnapshot } from 'hooks/useUndoRedo';
import { useSavedFunctions } from 'hooks/useSavedFunctions';
import { useToast } from 'contexts/ToastContext';
import { useKeyboardShortcuts } from 'hooks/useKeyboardShortcuts';
import { useKeyboardShortcutHint } from 'contexts/KeyboardShortcutHintContext';
import { SavedEntry, useSaveHistory } from 'hooks/useSaveHistory';
import SaveHistoryPill from '../../components/ui/dialog/SaveHistoryPill';
import { MinimizeButton, useMinimizeTarget } from '../../components/ui/minimize';
import SaveHistoryDialog from '../../components/ui/dialog/SaveHistoryDialog';
import ViewOnlyPreviewModal from '../../components/ui/dialog/ViewOnlyPreviewModal';
import FontTextInput from '../../components/ui/forms/FontTextInput';
import MarkdownRenderer from '../../components/ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from '../../components/game/markdownEditor/InputOptionsProvider';

export interface ScriptEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialScriptText?: string;
  onSubmit: (scriptText: string) => void;
  sources?: ScriptSourceData;
  title?: string;
  /** When true, input-creating blocks (select, text, number, checkbox) are hidden.
   *  Used for tag trigger scripts which have no input state storage. */
  hideInputs?: boolean;
  allowVoteInput?: boolean;
  /** When true, the editor is configured for tag trigger scripts.
   *  Hides input/display blocks, replaces currentDay with placedDay, and
   *  shows trigger-specific data sources (placedTag, placedUser, etc.). */
  isTriggerContext?: boolean;
  /** Flat trigger mode: the edited body IS the on-tag script - no OnTagAdded
   *  wrapper, Update Cell available at the top level. Automatically on for
   *  trigger-role files; legacy trigger editing can opt in. */
  flatTrigger?: boolean;
  /** Game ID, used to load tag definitions for the tag() function picker. */
  gameId?: string;
  /** When provided, shows the save pill and enables saving the full parent
   *  markdown to the server (fixes the double-save issue). The callback should
   *  update the parent draft AND persist to server AND add to history. */
  onSaveToServer?: (scriptText: string) => void;
  /** Shared history entries from the parent markdown editor. */
  historyEntries?: SavedEntry[];
  /** Private save-history key for this editor when it owns its own history
   *  (no shared entries). For file contexts the caller can omit this and
   *  history is keyed by `scriptFile:{gameId}:{fileId}`. Editors without a
   *  file (cell file lists, script islands) must pass it explicitly —
   *  without a key the pill's history half is hidden. */
  historyKey?: string;
  /** Max saves (from parent). */
  historyMaxSaves?: number;
  /** Clear history callback (from parent). */
  onClearHistory?: () => void;
  /** Renders view-only preview content for a history entry (from parent). */
  renderPreviewContent?: (entry: SavedEntry) => React.ReactNode;
  /** When true, the editor is non-editable (view-only): no editing, no save pill, no Done button, just Close. */
  readOnly?: boolean;
  /** File-system mode: set when editing a script file or a file-mode cell. */
  fileContext?: ScriptFileContext;
  /** Open with the draft already counting as modified: Done is enabled and
   *  close asks to confirm. Used when the caller injected content (e.g. a
   *  picked file) that hasn't been committed to storage yet. */
  initialModified?: boolean;
  /** Fires when the user presses Done: IN ADDITION to whichever save path
   *  runs (onSaveToServer wins over onSubmit for the text). Needed when Done
   *  must complete a pending action (e.g. append a created file to a cell)
   *  that neither save path covers. */
  onDone?: (scriptText: string) => void;
  /** Hosted minimize: hides the dialog without unmounting its host so saved
   *  state survives; the minimized card calls onRestore to reopen. When
   *  absent no minimize button renders. */
  onMinimize?: () => void;
  onRestore?: () => void;
  /** A move/clone session handed off from another editor (e.g. a script
   *  island): the dialog opens already in place phase with the selections
   *  shelved, waiting for the user to pick a spot. */
  initialMoveSession?: PendingMovePayload;
}

/** Serializable move/clone hand-off: selections travel as printed source so
 *  the payload survives crossing into a different editor instance. */
export interface PendingMovePayload {
  operation: 'move' | 'clone';
  category: 'expression' | 'block';
  /** printScript output: block selections as statements; an expression
   *  payload as a single ExpressionStatement. */
  source: string;
  /** Fires once when the handed-off selections actually land in the
   *  destination — island sources commit their cut here so the source draft
   *  is untouched until the move completes. */
  onPlaced?: () => void;
}

export interface ScriptFileContext {
  scriptIsland?: boolean;
  fileId?: string;
  /** Files index: powers File cards, merged inference, and validation. */
  index: ScriptFilesIndex;
  /** Path of the file being edited, shows the file header chip. Undefined
   *  for cell file-list editors. */
  filePath?: string;
  /** Kind of the file being edited (header icon). */
  fileKind?: ScriptFileKind;
  /** Cell mode: only File(...) statements at the top level; '+' opens the
   *  file browser instead of the block picker. */
  fileOnly?: boolean;
  /** Blank state for an empty file list, rendered centered in the canvas
   *  instead of the generic "+ press to add a block" row. */
  emptyState?: React.ReactNode;
  /** Ask the host to open the file browser to pick a file. The dialog saves
   *  its draft before calling this. `onPick` fires on selection; `onCancel`
   *  on dismiss without a pick. When `onPickFolder` is provided the picker
   *  also allows choosing a folder (inserts a Folder() statement). */
  requestFilePick: (
    onPick: (file: ScriptFile) => void,
    onCancel?: () => void,
    role?: ScriptFileRole,
    onPickFolder?: (path: string) => void,
    fileKinds?: ScriptFileKind[]
  ) => void;
  /** Display-composition cells: the '+' target opens the file-or-block
   *  chooser instead of a file-only picker. */
  requestCompositionPick?: (
    onPick: (result: { file?: ScriptFile; folderPath?: string; statement?: Statement }) => void,
    onCancel?: () => void
  ) => void;
  /** Folder blocks re-pick a folder without treating it as a file. */
  requestFolderPick?: (onPick: (path: string) => void, onCancel?: () => void) => void;
  /** Open `file` in a stacked file editor (the draft is saved first). */
  onOpenFile?: (file: ScriptFile) => void;
  /** Switch which file this editor is editing (header → browser pick). */
  onSwitchFile?: (file: ScriptFile) => void;
  /** Persist a different file's source while this editor stays open —
   *  cross-file moves write the source file's removal through this once the
   *  destination draft saves. */
  onSaveFile?: (fileId: string, text: string) => void;
  /** Island contexts can't switch files in place: open `file` in a file
   *  editor carrying the move/clone session so the user can place the
   *  shelved selections there. */
  onMoveToFile?: (file: ScriptFile, payload: PendingMovePayload) => void;
  /** Rename the file being edited (name only, folder stays put). Returns
   *  false when the name is invalid or already taken in this folder. */
  onRenameFile?: (name: string) => boolean;
  /** File options: move the file to `folder` ("" = root). */
  onMoveFile?: (folder: string) => void;
  /** Move sheet: create a folder at `path` (New Folder button). */
  onCreateFolder?: (path: string) => void;
  /** File options: duplicate the file in place. */
  onCloneFile?: () => void;
  /** File options: delete the file: the host decides whether the editor
   *  closes after. */
  onDeleteFile?: () => void;
  /** File's role - 'display' (default) renders into cells/messages with
   *  inputs; 'trigger' runs in tag-trigger context (placed* globals, no
   *  inputs). Tag files are always trigger. */
  fileRole?: ScriptFileRole;
  /** Tag file: the `Tag({NAME, COLOR})` header is file meta managed by the
   *  header row below - the script body holds only the trigger script. */
  isTagFile?: boolean;
  tagMeta?: TagMeta;
  onTagMetaChange?: (meta: TagMeta) => void;
  /** Switch a script file's role (header picker). */
  onSetFileRole?: (role: ScriptFileRole) => void;
  /** Markdown file whose source outgrew the single-CreateMarkdown shape:
   *  saving is gated behind converting it to a script file. */
  onConvertToScript?: () => void;
}

type EditorMode = 'blocks' | 'text';

/** Chip label for a declared input's default type, same labels as the
 *  function-template PieceChip. */
const inputTypeLabel = (decl: FileInputDecl) =>
  decl.defaultExpression?.kind === 'StringLiteral'
    ? 'text'
    : decl.defaultExpression?.kind === 'NumberLiteral'
      ? 'number'
      : decl.defaultExpression?.kind === 'DropdownLiteral'
        ? 'dropdown'
        : !decl.defaultExpression || decl.defaultExpression.kind === 'NothingLiteral'
          ? 'blank'
          : 'expr';

const sanitizeIdentifier = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_$&');

const collectDefinedVariables = (statements: Statement[], acc: string[] = []): string[] => {
  for (const stmt of statements) {
    // Detect Variable({NAME = "..."}) call statements
    if (
      stmt.kind === 'ExpressionStatement' &&
      stmt.expression.kind === 'CallExpression' &&
      stmt.expression.callee.kind === 'IdentifierExpression' &&
      stmt.expression.callee.name.toUpperCase() === 'VARIABLE'
    ) {
      const nameArg = stmt.expression.arguments.find(
        (a) => a.kind === 'NamedArgument' && a.name.toUpperCase() === 'NAME'
      );
      if (nameArg && nameArg.kind === 'NamedArgument' && nameArg.value.kind === 'StringLiteral') {
        const clean = sanitizeIdentifier(nameArg.value.value);
        if (clean) acc.push(clean);
      }
    }
    if (stmt.kind === 'IfStatement') {
      collectDefinedVariables(stmt.branches[0]?.body.statements ?? [], acc);
      if (stmt.elseBody) collectDefinedVariables(stmt.elseBody.statements, acc);
    }
    if (stmt.kind === 'ForEachStatement') {
      collectDefinedVariables(stmt.body.statements, acc);
    }
    if (stmt.kind === 'FunctionStatement') {
      collectDefinedVariables(stmt.body.statements, acc);
    }
  }
  return acc;
};

const collectDefinedFunctions = (
  statements: Statement[],
  inputSources: Record<string, string> = {},
  acc: DefinedFunction[] = []
): DefinedFunction[] => {
  for (const statement of statements) {
    if (statement.kind === 'FunctionStatement') {
      // Build parameter source map from template defaults
      const paramSources: Record<string, string> = {};
      const templateInputs = statement.template?.filter((p) => p.kind === 'input') ?? [];
      templateInputs.forEach((input, index) => {
        const param = statement.parameters[index];
        if (param && input.defaultExpression) {
          const source = traceEntrySource(input.defaultExpression, {
            varSources: {},
            inputSources,
            definedFunctions: acc,
          });
          if (source) paramSources[param] = source;
        }
      });
      // Trace the return expression to compute returnEntrySource
      const returnExpr = findReturnExpression(statement.body.statements);
      const returnEntrySource = returnExpr
        ? traceEntrySource(returnExpr, {
            varSources: paramSources,
            inputSources,
            definedFunctions: acc,
          })
        : undefined;
      acc.push({
        name: statement.name,
        parameters: statement.parameters,
        template: statement.template,
        bodyStatements: statement.body.statements,
        returnEntrySource,
      });
      collectDefinedFunctions(statement.body.statements, inputSources, acc);
    } else if (statement.kind === 'IfStatement') {
      statement.branches.forEach((branch) =>
        collectDefinedFunctions(branch.body.statements, inputSources, acc)
      );
      if (statement.elseBody)
        collectDefinedFunctions(statement.elseBody.statements, inputSources, acc);
    } else if (statement.kind === 'ForEachStatement') {
      collectDefinedFunctions(statement.body.statements, inputSources, acc);
    }
  }
  return acc;
};

/** Find the return expression from a function body (searches nested blocks). */
const findReturnExpression = (statements: Statement[]): Expression | undefined => {
  for (let i = statements.length - 1; i >= 0; i--) {
    const stmt = statements[i];
    if (stmt.kind === 'ReturnStatement' && stmt.value) return stmt.value;
    if (stmt.kind === 'IfStatement') {
      for (let j = stmt.branches.length - 1; j >= 0; j--) {
        const found = findReturnExpression(stmt.branches[j].body.statements);
        if (found) return found;
      }
      if (stmt.elseBody) {
        const found = findReturnExpression(stmt.elseBody.statements);
        if (found) return found;
      }
    }
    if (stmt.kind === 'ForEachStatement') {
      const found = findReturnExpression(stmt.body.statements);
      if (found) return found;
    }
  }
  return undefined;
};

/** Build a map of input label → data source from CreateSelectInput statements. */
const collectInputSources = (
  statements: Statement[],
  entryKeysBySource: Record<string, string[]>
): Record<string, string> => {
  const sources: Record<string, string> = {};
  for (const stmt of statements) {
    if (
      stmt.kind === 'ExpressionStatement' &&
      stmt.expression.kind === 'CallExpression' &&
      stmt.expression.callee.kind === 'IdentifierExpression' &&
      ['createselectinput', 'createselectvoteinput'].includes(
        stmt.expression.callee.name.toLowerCase()
      )
    ) {
      const labelArg = stmt.expression.arguments.find(
        (a) => a.kind === 'NamedArgument' && a.name.toLowerCase() === 'label'
      );
      const listArg = stmt.expression.arguments.find(
        (a) => a.kind === 'NamedArgument' && a.name.toLowerCase() === 'list'
      );
      if (labelArg && listArg && labelArg.value.kind === 'StringLiteral') {
        // Determine the source of the LIST argument
        const listExpr = listArg.value;
        if (listExpr.kind === 'IdentifierExpression') {
          const name = listExpr.name.toLowerCase();
          // Check if it's a known source (players, roles, etc.)
          if (name in entryKeysBySource) {
            sources[labelArg.value.value.toLowerCase()] = name;
          }
        }
      }
    }
    // Recurse into nested blocks
    if (stmt.kind === 'IfStatement') {
      stmt.branches.forEach((b) =>
        Object.assign(sources, collectInputSources(b.body.statements, entryKeysBySource))
      );
      if (stmt.elseBody)
        Object.assign(sources, collectInputSources(stmt.elseBody.statements, entryKeysBySource));
    }
    if (stmt.kind === 'ForEachStatement') {
      Object.assign(sources, collectInputSources(stmt.body.statements, entryKeysBySource));
    }
    if (stmt.kind === 'FunctionStatement') {
      Object.assign(sources, collectInputSources(stmt.body.statements, entryKeysBySource));
    }
  }
  return sources;
};

const INPUT_STATEMENT_IDS = INPUT_LABEL_CALLS;

/** Collect LABEL values from all input-creating statements in the script. */
const collectInputLabels = (statements: Statement[], acc: string[] = []): string[] => {
  for (const stmt of statements) {
    if (
      stmt.kind === 'ExpressionStatement' &&
      stmt.expression.kind === 'CallExpression' &&
      stmt.expression.callee.kind === 'IdentifierExpression' &&
      INPUT_STATEMENT_IDS.has(stmt.expression.callee.name.toLowerCase())
    ) {
      const labelArg = stmt.expression.arguments.find(
        (arg) => arg.kind === 'NamedArgument' && arg.name.toUpperCase() === 'LABEL'
      );
      if (labelArg && labelArg.value.kind === 'StringLiteral' && labelArg.value.value) {
        acc.push(labelArg.value.value);
      }
    }
    if (stmt.kind === 'IfStatement') {
      stmt.branches.forEach((branch) => collectInputLabels(branch.body.statements, acc));
      if (stmt.elseBody) collectInputLabels(stmt.elseBody.statements, acc);
    }
    if (stmt.kind === 'ForEachStatement') {
      collectInputLabels(stmt.body.statements, acc);
    }
    if (stmt.kind === 'FunctionStatement') {
      collectInputLabels(stmt.body.statements, acc);
    }
  }
  return acc;
};

/**
 * Build the editor's entry-key map (type inference + pickers) for a statement
 * list: globals from source data, built-in field types, extra columns, and —
 * for display contexts — the flat input namespace from the script's own input
 * labels plus transitively included file inputs. Pure; reused for both the
 * live AST and saved-version previews.
 */
/** Saved-version previews are completely non-interactive: `inert` removes the
 *  whole subtree from hit-testing, so clicks, hover affordances, focus, and
 *  editing never fire — while scroll containers inside still scroll. Native
 *  has no `inert`; the stubbed callbacks keep previews inert there. */
const StaticPreviewContent = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<View>(null);
  useEffect(() => {
    // On web the View ref IS the DOM element; on native it's a component
    // instance, where `inert` doesn't exist and this is a no-op.
    const el = ref.current as unknown;
    if (el && typeof el === 'object' && 'inert' in el) {
      (el as HTMLElement).inert = true;
      return () => {
        (el as HTMLElement).inert = false;
      };
    }
  }, []);
  return (
    <View ref={ref} className="min-h-0 flex-1">
      {children}
    </View>
  );
};

const computeEntryKeys = (
  sourcesData: ScriptSourceData | undefined,
  statements: Statement[],
  extraFileInputNames: string[],
  triggerMode: boolean
): EntryKeysBySource => {
  const globals = createScriptGlobals(sourcesData);
  const keys: EntryKeysBySource = Object.fromEntries(
    Object.entries(globals).map(([name, value]) => {
      const sample = Array.isArray(value)
        ? value.find((item) => item && typeof item === 'object')
        : value;
      return [name, sample && typeof sample === 'object' ? Object.keys(sample) : []];
    })
  );
  keys.players = [
    'realName',
    'email',
    'userId',
    'role',
    'isAlive',
    'days',
    ...(sourcesData?.userTableTitle?.extraUserColumns ?? []),
  ];
  keys.roles = ['role', 'doesRoleVote', 'isVisible', 'aboutRole'];
  // Day object keys: built-in fields + extra day column titles
  keys.day = [
    'vote',
    'action',
    'morningMessage',
    ...(sourcesData?.userTableTitle?.extraDayColumns ?? []),
  ];
  // Column title dropdowns for UpdateCell
  keys._userColumns = sourcesData?.userTableTitle?.extraUserColumns ?? [];
  keys._dayColumns = ['morningMessage', ...(sourcesData?.userTableTitle?.extraDayColumns ?? [])];
  // Field type metadata: maps "source.field" → ScriptType
  // This lets the type inference know that players.entry("days") is a list,
  // players.entry("role") is a string, etc.
  keys.__fieldTypes = {
    'players.days': 'list',
    'players.realName': 'string',
    'players.email': 'string',
    'players.userId': 'string',
    'players.role': 'string',
    'players.isAlive': 'boolean',
    'currentPlayer.days': 'list',
    'currentPlayer.realName': 'string',
    'currentPlayer.email': 'string',
    'currentPlayer.userId': 'string',
    'currentPlayer.role': 'string',
    'currentPlayer.isAlive': 'boolean',
    'placedUser.days': 'list',
    'placedUser.realName': 'string',
    'placedUser.email': 'string',
    'placedUser.userId': 'string',
    'placedUser.role': 'string',
    'placedUser.isAlive': 'boolean',
    // Roles table fields
    'roles.role': 'string',
    'roles.doesRoleVote': 'boolean',
    'roles.isVisible': 'boolean',
    'roles.aboutRole': 'string',
    // Day object fields (built-in)
    'day.vote': 'string',
    'day.action': 'string',
    'day.morningMessage': 'string',
  };
  // Add types for extra user columns (all strings)
  for (const col of sourcesData?.userTableTitle?.extraUserColumns ?? []) {
    keys.__fieldTypes![`players.${col}`] = 'string';
    keys.__fieldTypes![`currentPlayer.${col}`] = 'string';
    keys.__fieldTypes![`placedUser.${col}`] = 'string';
  }
  // Add types for extra day columns (all strings)
  for (const col of sourcesData?.userTableTitle?.extraDayColumns ?? []) {
    keys.__fieldTypes![`day.${col}`] = 'string';
  }
  if (triggerMode) {
    // Trigger-specific globals
    keys.placedTag = [];
    keys.placedUser = keys.players;
    keys.placedDay = [];
    keys.placedColumn = [];
  } else {
    keys.currentPlayer = keys.players;
    keys.currentDay = [];
    keys.dayDates = [];
    keys.schedule = [];
    keys.profiles = [];
    // One flat namespace: this script's own input labels plus every input
    // declared by transitively included files.
    keys.Inputs = [...new Set([...collectInputLabels(statements), ...extraFileInputNames])];
    keys.InputsWithData = keys.Inputs;
  }
  return keys;
};

type MoveSelection =
  | {
      kind: 'whole';
      number: number;
      location: ExpressionLocation;
      expression: Expression;
    }
  | {
      kind: 'chainLink';
      number: number;
      location: ExpressionLocation;
      linkIndex: number;
      link: ChainLink;
    }
  | { kind: 'block'; number: number; path: number[]; statement: Statement };

interface MoveSession {
  operation: 'move' | 'clone';
  phase: 'collect' | 'place';
  category: 'expression' | 'block' | null;
  baseline: Script;
  selections: MoveSelection[];
  nextNumber: number;
  /** Placing into a different file: baseline stays the source file's AST
   *  while the current draft belongs to the destination file. */
  foreign?: boolean;
  /** File the session started in; return/cancel navigates back to it. */
  sourceFileId?: string;
  /** Handed-off sessions (island → file editor): runs once when the
   *  selections land so the source can commit its side of the move. */
  onPlaced?: () => void;
}

const locationKey = (location: ExpressionLocation) =>
  JSON.stringify([location.statementPath, location.slot, location.expressionPath]);

const sameLocation = (left: ExpressionLocation, right: ExpressionLocation) =>
  locationKey(left) === locationKey(right);

const isPathPrefix = (prefix: number[], path: number[]) =>
  prefix.length <= path.length && prefix.every((part, index) => path[index] === part);

const expressionPathIsPrefix = (
  prefix: ExpressionLocation['expressionPath'],
  path: ExpressionLocation['expressionPath']
) =>
  prefix.length <= path.length &&
  prefix.every((step, index) => JSON.stringify(step) === JSON.stringify(path[index]));

const expressionLocationsOverlap = (left: ExpressionLocation, right: ExpressionLocation) =>
  JSON.stringify([left.statementPath, left.slot]) ===
    JSON.stringify([right.statementPath, right.slot]) &&
  (expressionPathIsPrefix(left.expressionPath, right.expressionPath) ||
    expressionPathIsPrefix(right.expressionPath, left.expressionPath));

const setScriptExpression = (
  script: Script,
  location: ExpressionLocation,
  expression: Expression
): Script => {
  const statement = getStatementAtPath(script.statements, location.statementPath);
  if (!statement) return script;
  return {
    ...script,
    statements: replaceStatementAtPath(
      script.statements,
      location.statementPath,
      setExpressionAtLocation(statement, location, expression)
    ),
  };
};

/** "Place in another file" only accepts script files — markdown files can't
 *  hold blocks. Module constant so callers pass a stable reference. */
const SCRIPT_ONLY_KINDS: ScriptFileKind[] = ['script'];

const deriveSessionAst = (session: MoveSession, foreignAst?: Script): Script => {
  // Foreign sessions place into the destination draft verbatim; the source
  // file's removal is saved separately once the move lands.
  if (session.foreign) return foreignAst ?? session.baseline;
  if (session.operation === 'clone') return session.baseline;
  if (session.category === 'block') {
    const selections = session.selections
      .filter(
        (selection): selection is Extract<MoveSelection, { kind: 'block' }> =>
          selection.kind === 'block'
      )
      .sort((left, right) => {
        const lengthDifference = right.path.length - left.path.length;
        if (lengthDifference !== 0) return lengthDifference;
        return right.path
          .join('.')
          .localeCompare(left.path.join('.'), undefined, { numeric: true });
      });
    return {
      ...session.baseline,
      statements: selections.reduce(
        (statements, selection) => deleteStatementInList(statements, selection.path),
        session.baseline.statements
      ),
    };
  }
  let next = session.baseline;
  const expressionSelections = session.selections.filter(
    (selection): selection is Exclude<MoveSelection, { kind: 'block' }> =>
      selection.kind !== 'block'
  );
  const grouped = new Map<string, typeof expressionSelections>();
  expressionSelections.forEach((selection) => {
    const key = locationKey(selection.location);
    grouped.set(key, [...(grouped.get(key) ?? []), selection]);
  });
  grouped.forEach((selections) => {
    const location = selections[0].location;
    const statement = getStatementAtPath(next.statements, location.statementPath);
    const expression = statement ? getExpressionAtLocation(statement, location) : undefined;
    if (!expression) return;
    if (selections.some((selection) => selection.kind === 'whole')) {
      next = setScriptExpression(next, location, { kind: 'NothingLiteral', span: expression.span });
      return;
    }
    const removed = new Set(
      selections
        .filter(
          (selection): selection is Extract<MoveSelection, { kind: 'chainLink' }> =>
            selection.kind === 'chainLink'
        )
        .map((selection) => selection.linkIndex)
    );
    const remaining = decomposeChain(expression).filter((_, index) => !removed.has(index));
    if (remaining.length > 0 && remaining[0].type !== 'base') {
      remaining.unshift({ type: 'base', expr: { kind: 'NothingLiteral', span: emptySpan() } });
    }
    next = setScriptExpression(next, location, recomposeChain(remaining));
  });
  return next;
};

const deriveSessionCanvasAst = (session: MoveSession, foreignAst?: Script): Script =>
  session.phase === 'collect' && session.category === 'expression'
    ? session.baseline
    : deriveSessionAst(session, foreignAst);

const composeShelfExpression = (selections: MoveSelection[]): Expression | null => {
  const expressionSelections = selections.filter(
    (selection): selection is Exclude<MoveSelection, { kind: 'block' }> =>
      selection.kind !== 'block'
  );
  if (expressionSelections.length === 0) return null;
  const links: ChainLink[] = [];
  for (const selection of expressionSelections) {
    const nextLinks =
      selection.kind === 'chainLink' ? [selection.link] : decomposeChain(selection.expression);
    const base = nextLinks[0]?.type === 'base' ? nextLinks[0] : undefined;
    if (links.length === 0) {
      if (!base) links.push({ type: 'base', expr: { kind: 'NothingLiteral', span: emptySpan() } });
      links.push(...nextLinks);
      continue;
    }
    if (base && base.expr.kind !== 'NothingLiteral') {
      const currentBase = links[0];
      if (currentBase?.type !== 'base' || currentBase.expr.kind !== 'NothingLiteral') return null;
      links[0] = base;
      links.push(...nextLinks.slice(1));
      continue;
    }
    links.push(...(base ? nextLinks.slice(1) : nextLinks));
  }
  return recomposeChain(links);
};

/** Selections → printable source for crossing into another editor. Blocks
 *  print as statements; a composed expression prints wrapped in a single
 *  ExpressionStatement. */
const printMovePayload = (session: MoveSession, shelfExpression: Expression | null): string => {
  const statements: Statement[] =
    session.category === 'block'
      ? session.selections
          .filter(
            (selection): selection is Extract<MoveSelection, { kind: 'block' }> =>
              selection.kind === 'block'
          )
          .sort((left, right) => left.number - right.number)
          .map((selection) => selection.statement)
      : shelfExpression
        ? [{ kind: 'ExpressionStatement', expression: shelfExpression, span: emptySpan() }]
        : [];
  return printScript({ kind: 'Script', statements, diagnostics: [], span: emptySpan() });
};

/** Inverse of printMovePayload: rebuild shelf selections in the destination
 *  editor. Source-relative paths/locations are meaningless there, so they
 *  carry harmless empties — foreign placement never reads them. */
const parseMovePayload = (payload: PendingMovePayload): MoveSelection[] => {
  const script = parseScript(payload.source);
  if (payload.category === 'block') {
    return script.statements.map((statement, index) => ({
      kind: 'block' as const,
      number: index + 1,
      path: [],
      statement,
    }));
  }
  const statement = script.statements[0];
  const expression = statement?.kind === 'ExpressionStatement' ? statement.expression : undefined;
  return expression
    ? [
        {
          kind: 'whole' as const,
          number: 1,
          location: { statementPath: [], slot: { kind: 'returnValue' }, expressionPath: [] },
          expression,
        },
      ]
    : [];
};

const statementLabel = (statement: Statement) => {
  if (
    statement.kind === 'ExpressionStatement' &&
    statement.expression.kind === 'CallExpression' &&
    statement.expression.callee.kind === 'IdentifierExpression'
  )
    return statement.expression.callee.name;
  if (statement.kind === 'IfStatement') return 'If / Else';
  if (statement.kind === 'ForEachStatement') return `For each ${statement.itemName}`;
  if (statement.kind === 'FunctionStatement') return `Function ${statement.name}`;
  if (statement.kind === 'OnTagAddedStatement') return 'On Tag Added';
  if (statement.kind === 'OnTagRemovedStatement') return 'On Tag Removed';
  if (statement.kind === 'UpdateCellStatement') return 'Update Cell';
  if (statement.kind === 'ReturnStatement') return 'Return';
  return statement.kind;
};

const ShelfItem = ({
  selection,
  onReturn,
  entryKeysBySource,
  definedFunctions,
}: {
  selection: MoveSelection;
  onReturn: () => void;
  entryKeysBySource: EntryKeysBySource;
  definedFunctions: DefinedFunction[];
}) => {
  const tooltipId = React.useId();
  const { setHovered } = useTooltip(tooltipId, `Click to return ${selection.number}`);
  const animation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 7,
    }).start();
  }, [animation]);
  return (
    <View
      {...({
        onPointerDown: (event: PointerEvent) => {
          event.preventDefault();
          event.stopPropagation();
          onReturn();
        },
      } as Record<string, unknown>)}>
      <Animated.View style={{ opacity: animation, transform: [{ scale: animation }] }}>
        <Pressable
          onPress={onReturn}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          className="border-subtle-border bg-inner-background rounded-xl border p-1.5">
          {selection.kind === 'block' ? (
            <Row className="items-center gap-2 px-2 py-1">
              <View className="bg-text/10 h-6 w-6 items-center justify-center rounded-full">
                <FontText weight="medium" className="text-xs">
                  {selection.number}
                </FontText>
              </View>
              <FontText weight="medium" className="text-sm">
                {statementLabel(selection.statement)}
              </FontText>
            </Row>
          ) : (
            <BlockPreview
              expression={
                selection.kind === 'whole'
                  ? selection.expression
                  : recomposeChain([
                      {
                        type: 'base',
                        expr:
                          selection.link.type === 'base'
                            ? selection.link.expr
                            : { kind: 'NothingLiteral', span: emptySpan() },
                      },
                      ...(selection.link.type === 'base' ? [] : [selection.link]),
                    ])
              }
              entryKeysBySource={entryKeysBySource}
              definedFunctions={definedFunctions}
            />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

// MarkdownEditorDialog imports this file, so it is resolved lazily inside the
// component to avoid a require cycle.
const getMarkdownEditorDialog = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy require to break the module cycle
  (
    require('../../components/game/MarkdownEditorDialog') as typeof import('../../components/game/MarkdownEditorDialog')
  ).default;

const ScriptEditorDialog = ({
  isOpen,
  onOpenChange,
  initialScriptText = '',
  onSubmit,
  sources,
  title = 'Script Editor',
  hideInputs,
  allowVoteInput = false,
  isTriggerContext,
  flatTrigger: flatTriggerProp,
  gameId,
  onSaveToServer,
  historyEntries,
  historyKey,
  historyMaxSaves = 5,
  onClearHistory,
  renderPreviewContent,
  readOnly = false,
  fileContext,
  initialModified = false,
  onDone,
  onMinimize,
  onRestore,
  initialMoveSession,
}: ScriptEditorDialogProps) => {
  const MarkdownEditorDialog = getMarkdownEditorDialog();
  // Files can carry trigger context themselves (role='trigger' or a tag
  // file): the dialog's isTriggerContext prop is for non-file trigger
  // editing (legacy tag triggers via AddTagDialog).
  const fileIsTrigger = fileContext?.fileRole === 'trigger';
  const effectiveTrigger = isTriggerContext || fileIsTrigger;
  /** Flat trigger mode: the edited body IS the on-tag script - no OnTagAdded
   *  wrapper, UpdateCell available at the top level. Trigger-role files are
   *  always flat; other contexts opt in via the prop. */
  const flatTrigger = flatTriggerProp || fileIsTrigger;
  const hideInputsEffective = hideInputs || effectiveTrigger;
  const [state, dispatch] = useReducer(editorReducer, createScript(), (ast) => initialState(ast));
  const { executeCommand, undo, redo, canUndo, canRedo } = useUndoRedo();
  const createUndoSnapshot = useCreateUndoSnapshot();
  const [mode, setMode] = useState<EditorMode>('blocks');
  const [directMarkdown, setDirectMarkdown] = useState(
    () =>
      fileContext?.fileKind === 'markdown' &&
      markdownFileBody(parseScriptBlock(initialScriptText)) !== null
  );
  const [switchingFileEditor, setSwitchingFileEditor] = useState(false);
  const fileEditorSwapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directMarkdownDraft = useRef('');
  const markdownSelection = useRef<SelectionRange>({ start: 0, end: 0 });
  const [markdownDraftReplacement, setMarkdownDraftReplacement] = useState<{
    body: string;
    revision: number;
  } | null>(null);
  const pendingInputInsertion = useRef<((name: string) => void) | null>(null);
  const directEditorSession = useRef<string | null>(null);
  const directMarkdownBody = markdownFileBody(state.ast);
  const onDirectMarkdownDraft = useCallback((value: string) => {
    directMarkdownDraft.current = value;
  }, []);
  const onMarkdownSelection = useCallback((selection: SelectionRange) => {
    markdownSelection.current = selection;
  }, []);
  useEffect(
    () => () => {
      if (fileEditorSwapTimer.current) clearTimeout(fileEditorSwapTimer.current);
    },
    []
  );
  const switchFileEditor = (markdown: boolean) => {
    // Let the outgoing portal unmount before mounting the other editor.
    setMarkdownDraftReplacement(null);
    setSwitchingFileEditor(true);
    if (fileEditorSwapTimer.current) clearTimeout(fileEditorSwapTimer.current);
    fileEditorSwapTimer.current = setTimeout(() => {
      fileEditorSwapTimer.current = null;
      setDirectMarkdown(markdown);
      setSwitchingFileEditor(false);
    }, 200);
  };
  const [moveSession, setMoveSession] = useState<MoveSession | null>(null);
  /** Latest-session mirror for deferred callbacks (island onPlaced) that
   *  must no-op once the session they captured has ended. */
  const moveSessionRef = useRef<MoveSession | null>(null);
  moveSessionRef.current = moveSession;
  const [textDraft, setTextDraft] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);
  const [folderSettingsPath, setFolderSettingsPath] = useState<number[] | null>(null);
  const [markdownEditor, setMarkdownEditor] = useState<{
    isOpen: boolean;
    value: string;
    onSave: (newValue: string) => void;
  } | null>(null);
  const [hasModifications, setHasModifications] = useState(false);
  const { targetRef, performMinimize } = useMinimizeTarget({
    title: fileContext?.filePath ?? title,
    // onMinimize hides the hosted editor (the host keeps the component
    // mounted); without a host there is nothing to detach into.
    onClose: onMinimize ?? (() => {}),
    onRestore: onRestore ?? (() => {}),
    pinned: () => hasModifications,
  });

  const [isLeaveConfirmDialogOpen, setIsLeaveConfirmDialogOpen] = useState(false);
  /** Set while the convert-to-script confirm is up; remembers whether the
   *  user was saving in place or closing via Done. */
  const [convertToScriptPrompt, setConvertToScriptPrompt] = useState<'save' | 'submit' | null>(
    null
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<SavedEntry | null>(null);
  const ownHistoryKey = historyEntries
    ? null
    : (historyKey ??
      (fileContext?.fileId ? `scriptFile:${gameId ?? ''}:${fileContext.fileId}` : null));
  const fileHistory = useSaveHistory(ownHistoryKey, { enabled: isOpen });
  const effectiveHistory = historyEntries ?? (ownHistoryKey ? fileHistory.history : undefined);
  /** Cross-file move: the source file's pending removal, saved only once a
   *  destination draft that contains the placed selections persists. */
  const pendingSourceCut = useRef<{ fileId: string; text: string } | null>(null);
  /** Sessions whose onPlaced already fired (placement undo/redo must not
   *  re-commit the island source's cut). */
  const placedNotified = useRef(new WeakSet<MoveSession>());
  const persistSource = (text: string) => {
    onSaveToServer?.(text);
    // The destination draft just persisted — the move landed, so the source
    // file's removal is safe to save now (never before).
    if (pendingSourceCut.current) {
      fileContext?.onSaveFile?.(pendingSourceCut.current.fileId, pendingSourceCut.current.text);
      pendingSourceCut.current = null;
    }
    if (fileContext?.fileId && directMarkdown) {
      dispatch({ type: 'SET_AST', ast: parseScriptBlock(text) });
    }
    if (ownHistoryKey) {
      fileHistory.addSave({ scriptText: text }, text.slice(0, 200));
    }
  };
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [expressionSwapTarget, setExpressionSwapTarget] = useState<{
    location: ExpressionLocation;
    expression: Expression;
  } | null>(null);
  const [decoupleDialog, setDecoupleDialog] = useState<{
    path: number[];
    functionName: string;
    isBuiltin: boolean;
  } | null>(null);
  const [decoupledFunctions, setDecoupledFunctions] = useState<string[]>([]);
  const [nameCollision, setNameCollision] = useState<string | null>(null);
  const [tagNameDraft, setTagNameDraft] = useState('');
  useEffect(() => {
    setTagNameDraft(fileContext?.tagMeta?.name ?? '');
  }, [fileContext?.tagMeta?.name]);
  const { savedFunctions, savedFunctionNames, saveFunction, unsaveFunction } = useSavedFunctions();
  const { showToast } = useToast();
  const { setHint } = useKeyboardShortcutHint();
  const { width: windowWidth } = useWindowDimensions();
  // Below 480px Preview/Move/Clone collapse to icons; below sm (640px) the
  // dialog's Done/Cancel hide while a move session is active: Place + Cancel
  // crowd the row on narrow screens.
  const isTinyScreen = windowWidth < 480;
  const hideDialogActions = moveSession !== null && windowWidth < 640;
  const moveTooltipId = React.useId();
  const cloneTooltipId = React.useId();
  const placeTooltipId = React.useId();

  const moveTooltipContent = useMemo(
    () => (
      <>
        Move
        <KeyCap>M</KeyCap>
      </>
    ),
    []
  );
  const cloneTooltipContent = useMemo(
    () => (
      <>
        Clone
        <KeyCap>C</KeyCap>
      </>
    ),
    []
  );
  const placeTooltipContent = useMemo(
    () => (
      <>
        Place
        <KeyCap>P</KeyCap>
      </>
    ),
    []
  );
  const placeFileTooltipId = React.useId();
  const { setHovered: setMoveHovered } = useTooltip(moveTooltipId, moveTooltipContent);
  const { setHovered: setCloneHovered } = useTooltip(cloneTooltipId, cloneTooltipContent);
  const { setHovered: setPlaceHovered } = useTooltip(placeTooltipId, placeTooltipContent);
  const { setHovered: setPlaceFileHovered } = useTooltip(
    placeFileTooltipId,
    'Place in another file'
  );

  useEffect(() => {
    if (!isOpen) {
      if (fileEditorSwapTimer.current) clearTimeout(fileEditorSwapTimer.current);
      fileEditorSwapTimer.current = null;
      setSwitchingFileEditor(false);
      directEditorSession.current = null;
      return;
    }
    const identity = fileContext?.fileId ?? fileContext?.filePath ?? '';
    // Published save echoes and path changes must not replace an active file
    // draft. New files/reopens initialize; saves update the AST explicitly.
    if (fileContext?.fileId && directEditorSession.current === identity) return;
    const trimmed = initialScriptText.trim();
    let ast;
    if (trimmed.length > 0) {
      // Use parseScriptBlock to unwrap /*script ... script*/ wrapper if present
      ast = parseScriptBlock(trimmed);
      if (fileContext?.filePath) {
        // FileInputs conceptually live at the top, normalize the prefix so
        // the hidden-statement list and the header strip agree.
        ast = { ...ast, statements: hoistFileInputs(ast.statements) };
      }
    } else if (effectiveTrigger) {
      // Flat trigger files: the body IS the on-tag script - no wrapper.
      // Legacy (non-file) trigger editing still defaults to an OnTagAdded
      // block so it's clear where the tag-added logic goes.
      ast = flatTrigger
        ? createScript()
        : { ...createScript(), statements: [createOnTagAddedStatement()] };
    } else {
      ast = createScript();
    }
    if (fileContext?.fileKind === 'markdown') ast = normalizeMarkdownFileInputs(ast);
    dispatch({ type: 'REPLACE_AST', ast });
    const body = markdownFileBody(ast);
    const newSession = directEditorSession.current !== identity;
    if (newSession) {
      if (fileEditorSwapTimer.current) clearTimeout(fileEditorSwapTimer.current);
      fileEditorSwapTimer.current = null;
      setSwitchingFileEditor(false);
      setDirectMarkdown(fileContext?.fileKind === 'markdown' && body !== null);
      directEditorSession.current = identity;
      setMarkdownDraftReplacement(null);
      markdownSelection.current = { start: 0, end: 0 };
      pendingInputInsertion.current = null;
    }
    directMarkdownDraft.current = body ?? '';
    setTextDraft(trimmed);
    if (newSession || !identity) setMode('blocks');
    const pendingFileSwitch = pendingForeignPlacement.current;
    pendingForeignPlacement.current = null;
    pendingSourceCut.current = null;
    setParseError(null);
    setInsertTarget(null);
    setHasModifications(newSession || !identity ? initialModified : false);
    if (pendingFileSwitch && pendingFileSwitch.targetFileId === identity) {
      if (pendingFileSwitch.restore === 'place') {
        // Arrived in the destination file: selections stay shelved, only
        // place targets are offered.
        setMoveSession({
          ...pendingFileSwitch.session,
          foreign: true,
          sourceFileId: pendingFileSwitch.sourceFileId,
          phase: 'place',
        });
      } else {
        // Back in the source file: restore the pre-session draft and
        // persist it so the source still holds every selection.
        dispatch({ type: 'SET_AST', ast: pendingFileSwitch.session.baseline });
        setHasModifications(true);
        persistSource(serializeFileAst(pendingFileSwitch.session.baseline));
        setMoveSession(
          pendingFileSwitch.restore === 'collect'
            ? { ...pendingFileSwitch.session, foreign: false, phase: 'collect' }
            : null
        );
      }
    } else {
      setMoveSession(null);
    }
    setIsLeaveConfirmDialogOpen(false);
    setConvertToScriptPrompt(null);
    setExpressionSwapTarget(null);
    setDecoupleDialog(null);
    setDecoupledFunctions([]);
    setNameCollision(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialScriptText,
    isOpen,
    effectiveTrigger,
    flatTrigger,
    initialModified,
    fileContext?.filePath,
    fileContext?.fileId,
    fileContext?.fileKind,
  ]);

  // Adopt a handed-off move/clone session (script island → file editor):
  // the destination opens already in place phase, selections shelved.
  // Ref-guarded so only a NEW payload object re-arms (e.g. a second hand-off
  // into an already-open editor).
  const adoptedMovePayload = useRef<PendingMovePayload | null>(null);
  useEffect(() => {
    if (!initialMoveSession || !isOpen || readOnly) return;
    if (adoptedMovePayload.current === initialMoveSession) return;
    adoptedMovePayload.current = initialMoveSession;
    const selections = parseMovePayload(initialMoveSession);
    if (selections.length === 0) return;
    setMoveSession({
      operation: initialMoveSession.operation,
      phase: 'place',
      category: initialMoveSession.category,
      baseline: state.ast,
      selections,
      nextNumber: selections.length + 1,
      foreign: true,
      onPlaced: initialMoveSession.onPlaced,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMoveSession, isOpen, readOnly]);

  // Bridge the reducer's history with the global useUndoRedo system.
  // Computes the new AST by running the reducer manually, applies it via SET_AST
  // (no internal history), and registers an undo command with useUndoRedo so
  // Ctrl+Z / Ctrl+Shift+Z work globally with toast notifications.
  const dispatchWithUndo = useCallback(
    (action: EditorAction, description: string) => {
      const oldAst = createUndoSnapshot(state.ast);
      const newState = editorReducer(state, action);
      const newAst = createUndoSnapshot(newState.ast);
      setHasModifications(true);
      executeCommand({
        action: () => dispatch({ type: 'SET_AST', ast: newAst }),
        undoAction: () => dispatch({ type: 'SET_AST', ast: oldAst }),
        description,
      });
    },
    [state, createUndoSnapshot, executeCommand]
  );

  const commitMoveSession = useCallback(
    (session: MoveSession, ast: Script, beforeAst?: Script) => {
      const before = createUndoSnapshot(beforeAst ?? session.baseline);
      const after = createUndoSnapshot(ast);
      // Cross-file move: the source file's removal is not saved up front —
      // it persists only once a destination draft holding the placed
      // selections does (persistSource flushes pendingSourceCut). Undoing the
      // placement clears the pending cut so a later save can't strand it.
      const pendingCut =
        session.foreign && session.sourceFileId && session.operation === 'move'
          ? {
              fileId: session.sourceFileId,
              text: serializeFileAst(deriveSessionAst({ ...session, foreign: false })),
            }
          : null;
      executeCommand({
        action: () => {
          dispatch({ type: 'SET_AST', ast: after });
          if (pendingCut) pendingSourceCut.current = pendingCut;
          if (session.onPlaced && !placedNotified.current.has(session)) {
            placedNotified.current.add(session);
            session.onPlaced();
          }
        },
        undoAction: () => {
          dispatch({ type: 'SET_AST', ast: before });
          if (pendingCut) pendingSourceCut.current = null;
        },
        description: session.operation === 'move' ? 'Move selection' : 'Clone selection',
      });
      setHasModifications(true);
      setMoveSession(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serializeFileAst is a plain per-render closure; pendingSourceCut/placedNotified are refs
    [createUndoSnapshot, executeCommand]
  );

  const startMoveSession = useCallback(
    (operation: 'move' | 'clone') => {
      setInsertTarget(null);
      setMoveSession({
        operation,
        phase: 'collect',
        category: null,
        baseline: createUndoSnapshot(state.ast),
        selections: [],
        nextNumber: 1,
      });
    },
    [createUndoSnapshot, state.ast]
  );

  const cancelMoveSession = () => {
    if (!moveSession) return;
    if (moveSession.foreign) {
      handleReturnToSourceFile('cancel');
      return;
    }
    dispatch({ type: 'SET_AST', ast: moveSession.baseline });
    setMoveSession(null);
  };

  const updateMoveSession = (update: (session: MoveSession) => MoveSession) => {
    if (!moveSession) return;
    const next = update(moveSession);
    dispatch({ type: 'SET_AST', ast: deriveSessionCanvasAst(next, state.ast) });
    setMoveSession(next);
  };

  /** Saved while switching files so the init effect can either arm the
   *  session in the destination file or restore the source file's draft. */
  const pendingForeignPlacement = useRef<{
    session: MoveSession;
    targetFileId: string;
    sourceFileId: string;
    restore: 'place' | 'collect' | 'cancel';
  } | null>(null);

  const handlePlaceInOtherFile = () => {
    const sourceFileId = fileContext?.fileId;
    const switchFile = fileContext?.onSwitchFile;
    const moveToFile = fileContext?.onMoveToFile;
    if (
      !moveSession ||
      moveSession.foreign ||
      !fileContext?.requestFilePick ||
      (!(sourceFileId && switchFile) && !moveToFile)
    )
      return;
    if (placeDisabledReason) {
      showToast(placeDisabledReason);
      return;
    }
    // Save the draft as-is before switching away: the session baseline
    // preserves any unsaved edits AND still contains the shelved selections.
    // The removal itself is only written once the move lands elsewhere —
    // canceling out of the destination leaves the source file untouched.
    if (sourceFileId && switchFile && onSaveToServer && hasModifications) {
      persistSource(
        mode === 'text' ? printScriptBlock(textDraft) : serializeFileAst(moveSession.baseline)
      );
      setHasModifications(false);
    }
    // Raw context pick: the dialog's requestFilePick wrapper would persist
    // the canvas AST (which shows selections already removed during collect).
    const session = moveSession;
    fileContext.requestFilePick(
      (file) => {
        if (file.kind !== 'script') {
          showToast('Moved blocks can only be placed in script files.');
          return;
        }
        if (sourceFileId && file.id === sourceFileId) {
          showToast('Pick a different file to place in.');
          return;
        }
        if (sourceFileId && switchFile) {
          pendingForeignPlacement.current = {
            session,
            targetFileId: file.id,
            sourceFileId,
            restore: 'place',
          };
          switchFile(file);
          return;
        }
        // Island hand-off: the destination file opens in its own editor with
        // the session armed. The cut commits in this draft when onPlaced
        // fires (undoable, saved with the island's next save); clone leaves
        // it untouched and clears the shelf right away.
        moveToFile?.(file, {
          operation: session.operation,
          category: session.category === 'expression' ? 'expression' : 'block',
          source: printMovePayload(session, shelfExpression),
          onPlaced:
            session.operation === 'move'
              ? () => {
                  // The shelf may have been resolved/canceled while the
                  // destination editor was open — only commit if this exact
                  // session is still live here.
                  if (moveSessionRef.current !== session) return;
                  commitMoveSession(session, deriveSessionAst(session));
                }
              : undefined,
        });
        if (session.operation === 'clone') setMoveSession(null);
      },
      undefined,
      undefined,
      undefined,
      SCRIPT_ONLY_KINDS
    );
  };

  // Back out of a foreign session: switch to the source file; the init
  // effect restores the pre-session baseline draft and persists it, undoing
  // the auto-saved cut.
  const handleReturnToSourceFile = (restore: 'collect' | 'cancel') => {
    const sourceFileId = moveSession?.sourceFileId;
    const sourceFile = sourceFileId ? fileIndex?.byId.get(sourceFileId) : undefined;
    if (!moveSession?.foreign || !sourceFileId || !sourceFile || !fileContext?.onSwitchFile) {
      // Handed-off sessions (no source file): the island's cut only commits
      // via onPlaced, so an unplaced cancel leaves the source untouched —
      // its move shelf is still live there.
      if (moveSession?.foreign && moveSession.operation === 'move') {
        showToast('Selections not placed — the move shelf is still open in the source.');
      }
      setMoveSession(null);
      return;
    }
    pendingForeignPlacement.current = {
      session: moveSession,
      targetFileId: sourceFileId,
      sourceFileId,
      restore,
    };
    fileContext.onSwitchFile(sourceFile);
  };

  const handlePickExpression = (target: ExpressionMoveTarget) => {
    updateMoveSession((session) => {
      if (session.phase !== 'collect' || session.category === 'block') return session;
      const expressionSelections = session.selections.filter(
        (selection): selection is Exclude<MoveSelection, { kind: 'block' }> =>
          selection.kind !== 'block'
      );
      if (
        expressionSelections.some(
          (selection) =>
            (target.kind === 'chainLink' &&
              selection.kind === 'chainLink' &&
              sameLocation(selection.location, target.location) &&
              selection.linkIndex === target.linkIndex) ||
            (target.kind === 'whole' &&
              selection.kind === 'whole' &&
              sameLocation(selection.location, target.location)) ||
            (!sameLocation(selection.location, target.location) &&
              expressionLocationsOverlap(selection.location, target.location)) ||
            (sameLocation(selection.location, target.location) && selection.kind !== target.kind)
        )
      )
        return session;
      const selection: MoveSelection = { ...target, number: session.nextNumber };
      return {
        ...session,
        category: 'expression',
        selections: [...session.selections, selection],
        nextNumber: session.nextNumber + 1,
      };
    });
  };

  const handlePickBlock = (path: number[], statement: Statement) => {
    updateMoveSession((session) => {
      if (session.phase !== 'collect' || session.category === 'expression') return session;
      if (
        session.selections.some(
          (selection) =>
            selection.kind === 'block' &&
            (isPathPrefix(selection.path, path) || isPathPrefix(path, selection.path))
        )
      )
        return session;
      return {
        ...session,
        category: 'block',
        selections: [
          ...session.selections,
          { kind: 'block', number: session.nextNumber, path, statement },
        ],
        nextNumber: session.nextNumber + 1,
      };
    });
  };

  const handleReturnSelection = (number: number) => {
    if (moveSession?.foreign) {
      if (moveSession.sourceFileId) {
        // Shelf items live in the source file — go back to manage them there.
        handleReturnToSourceFile('collect');
        return;
      }
      // Handed-off sessions have no source to return to: drop the item.
      updateMoveSession((session) => ({
        ...session,
        selections: session.selections.filter((selection) => selection.number !== number),
      }));
      return;
    }
    updateMoveSession((session) => ({
      ...session,
      phase: 'collect',
      category: session.selections.length === 1 ? null : session.category,
      selections: session.selections.filter((selection) => selection.number !== number),
    }));
  };

  const shelfExpression = useMemo(
    () => (moveSession ? composeShelfExpression(moveSession.selections) : null),
    [moveSession]
  );
  const placeDisabledReason = moveSession
    ? moveSession.selections.length === 0
      ? 'Select something to place first.'
      : moveSession.category === 'expression' && !shelfExpression
        ? "These expressions can't be combined into one. Return one and try again."
        : null
    : null;
  // Cross-file placement needs a picker plus either a file identity to swap
  // in place (file editors) or a hand-off that opens the destination file in
  // its own editor (cell/island contexts).
  const canPlaceInOtherFile =
    !readOnly &&
    !!moveSession &&
    !moveSession.foreign &&
    !!fileContext?.requestFilePick &&
    ((!!fileContext.fileId && !!fileContext.onSwitchFile) || !!fileContext.onMoveToFile);
  const handleEnterPlacePhase = useCallback(() => {
    if (!moveSession) return;
    if (placeDisabledReason) {
      showToast(placeDisabledReason);
      return;
    }
    const next = { ...moveSession, phase: 'place' as const };
    dispatch({ type: 'SET_AST', ast: deriveSessionCanvasAst(next, state.ast) });
    setMoveSession(next);
  }, [dispatch, moveSession, placeDisabledReason, showToast, state.ast]);

  const handleBackToCollect = useCallback(() => {
    if (!moveSession) return;
    if (moveSession.foreign) {
      handleReturnToSourceFile('collect');
      return;
    }
    const next = { ...moveSession, phase: 'collect' as const };
    dispatch({ type: 'SET_AST', ast: deriveSessionCanvasAst(next, state.ast) });
    setMoveSession(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, moveSession, state.ast]);

  useEffect(() => {
    if (!isOpen || mode !== 'blocks' || typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (!moveSession && (key === 'm' || key === 'c')) {
        event.preventDefault();
        startMoveSession(key === 'm' ? 'move' : 'clone');
      } else if (key === 'p' && moveSession?.phase === 'collect') {
        event.preventDefault();
        handleEnterPlacePhase();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEnterPlacePhase, isOpen, mode, moveSession, startMoveSession]);

  const canPlaceExpression = useCallback(
    (target: { location: ExpressionLocation; linkIndex?: number }) => {
      if (!moveSession || moveSession.category !== 'expression' || !shelfExpression) return false;
      const links = decomposeChain(shelfExpression);
      const hasConcreteBase = links[0]?.type === 'base' && links[0].expr.kind !== 'NothingLiteral';
      if (target.linkIndex === undefined || target.linkIndex === 0) return hasConcreteBase;
      return (
        links[0]?.type === 'base' && links[0].expr.kind === 'NothingLiteral' && links.length > 1
      );
    },
    [moveSession, shelfExpression]
  );

  const handlePlaceExpression = (target: { location: ExpressionLocation; linkIndex?: number }) => {
    if (!moveSession || !canPlaceExpression(target) || !shelfExpression) return;
    let next = deriveSessionAst(moveSession, state.ast);
    if (target.linkIndex === undefined) {
      next = setScriptExpression(next, target.location, shelfExpression);
    } else {
      const statement = getStatementAtPath(next.statements, target.location.statementPath);
      const expression = statement
        ? getExpressionAtLocation(statement, target.location)
        : undefined;
      if (!expression) return;
      const chain = decomposeChain(expression);
      const shelfLinks = decomposeChain(shelfExpression);
      if (target.linkIndex === 0) {
        next = setScriptExpression(
          next,
          target.location,
          recomposeChain([...shelfLinks, ...chain.slice(1)])
        );
      } else {
        chain.splice(target.linkIndex, 0, ...shelfLinks.slice(1));
        next = setScriptExpression(next, target.location, recomposeChain(chain));
      }
    }
    commitMoveSession(moveSession, next, moveSession.foreign ? state.ast : undefined);
  };

  const handleConfirmExpressionSwap = () => {
    if (!expressionSwapTarget) return;
    const target = expressionSwapTarget;
    setExpressionSwapTarget(null);
    handlePlaceExpression({ location: target.location });
  };

  const handlePlaceBlock = (path: number[]) => {
    if (!moveSession || moveSession.category !== 'block') return;
    const statements = moveSession.selections
      .filter(
        (selection): selection is Extract<MoveSelection, { kind: 'block' }> =>
          selection.kind === 'block'
      )
      .map((selection) => selection.statement);
    if (statements.length === 0) return;
    const base = deriveSessionAst(moveSession, state.ast);
    const insertionIndex = path[path.length - 1] ?? base.statements.length;
    const parentPath = path.slice(0, -1);
    const nextStatements = statements.reduce(
      (current, statement, index) =>
        insertStatementInList(current, [...parentPath, insertionIndex + index], statement),
      base.statements
    );
    commitMoveSession(
      moveSession,
      { ...base, statements: nextStatements },
      moveSession.foreign ? state.ast : undefined
    );
  };

  const moveToolControls: MoveToolControls | undefined = (() => {
    if (!moveSession) return undefined;
    const expressionSelections = moveSession.selections.filter(
      (selection): selection is Exclude<MoveSelection, { kind: 'block' }> =>
        selection.kind !== 'block'
    );
    const blockSelections = moveSession.selections.filter(
      (selection): selection is Extract<MoveSelection, { kind: 'block' }> =>
        selection.kind === 'block'
    );
    const originalStatementPath = (currentPath: number[]) => {
      // Foreign sessions carry source-file paths that mean nothing here.
      if (moveSession.operation === 'clone' || moveSession.foreign) return currentPath;
      const original: number[] = [];
      currentPath.forEach((currentIndex) => {
        const removed = blockSelections
          .filter(
            (selection) =>
              selection.path.length === original.length + 1 &&
              original.every((part, index) => selection.path[index] === part)
          )
          .map((selection) => selection.path[original.length])
          .sort((left, right) => left - right);
        let candidate = currentIndex;
        removed.forEach((index) => {
          if (index <= candidate) candidate++;
        });
        original.push(candidate);
      });
      return original;
    };
    return {
      operation: moveSession.operation,
      phase: moveSession.phase,
      category: moveSession.category,
      getLinkMarkers: (location, linkIndex) =>
        moveSession.phase === 'collect'
          ? expressionSelections
              .filter(
                (selection): selection is Extract<MoveSelection, { kind: 'chainLink' }> =>
                  selection.kind === 'chainLink' &&
                  sameLocation(selection.location, location) &&
                  selection.linkIndex === linkIndex
              )
              .map((selection) => selection.number)
          : [],
      getWholeMarker: (location) =>
        moveSession.phase === 'collect'
          ? expressionSelections.find(
              (selection) =>
                selection.kind === 'whole' && sameLocation(selection.location, location)
            )?.number
          : undefined,
      getOriginalStatementPath: originalStatementPath,
      getBlockMarkers: (currentParentPath, currentBoundary) => {
        if (moveSession.foreign) return [];
        const parent = originalStatementPath(currentParentPath);
        return blockSelections
          .filter(
            (selection) =>
              selection.path.length === parent.length + 1 &&
              parent.every((part, index) => selection.path[index] === part)
          )
          .filter((selection) => {
            const index = selection.path[parent.length];
            if (moveSession.operation === 'clone') return index + 1 === currentBoundary;
            const earlier = blockSelections.filter(
              (candidate) =>
                candidate.path.length === parent.length + 1 &&
                parent.every((part, partIndex) => candidate.path[partIndex] === part) &&
                candidate.path[parent.length] < index
            ).length;
            return index - earlier === currentBoundary;
          })
          .map((selection) => selection.number);
      },
      onPickExpression: handlePickExpression,
      onPickBlock: handlePickBlock,
      onReturn: handleReturnSelection,
      canPlaceExpression,
      onPlaceExpression: handlePlaceExpression,
      onRequestExpressionSwap: setExpressionSwapTarget,
      onPlaceBlock: handlePlaceBlock,
    };
  })();

  // File mode: inference sees the flattened closure, variables, functions,
  // and input labels from every transitively included file (one flat script).
  const fileIndex = fileContext?.index;
  useEffect(() => {
    if (!isOpen || !fileIndex || moveSession) return;
    if (directMarkdown) {
      const body = cleanupFileInputText(directMarkdownDraft.current, fileIndex);
      if (body !== directMarkdownDraft.current) {
        directMarkdownDraft.current = body;
        setMarkdownDraftReplacement({ body, revision: Date.now() });
      }
    }
    if (!directMarkdown && mode === 'text') {
      const source = cleanupFileInputText(textDraft, fileIndex);
      if (source === textDraft) return;
      const ast = parseScriptBlock(source);
      if (ast.diagnostics.some((item) => item.severity === 'error')) return;
      setTextDraft(source);
      dispatch({ type: 'REPLACE_AST', ast });
      return;
    }
    const statements = cleanupFileInputStatements(state.ast.statements, fileIndex);
    if (statements === state.ast.statements) return;
    dispatch({ type: 'REPLACE_AST', ast: { ...state.ast, statements } });
  }, [isOpen, fileIndex, moveSession, directMarkdown, mode, textDraft, state.ast]);
  const inferenceStatements = useMemo(
    () =>
      fileIndex ? collectClosureStatements(state.ast.statements, fileIndex) : state.ast.statements,
    [state.ast.statements, fileIndex]
  );
  const fileInputNames = useMemo(
    () => (fileIndex ? collectFileInputNames(state.ast.statements, fileIndex) : []),
    [state.ast.statements, fileIndex]
  );
  const definedVariables = useMemo(
    () => collectDefinedVariables(inferenceStatements),
    [inferenceStatements]
  );
  const entryKeysBySource = useMemo<EntryKeysBySource>(
    () => computeEntryKeys(sources, state.ast.statements, fileInputNames, effectiveTrigger),
    [sources, state.ast.statements, effectiveTrigger, fileInputNames]
  );
  const inputSources = useMemo(
    () => collectInputSources(inferenceStatements, entryKeysBySource),
    [inferenceStatements, entryKeysBySource]
  );
  const insertColumnRules = useMemo(() => {
    const path = insertTarget?.location?.statementPath ?? insertTarget?.path ?? [];
    for (let length = path.length; length > 0; length--) {
      const statement = getStatementAtPath(state.ast.statements, path.slice(0, length));
      if (statement?.kind === 'UpdateCellStatement') {
        return statement.column.kind === 'StringLiteral'
          ? {
              kind: cellColumnKind(
                sources?.userTableTitle,
                statement.columnType,
                statement.column.value
              ),
              valueType: cellColumnValueType(statement.column.value),
            }
          : undefined;
      }
    }
    return undefined;
  }, [insertTarget, state.ast.statements, sources?.userTableTitle]);
  const definedFunctions = useMemo(
    () => collectDefinedFunctions(inferenceStatements, inputSources),
    [inferenceStatements, inputSources]
  );

  // File validation: dangling File paths + unknown Inputs.entry keys.
  const fileFlags = useMemo(
    () =>
      fileIndex
        ? validateFileReferences(state.ast.statements, fileIndex, entryKeysBySource.Inputs ?? [])
        : [],
    [fileIndex, state.ast.statements, entryKeysBySource]
  );
  // Role lint: blocks incompatible with this file's type (inputs in trigger
  // files, placed* globals in display files, role-mismatched file includes).
  const fileIsTagFile = !!fileContext?.isTagFile;
  const hasFileContext = !!fileContext;
  const roleFlags = useMemo(
    () =>
      hasFileContext
        ? lintScriptStatements(state.ast.statements, {
            isTrigger: !!effectiveTrigger,
            isTagFile: fileIsTagFile,
            index: fileIndex,
          })
        : // No file context (role-message scripts): still run the
          // structural cell-op placement lint.
          lintCellPlacement(state.ast.statements),
    [hasFileContext, fileIsTagFile, effectiveTrigger, state.ast.statements, fileIndex]
  );
  const columnFlags = useMemo(
    () => lintCellColumnTypes(state.ast.statements, sources?.userTableTitle, fileIndex),
    [state.ast.statements, sources?.userTableTitle, fileIndex]
  );
  const allFlags = useMemo(
    () => [...fileFlags, ...roleFlags, ...columnFlags],
    [fileFlags, roleFlags, columnFlags]
  );
  const invalidExpressions = useMemo(
    () =>
      allFlags.some((f) => f.expression)
        ? new Set(allFlags.map((f) => f.expression).filter((e): e is Expression => !!e))
        : undefined,
    [allFlags]
  );
  const invalidStatements = useMemo(
    () =>
      allFlags.some((f) => f.statement)
        ? new Set(allFlags.map((f) => f.statement).filter((s): s is Statement => !!s))
        : undefined,
    [allFlags]
  );
  const flagMessages = useMemo(() => {
    const map = new Map<Statement, string>();
    for (const f of allFlags) {
      if (f.statement && !map.has(f.statement)) map.set(f.statement, f.message);
    }
    return map.size > 0 ? map : undefined;
  }, [allFlags]);

  // --- Saved-version preview: parse the entry the same way Replace does,
  // then run the same inference/lint pipeline over THAT ast so the preview
  // renders exactly what Replace would load (blocks, file cards, flags). ---
  const previewAst = useMemo(() => {
    const saved = previewEntry?.value as { scriptText?: string; markdown?: string } | undefined;
    if (!saved) return null;
    const ast =
      saved.scriptText !== undefined
        ? parseScriptBlock(saved.scriptText)
        : saved.markdown !== undefined
          ? withMarkdownFileBody(state.ast, saved.markdown)
          : null;
    return ast && ast.diagnostics.length === 0 ? ast : null;
  }, [previewEntry, state.ast]);
  const previewFileInputNames = useMemo(
    () => (previewAst && fileIndex ? collectFileInputNames(previewAst.statements, fileIndex) : []),
    [previewAst, fileIndex]
  );
  const previewInferenceStatements = useMemo(
    () =>
      previewAst
        ? fileIndex
          ? collectClosureStatements(previewAst.statements, fileIndex)
          : previewAst.statements
        : [],
    [previewAst, fileIndex]
  );
  const previewEntryKeys = useMemo(
    () =>
      previewAst
        ? computeEntryKeys(sources, previewAst.statements, previewFileInputNames, effectiveTrigger)
        : undefined,
    [previewAst, sources, previewFileInputNames, effectiveTrigger]
  );
  const previewInputSources = useMemo(
    () => collectInputSources(previewInferenceStatements, previewEntryKeys ?? {}),
    [previewInferenceStatements, previewEntryKeys]
  );
  const previewVariables = useMemo(
    () => collectDefinedVariables(previewInferenceStatements),
    [previewInferenceStatements]
  );
  const previewFunctions = useMemo(
    () => collectDefinedFunctions(previewInferenceStatements, previewInputSources),
    [previewInferenceStatements, previewInputSources]
  );
  const previewFlags = useMemo(() => {
    if (!previewAst) return [];
    const fileF = fileIndex
      ? validateFileReferences(previewAst.statements, fileIndex, previewEntryKeys?.Inputs ?? [])
      : [];
    const roleF = hasFileContext
      ? lintScriptStatements(previewAst.statements, {
          isTrigger: !!effectiveTrigger,
          isTagFile: fileIsTagFile,
          index: fileIndex,
        })
      : lintCellPlacement(previewAst.statements);
    const columnF = lintCellColumnTypes(previewAst.statements, sources?.userTableTitle, fileIndex);
    return [...fileF, ...roleF, ...columnF];
  }, [
    previewAst,
    fileIndex,
    previewEntryKeys,
    hasFileContext,
    fileIsTagFile,
    effectiveTrigger,
    sources?.userTableTitle,
  ]);
  const previewInvalidExpressions = useMemo(
    () =>
      previewFlags.some((f) => f.expression)
        ? new Set(previewFlags.map((f) => f.expression).filter((e): e is Expression => !!e))
        : undefined,
    [previewFlags]
  );
  const previewInvalidStatements = useMemo(
    () =>
      previewFlags.some((f) => f.statement)
        ? new Set(previewFlags.map((f) => f.statement).filter((s): s is Statement => !!s))
        : undefined,
    [previewFlags]
  );
  const previewFlagMessages = useMemo(() => {
    const map = new Map<Statement, string>();
    for (const f of previewFlags) {
      if (f.statement && !map.has(f.statement)) map.set(f.statement, f.message);
    }
    return map.size > 0 ? map : undefined;
  }, [previewFlags]);
  /** Preview file context: index + display metadata only — no callbacks, so
   *  file/folder cards render as a fully untouchable view. */
  const previewFileBlocks: FileBlocksContextValue | undefined = useMemo(
    () =>
      fileContext
        ? {
            index: fileContext.index,
            filePath: fileContext.filePath,
            fileOnly: fileContext.fileOnly,
            showFileInputBlocks: fileIsTrigger,
            emptyState: fileContext.fileOnly ? fileContext.emptyState : undefined,
          }
        : undefined,
    [fileContext, fileIsTrigger]
  );
  /** Markdown-body entries (markdown files): evaluate the body the way the
   *  live editor's preview does — inputs resolved via the file index. */
  const previewMarkdown = useMemo(() => {
    if (!directMarkdown || !previewAst) return null;
    const body = markdownFileBody(previewAst);
    if (body === null) return null;
    return fileIndex
      ? flattenStatementsToMarkdown(previewAst.statements, fileIndex).markdown
      : body;
  }, [directMarkdown, previewAst, fileIndex]);

  /** Inputs this draft declares: FileInput statements + markdownVariable
   *  markers (shown as the header strip in file mode). */
  const draftInputs = useMemo(
    () => (fileContext?.filePath ? collectDraftFileInputs(state.ast.statements) : []),
    [fileContext?.filePath, state.ast.statements]
  );

  /** Top-level FileInput statements with their AST paths, editable from the
   *  header strip (name + default), not rendered as canvas blocks. */
  const fileInputEntries = useMemo(() => {
    if (!fileContext?.filePath) return [];
    const entries: { decl: FileInputDecl; path: number[] }[] = [];
    state.ast.statements.forEach((stmt, i) => {
      const decl = getFileInputParts(stmt);
      if (decl) entries.push({ decl, path: [i] });
    });
    return entries;
  }, [fileContext?.filePath, state.ast.statements]);

  /** markdownVariable-declared inputs with no FileInput statement, display
   *  only in the strip (they live inside CreateMarkdown content). */
  const markdownOnlyInputs = useMemo(() => {
    const fileBacked = new Set(fileInputEntries.map((e) => e.decl.name.toLowerCase()));
    return draftInputs.filter((decl) => !fileBacked.has(decl.name.toLowerCase()));
  }, [draftInputs, fileInputEntries]);

  const handleTextChange = (value: string) => {
    setTextDraft(value);
    setHasModifications(true);
    try {
      const parse = fileContext ? parseScriptBlock : parseScript;
      const ast = value.trim().length > 0 ? parse(value) : createScript();
      if (ast.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
        setParseError(ast.diagnostics.map((diagnostic) => diagnostic.message).join('\n'));
        return;
      }
      dispatch({ type: 'REPLACE_AST', ast });
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Parse error');
    }
  };

  const handleSwitchMode = (newMode: EditorMode) => {
    if (moveSession && newMode === 'text') return;
    if (newMode === 'blocks' && mode === 'text') {
      try {
        const parse = fileContext ? parseScriptBlock : parseScript;
        const ast = textDraft.trim().length > 0 ? parse(textDraft) : createScript();
        if (ast.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
          setParseError('Fix the source errors before switching to Blocks.');
          return;
        }
        dispatchWithUndo({ type: 'REPLACE_AST', ast }, 'Switch to blocks');
        setParseError(null);
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Parse error');
        return;
      }
    } else if (newMode === 'text' && mode === 'blocks') {
      setTextDraft(printScript(state.ast));
    }
    setMode(newMode);
  };

  const handleInsertStatement = (stmt: Statement, path: number[], replace = false) => {
    dispatchWithUndo(
      { type: replace ? 'REPLACE_STATEMENT' : 'INSERT_STATEMENT', statement: stmt, path },
      replace ? 'Replace block' : 'Add block'
    );
  };

  const handleInsertExpression = (expression: Expression, target: InsertTarget) => {
    if (!target.location) return;
    dispatchWithUndo(
      target.replaceMode === 'chainBase'
        ? { type: 'REPLACE_CHAIN_BASE', location: target.location, expression }
        : { type: 'SET_EXPRESSION', location: target.location, expression, trackHistory: true },
      'Insert expression'
    );
  };

  const handleInsertBuiltinFunction = (
    fnStatement: Statement,
    callExpression: Expression,
    target: InsertTarget
  ) => {
    if (!target.location) return;
    dispatchWithUndo(
      {
        type: 'INSERT_BUILTIN_FUNCTION',
        fnStatement,
        location: target.location,
        expression: callExpression,
      },
      'Add built-in function'
    );
  };

  const handleSetExpression = (
    location: NonNullable<InsertTarget['location']>,
    expression: Expression,
    trackHistory = false
  ) => {
    if (moveSession) return;
    const statement = getStatementAtPath(state.ast.statements, location.statementPath);
    const columnKind =
      location.slot.kind === 'updateCellColumn' &&
      statement?.kind === 'UpdateCellStatement' &&
      expression.kind === 'StringLiteral'
        ? cellColumnKind(sources?.userTableTitle, statement.columnType, expression.value)
        : undefined;
    if (trackHistory) {
      dispatchWithUndo(
        { type: 'SET_EXPRESSION', location, expression, trackHistory: true, columnKind },
        'Edit expression'
      );
    } else {
      dispatch({ type: 'SET_EXPRESSION', location, expression, trackHistory, columnKind });
    }
  };

  const handleRenameVariable = (from: string, to: string) => {
    if (moveSession) return;
    dispatchWithUndo({ type: 'RENAME_VARIABLE', from, to }, `Rename ${from} to ${to}`);
  };

  const handleSetStatementField = (
    path: number[],
    field:
      | 'name'
      | 'parameters'
      | 'itemName'
      | 'template'
      | 'columnType'
      | 'players'
      | 'dayIndex'
      | 'op'
      | 'allowDuplicates'
      | 'autoRemove'
      | 'tagName'
      | 'tagColor',
    value: string | boolean | string[] | FunctionTemplatePiece[] | Expression
  ) => {
    if (moveSession) return;
    dispatchWithUndo({ type: 'SET_STATEMENT_FIELD', path, field, value }, 'Edit field');
  };

  const handleDeleteStatement = (path: number[]) => {
    if (moveSession) return;
    dispatchWithUndo({ type: 'DELETE_STATEMENT', path }, 'Delete block');
  };

  const handleSetComment = (path: number[], comment: string) => {
    if (moveSession) return;
    dispatchWithUndo(
      { type: 'SET_COMMENT', path, comment },
      comment ? 'Add comment' : 'Remove comment'
    );
  };

  const handleLockedFunctionClick = (path: number[], functionName: string, isBuiltin: boolean) => {
    setDecoupleDialog({ path, functionName, isBuiltin });
  };

  const handleSaveFunction = (name: string, source: string) => {
    // Check if the name is already in use by a built-in function or another
    // saved function (with a different source, same name + same source is a re-save).
    if (BUILTIN_FUNCTION_NAMES.has(name)) {
      setNameCollision(name);
      return;
    }
    const existing = savedFunctions.find((fn) => fn.name === name);
    if (existing && existing.source !== source) {
      setNameCollision(name);
      return;
    }
    // Re-saving a decoupled function should re-lock it, remove from decoupled list.
    setDecoupledFunctions((prev) => prev.filter((n) => n !== name));
    saveFunction(name, source);
  };

  const handleDecouple = (mode: 'remove' | 'decouple') => {
    if (!decoupleDialog) return;
    if (mode === 'remove') {
      unsaveFunction(decoupleDialog.functionName);
    }
    // Both modes unlock the function in the script, no AST change needed,
    // since the lock is purely a UI state based on savedFunctionNames /
    // BUILTIN_FUNCTION_NAMES. Removing from library makes it no longer match.
    // For built-in functions, there's nothing to remove, decoupling just
    // means the user accepts it's no longer treated as locked. We track this
    // by adding the function name to a "decoupled" set.
    setDecoupledFunctions((prev) =>
      prev.includes(decoupleDialog.functionName) ? prev : [...prev, decoupleDialog.functionName]
    );
    setDecoupleDialog(null);
  };

  const handleInsertChainLink = (target: InsertTarget, blockId: string) => {
    if (!target.location) return;
    dispatchWithUndo(
      {
        type: target.kind === 'chainSwap' ? 'REPLACE_CHAIN_LINK_AT' : 'INSERT_CHAIN_LINK_AT',
        location: target.location,
        linkIndex: target.linkIndex ?? 1,
        blockId,
      },
      target.kind === 'chainSwap' ? 'Replace chain link' : 'Add chain link'
    );
  };

  const handleRemove = (target: InsertTarget) => {
    if (target.kind === 'statement' && target.path) {
      dispatchWithUndo({ type: 'DELETE_STATEMENT', path: target.path }, 'Remove block');
    } else if (target.kind === 'chainSwap' && target.location) {
      dispatchWithUndo(
        {
          type: 'REPLACE_CHAIN_LINK_AT',
          location: target.location,
          linkIndex: target.linkIndex ?? 1,
        },
        'Remove chain link'
      );
    } else if (target.location) {
      dispatchWithUndo(
        {
          type: 'SET_EXPRESSION',
          location: target.location,
          expression: { kind: 'NothingLiteral', span: state.ast.span },
          trackHistory: true,
        },
        'Remove expression'
      );
    }
  };

  // File mode stores the raw script (cell = bare File(...) list, file = raw
  // statements); other contexts store the /*script ... script*/ island.
  // FileInput statements are normalized to a top-of-file prefix on the way
  // out: the GUI treats them as living in the header strip.
  const serializeDraft = (astOverride?: Script) => {
    const base = astOverride ?? state.ast;
    if (!fileContext || fileContext.scriptIsland) {
      const source = mode === 'text' ? printScriptBlock(textDraft) : printScriptBlock(base);
      return fileIndex ? cleanupFileInputText(source, fileIndex) : source;
    }
    const ast = directMarkdown
      ? withMarkdownFileBody(base, directMarkdownDraft.current)
      : mode === 'text'
        ? parseScriptBlock(textDraft.trim())
        : base;
    const source = printScript(
      fileContext.filePath ? { ...ast, statements: hoistFileInputs(ast.statements) } : ast
    );
    return fileIndex ? cleanupFileInputText(source, fileIndex) : source;
  };

  // File-mode serialization of a standalone AST (e.g. restoring a move
  // session baseline): ignores mode/directMarkdown since the AST is already
  // the complete source of truth.
  const serializeFileAst = (ast: Script) => {
    const source = printScript(
      fileContext?.filePath ? { ...ast, statements: hoistFileInputs(ast.statements) } : ast
    );
    return fileIndex ? cleanupFileInputText(source, fileIndex) : source;
  };

  /** A markdown-kind file whose draft no longer fits the single
   *  CreateMarkdown shape must be converted to a script file before it can
   *  be saved. The check runs on the serialized AST, not the live one, so
   *  text-mode drafts are judged on their current text. */
  const markdownKindOutgrown = () => {
    if (fileContext?.fileKind !== 'markdown' || !fileContext.onConvertToScript) return false;
    const ast = directMarkdown
      ? withMarkdownFileBody(state.ast, directMarkdownDraft.current)
      : mode === 'text'
        ? parseScriptBlock(textDraft.trim())
        : state.ast;
    return markdownFileBody(ast) === null;
  };

  const submitDraft = () => {
    const textToSubmit = serializeDraft();
    if (hasModifications) {
      if (onSaveToServer) {
        persistSource(textToSubmit);
      } else {
        onSubmit(textToSubmit);
      }
    }
    onDone?.(textToSubmit);
    setHasModifications(false);
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!canSubmit || moveSession) return;
    if (markdownKindOutgrown()) {
      setConvertToScriptPrompt('submit');
      return;
    }
    submitDraft();
  };

  const saveDraft = () => {
    if (onSaveToServer) {
      persistSource(serializeDraft());
    }
    setHasModifications(false);
  };

  // Save without closing: persists the full markdown to server via parent
  const handleSave = () => {
    if (!canSubmit || !!moveSession) return;
    if (!hasModifications) return;
    if (markdownKindOutgrown()) {
      setConvertToScriptPrompt('save');
      return;
    }
    saveDraft();
  };

  // File mode: persist the draft before the file browser opens on top, so no
  // work is ever unsaved underneath a stacked modal.
  const requestFilePick = useCallback(
    (
      onPick: (file: ScriptFile) => void,
      onCancel?: () => void,
      role?: ScriptFileRole,
      onPickFolder?: (path: string) => void,
      fileKinds?: ScriptFileKind[]
    ) => {
      if ((hasModifications || directMarkdown) && onSaveToServer && !readOnly) {
        persistSource(serializeDraft());
        setHasModifications(false);
      }
      fileContext?.requestFilePick(onPick, onCancel, role, onPickFolder, fileKinds);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      hasModifications,
      directMarkdown,
      readOnly,
      onSaveToServer,
      fileContext,
      mode,
      textDraft,
      state.ast,
      fileHistory.history,
    ]
  );

  const requestCompositionPick = useCallback(
    (
      onPick: (result: { file?: ScriptFile; folderPath?: string; statement?: Statement }) => void,
      onCancel?: () => void
    ) => {
      if ((hasModifications || directMarkdown) && onSaveToServer && !readOnly) {
        persistSource(serializeDraft());
        setHasModifications(false);
      }
      fileContext?.requestCompositionPick?.(onPick, onCancel);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      hasModifications,
      directMarkdown,
      readOnly,
      onSaveToServer,
      fileContext,
      mode,
      textDraft,
      state.ast,
      fileHistory.history,
    ]
  );

  const insertFileAtTarget = useCallback(
    (target: InsertTarget) => {
      if (target.kind === 'statement' && fileContext?.requestCompositionPick) {
        requestCompositionPick((result) => {
          const statement = result.statement
            ? result.statement
            : result.file
              ? makeFileStatement(result.file, fileInputDefaults(result.file))
              : result.folderPath
                ? makeFolderStatement({
                    path: result.folderPath,
                    id: fileContext.index.folderIdentities.byPath.get(
                      result.folderPath.toLowerCase()
                    ),
                  })
                : undefined;
          if (!statement) return;
          handleInsertStatement(statement, target.path ?? [], target.mode === 'swap');
        });
        return;
      }
      requestFilePick(
        (file) => {
          if (target.kind === 'expression' && target.location) {
            const statement = makeFileStatement(file, fileInputDefaults(file));
            if (statement.kind === 'ExpressionStatement') {
              handleInsertExpression(statement.expression, target);
            }
            return;
          }
          handleInsertStatement(
            makeFileStatement(file, fileInputDefaults(file)),
            target.path ?? [],
            target.mode === 'swap'
          );
        },
        undefined,
        target.location?.slot.kind === 'cellOpValue' ? 'display' : undefined,
        // Statement targets can receive a Folder() block too - the same
        // picker selects files or folders.
        target.kind === 'statement'
          ? (folderPath) =>
              handleInsertStatement(
                makeFolderStatement({
                  path: folderPath,
                  id: fileContext?.index.folderIdentities.byPath.get(folderPath.toLowerCase()),
                }),
                target.path ?? [],
                target.mode === 'swap'
              )
          : undefined
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestFilePick, requestCompositionPick, fileContext]
  );

  // File blocks rendered in the canvas can open/retarget their file.
  const fileBlocksValue: FileBlocksContextValue | undefined = fileContext
    ? {
        index: fileContext.index,
        filePath: fileContext.filePath,
        fileOnly: fileContext.fileOnly,
        // Trigger files have no inputs: FileInput statements stay on the
        // canvas so the role lint can flag them.
        showFileInputBlocks: fileIsTrigger,
        emptyState: fileContext.fileOnly ? fileContext.emptyState : undefined,
        onOpenFile: fileContext.onOpenFile
          ? (file) => {
              if (hasModifications && onSaveToServer) {
                persistSource(serializeDraft());
                setHasModifications(false);
              }
              fileContext.onOpenFile?.(file);
            }
          : undefined,
        onRetargetFile: (statementPath) => {
          requestFilePick((file) => {
            const prev = getStatementAtPath(state.ast.statements, statementPath);
            handleInsertStatement(retargetFileStatement(file, prev), statementPath, true);
          });
        },
        onRetargetFileExpression: (location) => {
          requestFilePick(
            (file) => {
              const owner = getStatementAtPath(state.ast.statements, location.statementPath);
              const previous = owner ? getExpressionAtLocation(owner, location) : undefined;
              const replacement = retargetFileStatement(
                file,
                previous
                  ? { kind: 'ExpressionStatement', expression: previous, span: previous.span }
                  : undefined
              );
              if (replacement.kind === 'ExpressionStatement') {
                handleSetExpression(location, replacement.expression, true);
              }
            },
            undefined,
            'display'
          );
        },
        onRetargetFolder: fileContext.requestFolderPick
          ? (statementPath) => {
              if ((hasModifications || directMarkdown) && onSaveToServer && !readOnly) {
                persistSource(serializeDraft());
                setHasModifications(false);
              }
              fileContext.requestFolderPick?.((folderPath) => {
                const previous = getStatementAtPath(state.ast.statements, statementPath);
                const previousParts = previous ? getFolderCallParts(previous) : null;
                handleInsertStatement(
                  makeFolderStatement(
                    {
                      path: folderPath,
                      id: fileContext.index.folderIdentities.byPath.get(folderPath.toLowerCase()),
                    },
                    {
                      order: previousParts?.order,
                      hidden: previousParts?.hidden,
                      recursive: previousParts?.recursive,
                      dividers: previousParts?.dividers,
                      align: previousParts?.align,
                      imageHeight: previousParts?.imageHeight,
                    }
                  ),
                  statementPath,
                  true
                );
              });
            }
          : undefined,
        onOpenFolderSettings: readOnly ? undefined : setFolderSettingsPath,
      }
    : undefined;

  // --- File-input strip: picker + input modals (same UX as function params) ---
  const [inputPickerOpen, setInputPickerOpen] = useState(false);
  const [inputPieceType, setInputPieceType] = useState('input-blank');
  const [newInputOpen, setNewInputOpen] = useState(false);
  const [editingInput, setEditingInput] = useState<{
    decl: FileInputDecl;
    path: number[];
  } | null>(null);
  const addInputTooltipId = React.useId();
  const { setHovered: setAddInputHovered } = useTooltip(addInputTooltipId, 'Add input');
  // Header path chip → file options menu. The icon button next to it goes
  // straight to the file browser to switch files.
  const pathChipTooltipId = React.useId();
  const { setHovered: setPathChipHovered } = useTooltip(pathChipTooltipId, 'File options');
  const filePickTooltipId = React.useId();
  const { setHovered: setFilePickHovered } = useTooltip(
    filePickTooltipId,
    'Edit a different file…'
  );
  const [renameDraft, setRenameDraft] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [fileOptionsOpen, setFileOptionsOpen] = useState(false);
  const [fileOptionsLeaveConfirm, setFileOptionsLeaveConfirm] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [deleteFileConfirm, setDeleteFileConfirm] = useState(false);
  // Memoized: a fresh object each render would reset the modal's drafts
  // mid-edit (its seed effect depends on `initial`).
  const editingInputInitial = useMemo(
    () =>
      editingInput
        ? {
            label: editingInput.decl.name,
            defaultExpression: editingInput.decl.defaultExpression,
          }
        : null,
    [editingInput]
  );

  /** De-dupe input names: call-site overrides key off the name, so two
   *  declarations with the same name would be ambiguous. */
  const uniqueInputName = (base: string, excludePath?: number[]) => {
    const taken = new Set(
      fileInputEntries
        .filter((e) => !excludePath || e.path[0] !== excludePath[0])
        .map((e) => e.decl.name.toLowerCase())
    );
    let name = base || 'input';
    for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base}${i}`;
    return name;
  };

  const commitNewInput = (piece: FunctionTemplatePiece) => {
    if (!directMarkdown && parseError) {
      showToast('Fix the source errors before editing inputs.');
      return;
    }
    const ast = directMarkdown
      ? withMarkdownFileBody(state.ast, directMarkdownDraft.current)
      : state.ast;
    const stmts = [...ast.statements];
    const name = uniqueInputName(piece.label ?? 'input');
    let insertAt = 0;
    while (insertAt < stmts.length && isFileInputStatement(stmts[insertAt])) insertAt++;
    stmts.splice(insertAt, 0, makeFileInputStatement(name, piece.defaultExpression));
    if (!directMarkdown && mode === 'text')
      setTextDraft(printScript({ ...ast, statements: stmts }));
    dispatchWithUndo({ type: 'REPLACE_AST', ast: { ...ast, statements: stmts } }, 'Add file input');
    setNewInputOpen(false);
    pendingInputInsertion.current?.(name);
    pendingInputInsertion.current = null;
  };

  const commitEditInput = (piece: FunctionTemplatePiece) => {
    if (!editingInput) return;
    if (!directMarkdown && parseError) {
      showToast('Fix the source errors before editing inputs.');
      return;
    }
    const name = uniqueInputName(piece.label ?? 'input', editingInput.path);
    let ast = directMarkdown
      ? withMarkdownFileBody(state.ast, directMarkdownDraft.current)
      : state.ast;
    ast = renameFileInputReferences(ast, editingInput.decl.name, name);
    ast = {
      ...ast,
      statements: ast.statements.map((s, i) =>
        i === editingInput.path[0] ? makeFileInputStatement(name, piece.defaultExpression) : s
      ),
    };
    directMarkdownDraft.current = markdownFileBody(ast) ?? directMarkdownDraft.current;
    if (directMarkdown)
      setMarkdownDraftReplacement({ body: directMarkdownDraft.current, revision: Date.now() });
    if (!directMarkdown && mode === 'text') setTextDraft(printScript(ast));
    dispatchWithUndo({ type: 'REPLACE_AST', ast }, 'Edit file input');
    setEditingInput(null);
  };

  const removeEditingInput = () => {
    if (!editingInput) return;
    if (!directMarkdown && parseError) {
      showToast('Fix the source errors before editing inputs.');
      return;
    }
    const ast = directMarkdown
      ? withMarkdownFileBody(state.ast, directMarkdownDraft.current)
      : state.ast;
    if (hasFileInputReferences(ast, editingInput.decl.name)) {
      showToast(
        `"${editingInput.decl.name}" is still used. Remove its markdown variables and Inputs.entry references in Source before deleting it.`
      );
      return;
    }
    const next = {
      ...ast,
      statements: ast.statements.filter((_, i) => i !== editingInput.path[0]),
    };
    if (!directMarkdown && mode === 'text') setTextDraft(printScript(next));
    dispatchWithUndo({ type: 'REPLACE_AST', ast: next }, 'Remove file input');
    setEditingInput(null);
  };

  const changeFileEditorMode = (markdown: boolean) => {
    if (markdown === directMarkdown) return;
    if (!markdown) {
      const ast = withMarkdownFileBody(state.ast, directMarkdownDraft.current);
      if (directMarkdownDraft.current !== directMarkdownBody) {
        dispatchWithUndo({ type: 'REPLACE_AST', ast }, 'Edit markdown');
      }
      setTextDraft(printScript(ast));
      switchFileEditor(false);
      return;
    }
    try {
      const ast = normalizeMarkdownFileInputs(
        mode === 'text' ? parseScriptBlock(textDraft) : state.ast
      );
      const body = markdownFileBody(ast);
      if (body === null) {
        const hasErrors = ast.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
        setParseError(
          hasErrors ? ast.diagnostics.map((diagnostic) => diagnostic.message).join('\n') : null
        );
        showToast(
          hasErrors
            ? 'Fix the source errors before switching to Markdown.'
            : 'Markdown view only supports a single CreateMarkdown block.'
        );
        return;
      }
      if (mode === 'text' || ast !== state.ast)
        dispatchWithUndo({ type: 'REPLACE_AST', ast }, 'Edit source');
      directMarkdownDraft.current = body;
      setParseError(null);
      switchFileEditor(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Fix the source before switching to Markdown.';
      setParseError(message);
      showToast(message);
    }
  };

  const fileEditorModeSwitch =
    fileContext?.fileKind === 'markdown' ? (
      <FileEditorModeSwitch markdown={directMarkdown} onChange={changeFileEditorMode} />
    ) : null;

  /* Script files (non-tag) pick a role: display files render into
     cells/messages, trigger files run on tag placement. Switching flags
     incompatible blocks via the linter. Lives at the right edge of the file
     path row so it doesn't cost its own row like the Markdown/Source switch. */
  const fileRoleSwitch =
    fileContext &&
    !fileContext.isTagFile &&
    fileContext.fileKind === 'script' &&
    fileContext.onSetFileRole ? (
      <Row className="border-subtle-border gap-0 overflow-hidden rounded-lg border">
        {(['display', 'trigger'] as const).map((role) => {
          const active = (fileContext.fileRole ?? 'display') === role;
          return (
            <Pressable
              key={role}
              accessibilityRole="button"
              onPress={readOnly ? undefined : () => fileContext.onSetFileRole?.(role)}
              className={`px-2.5 py-1 ${active ? 'bg-text/15' : 'bg-transparent'}`}>
              <Row className="items-center gap-1">
                {role === 'trigger' && <Zap size={10} color={active ? '#B45309' : '#1a1a1a'} />}
                <FontText className="text-xs" weight={active ? 'medium' : undefined}>
                  {role === 'display' ? 'Display file' : 'Trigger file'}
                </FontText>
              </Row>
            </Pressable>
          );
        })}
      </Row>
    ) : null;

  /** File options: the name field is the dialog's primary edit; Save
   *  commits it. Folder stays put; the browse icon covers retargeting. */
  const openFileOptions = () => {
    setRenameDraft(filePathName(fileContext?.filePath ?? ''));
    setRenameError(null);
    setFileOptionsOpen(true);
  };
  const hasFileOptionsChanges = renameDraft.trim() !== filePathName(fileContext?.filePath ?? '');
  const handleFileOptionsAttemptClose = () => {
    if (hasFileOptionsChanges) setFileOptionsLeaveConfirm(true);
    else setFileOptionsOpen(false);
  };
  const submitRenameFile = () => {
    if (!fileContext?.filePath) return;
    const name = renameDraft.trim();
    if (name === filePathName(fileContext.filePath)) {
      setFileOptionsOpen(false);
      return;
    }
    const error = !name
      ? 'Name is required'
      : !isValidFileName(name)
        ? 'Names can\'t contain / \\ : * ? " < > |'
        : joinFilePath(folderOfPath(fileContext.filePath), name).toLowerCase() !==
              fileContext.filePath.toLowerCase() &&
            fileContext.index.byPath.has(
              joinFilePath(folderOfPath(fileContext.filePath), name).toLowerCase()
            )
          ? 'A file with that name already exists here'
          : null;
    if (error) {
      setRenameError(error);
      return;
    }
    if (fileContext.onRenameFile && fileContext.onRenameFile(name) === false) {
      setRenameError('That name is not available here');
      return;
    }
    setFileOptionsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      setIsHistoryOpen(false);
      setPreviewEntry(null);
    }
  }, [isOpen]);

  // --- Unsaved changes protection ---
  const handleAttemptClose = () => {
    if (moveSession?.foreign && moveSession.sourceFileId) {
      // Closing would strand the selections cut from the source file; go
      // back and restore it instead.
      handleReturnToSourceFile('cancel');
      return;
    }
    if (hasModifications) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  // Keyboard shortcuts (must be after handleAttemptClose/handleSave declarations)
  useKeyboardShortcuts({
    onSave: handleSave,
    onClose: handleAttemptClose,
    enabled: isOpen && !directMarkdown && !switchingFileEditor && !isHistoryOpen && !previewEntry,
  });

  // Name collision alert: Enter or Esc dismisses (OK is the only action)
  useKeyboardShortcuts({
    onPrimaryAction: () => setNameCollision(null),
    onClose: () => setNameCollision(null),
    enabled: nameCollision !== null,
  });

  // Decouple dialog: Esc cancels (multiple choices, no single primary action)
  useKeyboardShortcuts({
    onClose: () => setDecoupleDialog(null),
    enabled: decoupleDialog !== null,
  });

  const handleOpenChange = (open: boolean) => {
    if (!open && hasModifications) {
      setIsLeaveConfirmDialogOpen(true);
    } else {
      onOpenChange(open);
    }
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmDialogOpen(false);
    setHasModifications(false);
    onOpenChange(false);
  };

  // Empty is valid in file contexts (empty file list / empty file).
  const canSubmit =
    mode === 'text'
      ? fileContext
        ? !parseError
        : textDraft.trim().length > 0 && !parseError
      : fileContext
        ? !state.ast.diagnostics.some((diagnostic) => diagnostic.severity === 'error')
        : state.ast.statements.length > 0;
  // Done is always pressable when the draft is valid: unmodified drafts
  // close without a write (see submitDraft), so no save-first is required.
  const doneEnabled = canSubmit && !moveSession;

  // Preview: flatten the current draft into the mega-script markdown.
  const previewFlatten = useMemo(() => {
    if (!fileIndex) return null;
    const stmts =
      mode === 'text'
        ? textDraft.trim().length > 0
          ? parseScriptBlock(textDraft).statements
          : []
        : state.ast.statements;
    return flattenStatementsToMarkdown(stmts, fileIndex);
  }, [fileIndex, mode, textDraft, state.ast]);

  return (
    <ScriptFilesIndexContext.Provider value={fileIndex ?? null}>
      <ConvexDialog.Root
        isOpen={isOpen && !directMarkdown && !switchingFileEditor}
        onOpenChange={handleOpenChange}>
        <ConvexDialog.Trigger asChild>
          <View />
        </ConvexDialog.Trigger>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="h-[85vh] max-w-5xl" isSwipeable={false}>
            <View ref={targetRef} className="min-h-0 flex-1">
              <CloseButton onPress={readOnly ? () => onOpenChange(false) : handleAttemptClose} />
              {onMinimize && (
                <MinimizeButton
                  hasUnsavedChanges={hasModifications}
                  onSave={handleSave}
                  onMinimize={performMinimize}
                />
              )}
              {onSaveToServer && !readOnly && (
                <SaveHistoryPill
                  hasUnsavedChanges={hasModifications}
                  isInvalid={!canSubmit || !!moveSession}
                  invalidMessage={
                    !canSubmit ? (parseError ?? 'Fix the script errors before saving.') : undefined
                  }
                  onSave={handleSave}
                  onOpenHistory={() => setIsHistoryOpen(true)}
                  hasMinimizeButton={!!onMinimize}
                  hasHistoryButton={!!effectiveHistory}
                />
              )}
              <DialogHeader
                text={title}
                subtext={
                  effectiveTrigger
                    ? fileContext?.isTagFile
                      ? 'Runs when this tag is added to a cell'
                      : 'Trigger file - runs inside tag triggers'
                    : fileContext?.fileOnly
                      ? 'Add files: they run in order as one script'
                      : fileContext?.filePath
                        ? 'A reusable file: include it from cells or other files'
                        : 'Build dynamic inputs with blocks or text'
                }
              />
              {fileContext?.filePath && (
                <Column className="mb-3 gap-1.5">
                  <Row className="flex-wrap items-center justify-between gap-1.5">
                    <FilePathControls
                      context={fileContext}
                      readOnly={readOnly}
                      onOptions={openFileOptions}
                      onBrowse={() => requestFilePick((file) => fileContext.onSwitchFile?.(file))}
                      onOptionsHover={setPathChipHovered}
                      onBrowseHover={setFilePickHovered}
                    />
                    {fileRoleSwitch}
                  </Row>
                  {/* Tag files: the Tag({NAME, COLOR}) header is file meta,
                      edited here - the canvas holds only the trigger body. */}
                  {fileContext.isTagFile && fileContext.tagMeta && (
                    <Row className="flex-wrap items-center gap-1.5">
                      <Tag size={12} color="#7E22CE" />
                      <FontText variant="subtext" className="text-xs">
                        Tag
                      </FontText>
                      <View className="border-subtle-border rounded-md border bg-white px-2 py-0.5">
                        <FontTextInput
                          value={tagNameDraft}
                          onChangeText={readOnly ? undefined : setTagNameDraft}
                          onBlur={
                            readOnly
                              ? undefined
                              : () => {
                                  const name = tagNameDraft.trim();
                                  if (name && name !== fileContext.tagMeta!.name) {
                                    fileContext.onTagMetaChange?.({
                                      name,
                                      color: fileContext.tagMeta!.color,
                                    });
                                  } else {
                                    setTagNameDraft(fileContext.tagMeta!.name);
                                  }
                                }
                          }
                          editable={!readOnly}
                          className="text-xs"
                          style={{ minWidth: 90 }}
                        />
                      </View>
                      <Row className="items-center gap-1">
                        {TAG_COLORS.map((c) => (
                          <Pressable
                            key={c.name}
                            accessibilityRole="button"
                            accessibilityLabel={`Tag color ${c.name}`}
                            onPress={
                              readOnly
                                ? undefined
                                : () =>
                                    fileContext.onTagMetaChange?.({
                                      name: fileContext.tagMeta!.name,
                                      color: c.name,
                                    })
                            }
                            className="h-4 w-4 rounded-full"
                            style={{
                              backgroundColor: c.bg,
                              borderWidth: fileContext.tagMeta!.color === c.name ? 2 : 1,
                              borderColor:
                                fileContext.tagMeta!.color === c.name
                                  ? '#1a1a1a'
                                  : 'rgba(0,0,0,0.15)',
                            }}
                          />
                        ))}
                      </Row>
                    </Row>
                  )}
                  {!fileIsTrigger &&
                    (draftInputs.length > 0 || !readOnly || fileEditorModeSwitch) && (
                      <Row className="flex-wrap items-center gap-1.5">
                        <FontText variant="subtext" className="text-xs">
                          Inputs:
                        </FontText>
                        {fileInputEntries.map(({ decl, path }) => (
                          <Pressable
                            key={path[0]}
                            accessibilityRole="button"
                            onPress={readOnly ? undefined : () => setEditingInput({ decl, path })}
                            className="border-subtle-border items-center rounded-md border bg-indigo-500/10 px-2 py-0.5 hover:bg-indigo-500/20">
                            <Row className="items-center gap-1">
                              <FontText className="text-xs" style={{ color: '#3730A3' }}>
                                {decl.name}
                              </FontText>
                              <FontText variant="subtext" className="text-xs opacity-60">
                                {inputTypeLabel(decl)}
                              </FontText>
                            </Row>
                          </Pressable>
                        ))}
                        {markdownOnlyInputs.map((input) => (
                          <View
                            key={input.name}
                            className="border-subtle-border rounded-md border bg-indigo-500/10 px-2 py-0.5">
                            <Row className="items-center gap-1">
                              <FontText className="text-xs" style={{ color: '#3730A3' }}>
                                {input.name}
                              </FontText>
                              <FontText variant="subtext" className="text-xs opacity-60">
                                markdown
                              </FontText>
                            </Row>
                          </View>
                        ))}
                        {!readOnly && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Add input"
                            onPress={() => setInputPickerOpen(true)}
                            onHoverIn={() => setAddInputHovered(true)}
                            onHoverOut={() => setAddInputHovered(false)}
                            className="border-subtle-border bg-text/5 hover:bg-text/10 h-6 w-6 items-center justify-center rounded-md border">
                            <Plus size={12} color="#1a1a1a" />
                          </Pressable>
                        )}
                        <View className="min-w-2 flex-1" />
                        {fileEditorModeSwitch}
                      </Row>
                    )}
                </Column>
              )}
              <Column className="min-h-0 flex-1 gap-3">
                {/* Rendered only when it has content - an empty row would
                    still consume a gap-3 slot above the canvas. */}
                {(fileContext || !readOnly) && (
                  <Row className="items-center justify-between gap-2">
                    <Row className="items-center gap-2">
                      {fileContext && (
                        <AppButton
                          variant="outline"
                          tooltip="Preview file"
                          className={isTinyScreen ? 'h-9 w-9 px-0' : 'h-9 px-4'}
                          onPress={() => setIsPreviewOpen(true)}
                          dropShadow={false}>
                          {/* Nested Row keeps the eye-to-label gap small; without
                              it AppButton's gap-4 plus text margin pushes the
                              eye against the left edge. */}
                          <Row className="items-center gap-1.5">
                            <Eye size={16} color="#1a1a1a" />
                            {!isTinyScreen && <FontText className="text-sm">Preview</FontText>}
                          </Row>
                        </AppButton>
                      )}
                      {mode === 'blocks' && !readOnly && (
                        <>
                          <AppButton
                            variant="outline"
                            tooltip="Undo"
                            className="h-8 px-3"
                            onPress={undo}
                            dropShadow={false}
                            disabled={!canUndo || !!moveSession}>
                            <Undo2 size={16} color="#1a1a1a" />
                          </AppButton>
                          <AppButton
                            variant="outline"
                            tooltip="Redo"
                            className="h-8 px-3"
                            onPress={redo}
                            dropShadow={false}
                            disabled={!canRedo || !!moveSession}>
                            <Redo2 size={16} color="#1a1a1a" />
                          </AppButton>
                        </>
                      )}
                    </Row>
                    {!readOnly && (
                      <Row className="gap-2">
                        <AppButton
                          variant={mode === 'blocks' ? 'filled' : 'outline'}
                          className="h-8 px-3"
                          onPress={() => handleSwitchMode('blocks')}
                          dropShadow={false}>
                          <FontText
                            className="text-sm"
                            color={mode === 'blocks' ? 'white' : undefined}>
                            Blocks
                          </FontText>
                        </AppButton>
                        <AppButton
                          variant={mode === 'text' ? 'filled' : 'outline'}
                          className="h-8 px-3"
                          onPress={() => handleSwitchMode('text')}
                          disabled={!!moveSession}
                          dropShadow={false}>
                          <FontText className="text-sm" color={mode === 'text' ? 'white' : undefined}>
                            Text
                          </FontText>
                        </AppButton>
                      </Row>
                    )}
                  </Row>
                )}

                {parseError && (
                  <View className="rounded-lg border border-red-400/30 bg-red-400/5 p-2">
                    <FontText className="text-xs">{parseError}</FontText>
                  </View>
                )}

                <View className="min-h-0 flex-1">
                  {mode === 'text' ? (
                    <TextInput
                      multiline
                      value={textDraft}
                      onChangeText={readOnly ? undefined : handleTextChange}
                      onKeyPress={readOnly ? () => showToast('Preview only') : undefined}
                      editable={!readOnly}
                      placeholder={`Variable({\n  NAME = "deadPlayers",\n  VALUE = players.Filter(Item => Item.entry("isAlive") == false),\n});\n\nCreateSelectInput({\n  NAME = "revive",\n  LIST = deadPlayers,\n  LABEL = "Back From Dead",\n  NUMSELECTABLE = (deadPlayers.length / 2).floor,\n});`}
                      placeholderTextColor="#0004"
                      className="bg-text/5 min-h-0 flex-1 rounded-xl p-4 font-mono text-sm"
                      style={{
                        lineHeight: 20,
                        textAlignVertical: 'top',
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  ) : (
                    <ShadowScrollView
                      className="flex-1"
                      scrollViewClassName="flex-1 rounded-xl p-3">
                      <Canvas
                        statements={state.ast.statements}
                        columnTitles={sources?.userTableTitle}
                        definedVariables={definedVariables}
                        definedFunctions={definedFunctions}
                        onAdd={
                          readOnly
                            ? () => showToast('Preview only')
                            : fileContext?.fileOnly
                              ? (target) => {
                                  if (moveSession) return;
                                  // Only top-level statement slots are
                                  // file-picked; expression slots (File()
                                  // input args) use the normal expression
                                  // picker so inputs stay editable.
                                  if (fileOnlyInsertRoute(target.kind) === 'filePick') {
                                    insertFileAtTarget(target);
                                  } else {
                                    setInsertTarget(target);
                                  }
                                }
                              : (target) => {
                                  if (!moveSession) setInsertTarget(target);
                                }
                        }
                        moveTool={readOnly ? undefined : moveToolControls}
                        onSetExpression={
                          readOnly ? () => showToast('Preview only') : handleSetExpression
                        }
                        onSetStatementField={
                          readOnly ? () => showToast('Preview only') : handleSetStatementField
                        }
                        onDeleteStatement={
                          readOnly ? () => showToast('Preview only') : handleDeleteStatement
                        }
                        onRenameVariable={
                          readOnly ? () => showToast('Preview only') : handleRenameVariable
                        }
                        entryKeysBySource={entryKeysBySource}
                        inputSources={inputSources}
                        isTriggerContext={effectiveTrigger}
                        gameId={gameId}
                        allowTableColumnCreate={!readOnly}
                        savedFunctionNames={savedFunctionNames}
                        onSaveFunction={
                          readOnly ? () => showToast('Preview only') : handleSaveFunction
                        }
                        onUnsaveFunction={
                          readOnly ? () => showToast('Preview only') : unsaveFunction
                        }
                        onLockedFunctionClick={
                          readOnly ? () => showToast('Preview only') : handleLockedFunctionClick
                        }
                        decoupledFunctionNames={decoupledFunctions}
                        onSetComment={readOnly ? () => showToast('Preview only') : handleSetComment}
                        onEditMarkdown={
                          readOnly
                            ? () => showToast('Preview only')
                            : (value, onSave) => setMarkdownEditor({ isOpen: true, value, onSave })
                        }
                        fileBlocks={fileBlocksValue}
                        invalidExpressions={invalidExpressions}
                        invalidStatements={invalidStatements}
                        flagMessages={flagMessages}
                      />
                      {moveSession && moveSession.selections.length > 0 && (
                        // Clears the floating move/clone shelf (~80px) plus a buffer
                        <View style={{ height: 96 }} />
                      )}
                    </ShadowScrollView>
                  )}
                  {moveSession && moveSession.selections.length > 0 && (
                    <View className="border-subtle-border bg-background/95 absolute bottom-3 left-3 right-3 z-30 rounded-2xl border p-2 shadow-lg">
                      <Row className="mb-1 items-center justify-between px-1">
                        <FontText weight="medium" className="text-xs">
                          {moveSession.operation === 'move' ? 'Moving' : 'Cloning'}{' '}
                          {moveSession.category === 'block' ? 'blocks' : 'expressions'}
                        </FontText>
                        <FontText variant="subtext" className="text-xs">
                          {moveSession.phase === 'place'
                            ? 'Choose a green target'
                            : 'Click an item to return it'}
                        </FontText>
                      </Row>
                      <ShadowScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <Row className="items-center gap-1">
                          {moveSession.selections.map((selection) => (
                            <ShelfItem
                              key={selection.number}
                              selection={selection}
                              onReturn={() => handleReturnSelection(selection.number)}
                              entryKeysBySource={entryKeysBySource}
                              definedFunctions={definedFunctions}
                            />
                          ))}
                        </Row>
                      </ShadowScrollView>
                    </View>
                  )}
                </View>

                <Row className="items-center justify-between gap-4 pt-2">
                  <Row className="gap-2">
                    {mode === 'blocks' &&
                      !readOnly &&
                      (moveSession ? (
                        moveSession.phase === 'place' ? (
                          // Handed-off sessions have no source canvas to
                          // return to — a plain Cancel just ends them.
                          moveSession.foreign && !moveSession.sourceFileId ? (
                            <AppButton
                              variant="outline"
                              className="h-8 px-3"
                              onPress={cancelMoveSession}
                              dropShadow={false}>
                              <FontText className="text-sm">Cancel</FontText>
                            </AppButton>
                          ) : (
                            <AppButton
                              variant="filled"
                              className="h-8 px-4"
                              onPress={handleBackToCollect}
                              dropShadow={false}>
                              <FontText className="text-sm" color="white">
                                Back to {moveSession.operation === 'move' ? 'Move' : 'Clone'}
                              </FontText>
                            </AppButton>
                          )
                        ) : (
                          <>
                            <AppButton
                              variant="outline"
                              className="h-8 px-3"
                              onPress={cancelMoveSession}
                              dropShadow={false}>
                              <FontText className="text-sm">Cancel</FontText>
                            </AppButton>
                            <Row className="gap-0.5">
                              <View
                                onPointerEnter={() => setPlaceHovered(true)}
                                onPointerLeave={() => setPlaceHovered(false)}>
                                <Pressable
                                  onPress={handleEnterPlacePhase}
                                  className={`bg-text h-12 items-center justify-center overflow-hidden px-3 hover:brightness-150 active:brightness-50 ${placeDisabledReason ? 'opacity-50' : ''}`}
                                  style={
                                    canPlaceInOtherFile
                                      ? {
                                          borderTopLeftRadius: 10,
                                          borderBottomLeftRadius: 10,
                                        }
                                      : { borderRadius: 10 }
                                  }>
                                  <FontText className="text-sm" color="white">
                                    Place
                                  </FontText>
                                </Pressable>
                              </View>
                              {canPlaceInOtherFile && (
                                <View
                                  onPointerEnter={() => setPlaceFileHovered(true)}
                                  onPointerLeave={() => setPlaceFileHovered(false)}>
                                  <Pressable
                                    testID="place-in-other-file"
                                    accessibilityLabel="Place in another file"
                                    onPress={handlePlaceInOtherFile}
                                    className={`bg-text h-12 items-center justify-center overflow-hidden px-2.5 hover:brightness-150 active:brightness-50 ${placeDisabledReason ? 'opacity-50' : ''}`}
                                    style={{
                                      borderTopRightRadius: 10,
                                      borderBottomRightRadius: 10,
                                    }}>
                                    <FolderInput size={16} color="rgb(255, 255, 255)" />
                                  </Pressable>
                                </View>
                              )}
                            </Row>
                          </>
                        )
                      ) : (
                        <>
                          <View
                            onPointerEnter={() => setMoveHovered(true)}
                            onPointerLeave={() => setMoveHovered(false)}>
                            <AppButton
                              variant="outline"
                              className="h-8 px-3"
                              onPress={() => startMoveSession('move')}
                              dropShadow={false}>
                              {isTinyScreen ? (
                                <Move size={16} color="#1a1a1a" />
                              ) : (
                                <FontText className="text-sm">Move</FontText>
                              )}
                            </AppButton>
                          </View>
                          <View
                            onPointerEnter={() => setCloneHovered(true)}
                            onPointerLeave={() => setCloneHovered(false)}>
                            <AppButton
                              variant="outline"
                              className="h-8 px-3"
                              onPress={() => startMoveSession('clone')}
                              dropShadow={false}>
                              {isTinyScreen ? (
                                <Copy size={16} color="#1a1a1a" />
                              ) : (
                                <FontText className="text-sm">Clone</FontText>
                              )}
                            </AppButton>
                          </View>
                        </>
                      ))}
                  </Row>
                  {!hideDialogActions && (
                    <Row className="minimize-hide gap-4">
                      {!readOnly && (
                        <AppButton
                          variant="outline"
                          className="h-8 px-3 sm:h-12 sm:w-28"
                          onPress={handleAttemptClose}>
                          <FontText weight="medium">Cancel</FontText>
                        </AppButton>
                      )}
                      {readOnly ? (
                        <AppButton
                          variant="filled"
                          className="h-8 px-3 sm:h-12 sm:w-36"
                          onPress={() => onOpenChange(false)}>
                          <FontText weight="medium" color="white">
                            Close
                          </FontText>
                        </AppButton>
                      ) : (
                        <AppButton
                          variant="filled"
                          className="h-8 px-3 sm:h-12 sm:w-36"
                          disabled={!doneEnabled}
                          onPress={handleSubmit}>
                          <FontText weight="medium" color="white">
                            Done
                          </FontText>
                        </AppButton>
                      )}
                    </Row>
                  )}
                </Row>
              </Column>

              <InsertModal
                isOpen={insertTarget !== null}
                target={insertTarget}
                definedVariables={definedVariables}
                definedFunctions={definedFunctions}
                entryKeysBySource={entryKeysBySource}
                onInsertStatement={handleInsertStatement}
                onInsertExpression={handleInsertExpression}
                onInsertChainLink={handleInsertChainLink}
                onInsertBuiltinFunction={handleInsertBuiltinFunction}
                onRemove={handleRemove}
                hideInputs={hideInputsEffective}
                allowVoteInput={allowVoteInput}
                isTriggerContext={effectiveTrigger}
                flatTrigger={flatTrigger}
                cellColumnKind={insertColumnRules?.kind}
                cellValueType={insertColumnRules?.valueType}
                gameId={gameId}
                savedFunctions={savedFunctions}
                onUnsaveFunction={unsaveFunction}
                onInsertFile={
                  fileContext && (!fileContext.scriptIsland || insertTarget?.kind === 'expression')
                    ? insertFileAtTarget
                    : undefined
                }
                fileInsertIncludesBlocks={!!fileContext?.requestCompositionPick}
                onClose={() => setInsertTarget(null)}
              />
            </View>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {fileContext && (
        <FolderSettingsDialog
          isOpen={folderSettingsPath !== null}
          onOpenChange={(open) => {
            if (!open) setFolderSettingsPath(null);
          }}
          statement={
            folderSettingsPath
              ? (getStatementAtPath(state.ast.statements, folderSettingsPath) ?? null)
              : null
          }
          filesApi={{ index: fileContext.index }}
          onSave={(statement) => {
            if (!folderSettingsPath) return;
            handleInsertStatement(statement, folderSettingsPath, true);
            setFolderSettingsPath(null);
          }}
        />
      )}

      {directMarkdown && !switchingFileEditor && directMarkdownBody !== null && (
        <MarkdownEditorDialog
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          onMinimize={onMinimize}
          onRestore={onRestore}
          title={title ?? 'Edit Markdown'}
          initialMarkdown={directMarkdownBody}
          draftIdentity={fileContext?.fileId ?? fileContext?.filePath}
          draftReplacement={markdownDraftReplacement}
          initialSelection={markdownSelection.current}
          onSelectionChange={onMarkdownSelection}
          fileInputNames={draftInputs.map((input) => input.name)}
          onCreateFileInput={(onCreated) => {
            pendingInputInsertion.current = onCreated;
            setInputPickerOpen(true);
          }}
          initialModified={hasModifications}
          readOnly={readOnly}
          gameId={gameId}
          showScript
          showVariables
          hideInputs={hideInputsEffective}
          allowVoteInput={allowVoteInput}
          onOpenFileHistory={() => setIsHistoryOpen(true)}
          onDraftChange={onDirectMarkdownDraft}
          transformPreviewMarkdown={
            fileIndex
              ? (markdown) =>
                  flattenStatementsToMarkdown(
                    withMarkdownFileBody(state.ast, markdown).statements,
                    fileIndex
                  ).markdown
              : undefined
          }
          onSubmit={({ markdown }) => {
            const text = printScript(withMarkdownFileBody(state.ast, markdown));
            if (onSaveToServer) persistSource(text);
            else onSubmit(text);
            setHasModifications(false);
          }}
          onDone={() => onDone?.(serializeDraft())}
          onRequestFileInsert={
            fileContext
              ? (onInsert) => requestFilePick((file) => onInsert(encodeFileMarker(file)))
              : undefined
          }
          headerContent={
            fileContext && (
              <Column className="gap-2">
                <FilePathControls
                  context={fileContext}
                  readOnly={readOnly}
                  onOptions={() => {
                    if (!readOnly && onSaveToServer) persistSource(serializeDraft());
                    openFileOptions();
                  }}
                  onBrowse={() => requestFilePick((file) => fileContext.onSwitchFile?.(file))}
                  onOptionsHover={setPathChipHovered}
                  onBrowseHover={setFilePickHovered}
                />
                <Row className="flex-wrap items-center gap-2 py-1">
                  <FontText variant="subtext" className="text-xs">
                    Inputs:
                  </FontText>
                  {fileInputEntries.map(({ decl, path }) => (
                    <Pressable
                      key={path[0]}
                      onPress={readOnly ? undefined : () => setEditingInput({ decl, path })}
                      className="border-subtle-border rounded-md border px-2 py-1">
                      <FontText className="text-xs">{decl.name}</FontText>
                    </Pressable>
                  ))}
                  {markdownOnlyInputs.map((input) => (
                    <FontText key={input.name} className="text-xs">
                      {input.name}
                    </FontText>
                  ))}
                  {!readOnly && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Add input"
                      onPress={() => setInputPickerOpen(true)}
                      onHoverIn={() => setAddInputHovered(true)}
                      onHoverOut={() => setAddInputHovered(false)}
                      className="border-subtle-border hover:bg-text/5 h-8 w-8 items-center justify-center rounded-md border">
                      <Plus size={14} color="rgb(46, 41, 37)" />
                    </Pressable>
                  )}
                  <View className="min-w-2 flex-1" />
                  {fileEditorModeSwitch}
                </Row>
              </Column>
            )
          }
        />
      )}

      {markdownEditor && (
        <MarkdownEditorDialog
          isOpen={markdownEditor.isOpen}
          onOpenChange={(open) => {
            if (!open) setMarkdownEditor(null);
          }}
          title="Edit Markdown"
          initialMarkdown={markdownEditor.value}
          showScript
          // Variable markers bind to file inputs, which only exist while
          // editing a real file — cell/script-island contexts hide this.
          showVariables={Boolean(fileContext?.fileId)}
          fileInputNames={fileContext?.fileId ? draftInputs.map((input) => input.name) : undefined}
          onCreateFileInput={
            fileContext?.fileId
              ? (onCreated) => {
                  pendingInputInsertion.current = onCreated;
                  setInputPickerOpen(true);
                }
              : undefined
          }
          hideInputs={hideInputsEffective}
          allowVoteInput={allowVoteInput}
          gameId={gameId}
          onSubmit={(payload) => {
            markdownEditor.onSave(payload.markdown);
            setMarkdownEditor(null);
          }}
          onRequestFileInsert={
            fileContext
              ? (onInsert) => requestFilePick((file) => onInsert(encodeFileMarker(file)))
              : undefined
          }
        />
      )}

      {/* File-input modals: same picker/input flow as function params */}
      <TemplatePickerModal
        isOpen={inputPickerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setInputPickerOpen(false);
            pendingInputInsertion.current = null;
          }
        }}
        title="Add an input"
        hideText
        onSelectNewText={() => setInputPickerOpen(false)}
        onSelectNewInput={(type) => {
          setInputPieceType(type);
          setInputPickerOpen(false);
          setNewInputOpen(true);
        }}
        onClose={() => {
          setInputPickerOpen(false);
          pendingInputInsertion.current = null;
        }}
      />
      <TemplateInputModal
        isOpen={newInputOpen}
        onOpenChange={(open) => {
          if (!open) {
            setNewInputOpen(false);
            pendingInputInsertion.current = null;
          }
        }}
        pieceType={inputPieceType}
        onDone={commitNewInput}
        contextVariables={definedVariables}
        definedFunctions={definedFunctions}
        entryKeysBySource={entryKeysBySource}
        onEditMarkdown={(value, onSave) => setMarkdownEditor({ isOpen: true, value, onSave })}
      />
      <TemplateInputModal
        isOpen={editingInput !== null}
        onOpenChange={(open) => {
          if (!open) setEditingInput(null);
        }}
        pieceType="input-blank"
        initial={editingInputInitial}
        onDone={commitEditInput}
        onRemove={removeEditingInput}
        contextVariables={definedVariables}
        definedFunctions={definedFunctions}
        entryKeysBySource={entryKeysBySource}
        onEditMarkdown={(value, onSave) => setMarkdownEditor({ isOpen: true, value, onSave })}
      />

      {/* File options: the file-name chip's dialog. Rename is the primary
          edit up top; the other per-file actions sit in a row beneath it,
          and Save/Cancel commit or drop the name change. */}
      <ConvexDialog.Root
        isOpen={fileOptionsOpen}
        onOpenChange={(open: boolean) => {
          if (!open) handleFileOptionsAttemptClose();
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-lg p-1" isSwipeable={false}>
            <CloseButton onPress={handleFileOptionsAttemptClose} />
            <DialogHeader text="File options" />
            <Column className="gap-4 px-5 pb-5">
              <Column className="gap-1">
                <FontText weight="medium">Name</FontText>
                <FontTextInput
                  autoFocus
                  selectTextOnFocus
                  className="border-subtle-border w-full rounded-xl border px-4 py-3"
                  placeholder="File name"
                  value={renameDraft}
                  onChangeText={(t: string) => {
                    setRenameDraft(t);
                    setRenameError(null);
                  }}
                  onSubmitEditing={submitRenameFile}
                />
                {fileContext?.filePath && folderOfPath(fileContext.filePath) && (
                  <FontText variant="subtext" className="text-xs">
                    in {folderOfPath(fileContext.filePath)}/
                  </FontText>
                )}
                {renameError && (
                  <FontText className="text-xs" style={{ color: '#a03030' }}>
                    {renameError}
                  </FontText>
                )}
              </Column>
              {(fileContext?.onMoveFile ||
                fileContext?.onCloneFile ||
                fileContext?.onDeleteFile) && (
                <ShadowScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1 }}>
                  <Row className="grow gap-2">
                    {fileContext?.onMoveFile && (
                      <Pressable
                        onPress={() => {
                          setFileOptionsOpen(false);
                          setMovePickerOpen(true);
                        }}
                        className="border-subtle-border bg-inner-background hover:bg-text/5 min-w-36 flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-3 py-2.5">
                        <FolderInput size={18} color="rgb(46, 41, 37)" style={{ flexShrink: 0 }} />
                        <FontText weight="medium" numberOfLines={1}>
                          Move…
                        </FontText>
                      </Pressable>
                    )}
                    {fileContext?.onCloneFile && (
                      <Pressable
                        onPress={() => {
                          setFileOptionsOpen(false);
                          fileContext.onCloneFile?.();
                        }}
                        className="border-subtle-border bg-inner-background hover:bg-text/5 min-w-36 flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-3 py-2.5">
                        <Copy size={18} color="rgb(46, 41, 37)" style={{ flexShrink: 0 }} />
                        <FontText weight="medium" numberOfLines={1}>
                          Duplicate
                        </FontText>
                      </Pressable>
                    )}
                    {fileContext?.onDeleteFile && (
                      <Pressable
                        onPress={() => {
                          setFileOptionsOpen(false);
                          setDeleteFileConfirm(true);
                        }}
                        className="border-subtle-border bg-inner-background hover:bg-text/5 min-w-36 flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-3 py-2.5">
                        <Trash2 size={18} color="#a03030" style={{ flexShrink: 0 }} />
                        <FontText weight="medium" numberOfLines={1} className="text-[#a03030]">
                          Delete…
                        </FontText>
                      </Pressable>
                    )}
                  </Row>
                </ShadowScrollView>
              )}
              <Row className="justify-end gap-4">
                <AppButton
                  variant="outline"
                  className="w-24"
                  onPress={handleFileOptionsAttemptClose}>
                  <FontText weight="medium">Cancel</FontText>
                </AppButton>
                <AppButton variant="filled" className="w-24" onPress={submitRenameFile}>
                  <FontText weight="medium" color="white">
                    Save
                  </FontText>
                </AppButton>
              </Row>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      <UnsavedChangesDialog
        isOpen={fileOptionsLeaveConfirm}
        onOpenChange={setFileOptionsLeaveConfirm}
        onSave={submitRenameFile}
        onDiscard={() => setFileOptionsOpen(false)}
      />

      {/* Move destination: navigable folder browser with "Move Here". */}
      {fileContext?.onMoveFile && fileContext.index && (
        <MoveToDialog
          isOpen={movePickerOpen}
          onOpenChange={(open) => {
            if (!open) setMovePickerOpen(false);
          }}
          index={fileContext.index}
          itemLabel={filePathName(fileContext.filePath ?? '') || 'file'}
          itemFolder={folderOfPath(fileContext.filePath ?? '')}
          onCreateFolder={fileContext.onCreateFolder}
          onMoveHere={(dest) => fileContext.onMoveFile?.(dest)}
        />
      )}

      <ConfirmDialog
        isOpen={deleteFileConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteFileConfirm(false);
        }}
        onConfirm={() => {
          setDeleteFileConfirm(false);
          fileContext?.onDeleteFile?.();
        }}
        title="Delete file?"
        message={`"${filePathName(fileContext?.filePath ?? '')}" will be deleted. Cells and files that call it will flag it as missing.`}
        confirmLabel="Delete"
      />

      {/* A markdown file that outgrew the single-block shape can't save
          until the user converts it to a script file. */}
      <ConfirmDialog
        isOpen={convertToScriptPrompt !== null}
        onOpenChange={(open) => {
          if (!open) setConvertToScriptPrompt(null);
        }}
        onConfirm={() => {
          fileContext?.onConvertToScript?.();
          if (convertToScriptPrompt === 'submit') submitDraft();
          else saveDraft();
        }}
        title="Convert to script?"
        message="This file now has logic beyond a single markdown block, so it can't stay a markdown file."
        confirmLabel="Convert"
      />

      {fileContext && previewFlatten && (
        <FilePreviewDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          markdown={previewFlatten.markdown}
          issues={previewFlatten.issues}
          sources={sources}
          title={
            fileContext.filePath ? `Preview · ${filePathName(fileContext.filePath)}` : 'Preview'
          }
        />
      )}

      <UnsavedChangesDialog
        isOpen={isLeaveConfirmDialogOpen}
        onOpenChange={setIsLeaveConfirmDialogOpen}
        onSave={handleSubmit}
        onDiscard={handleConfirmLeave}
      />

      <ConfirmDialog
        isOpen={expressionSwapTarget !== null}
        onOpenChange={(open) => {
          if (!open) setExpressionSwapTarget(null);
        }}
        onConfirm={handleConfirmExpressionSwap}
        title="Swap expressions?"
        message={
          expressionSwapTarget && shelfExpression
            ? `Swapping ${printExpression(expressionSwapTarget.expression)} with ${printExpression(shelfExpression)}`
            : ''
        }
        confirmLabel="Swap"
      />

      {/* Decouple / remove saved function dialog */}
      <ConvexDialog.Root
        isOpen={decoupleDialog !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDecoupleDialog(null);
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-lg">
            <CloseButton onPress={() => setDecoupleDialog(null)} />
            <Column className="gap-3">
              <FontText weight="medium" className="text-base">
                {decoupleDialog?.isBuiltin ? 'Edit Built-in Function' : 'Edit Saved Function'}
              </FontText>
              <FontText variant="subtext" className="text-sm leading-5">
                {decoupleDialog?.isBuiltin
                  ? 'This function stays in your script but is no longer treated as a built-in. You can edit it freely.'
                  : 'The function stays in all existing code; it just won\u2019t be in your library anymore.'}
              </FontText>
              <Column className="gap-2">
                {decoupleDialog?.isBuiltin ? (
                  <Pressable
                    onPress={() => handleDecouple('decouple')}
                    className="border-subtle-border items-center rounded-lg border py-2.5">
                    <FontText weight="medium">De-couple</FontText>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleDecouple('remove')}
                      className="border-subtle-border items-center rounded-lg border py-2.5">
                      <FontText weight="medium">Remove from library</FontText>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDecouple('decouple')}
                      className="border-subtle-border items-center rounded-lg border py-2.5">
                      <FontText weight="medium">Keep and de-couple</FontText>
                    </Pressable>
                  </>
                )}
                <Pressable
                  onPress={() => setDecoupleDialog(null)}
                  className="border-subtle-border items-center rounded-lg border py-2.5">
                  <FontText weight="medium">Cancel</FontText>
                </Pressable>
              </Column>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {/* Name collision dialog */}
      <ConvexDialog.Root
        isOpen={nameCollision !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setNameCollision(null);
        }}>
        <ConvexDialog.Portal>
          <ConvexDialog.Overlay />
          <ConvexDialog.Content className="max-w-md">
            <CloseButton onPress={() => setNameCollision(null)} />
            <Column className="gap-3">
              <FontText weight="medium" className="text-base">
                Name already in use
              </FontText>
              <FontText variant="subtext" className="text-sm leading-5">
                {nameCollision && BUILTIN_FUNCTION_NAMES.has(nameCollision)
                  ? `\u201C${nameCollision}\u201D is a built-in function. Choose a different name.`
                  : `A saved function called \u201C${nameCollision}\u201D already exists. Choose a different name.`}
              </FontText>
              <Pressable
                onPress={() => setNameCollision(null)}
                onHoverIn={() => setHint(['enter'])}
                onHoverOut={() => setHint(null)}
                className="border-subtle-border items-center rounded-lg border py-2.5">
                <FontText weight="medium">OK</FontText>
              </Pressable>
            </Column>
          </ConvexDialog.Content>
        </ConvexDialog.Portal>
      </ConvexDialog.Root>

      {onSaveToServer && effectiveHistory && (
        <>
          <SaveHistoryDialog
            isOpen={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            history={effectiveHistory}
            maxSaves={historyMaxSaves}
            onSelectEntry={(entry) => setPreviewEntry(entry)}
            onClearHistory={onClearHistory ?? fileHistory.clearHistory}
          />
          <ViewOnlyPreviewModal
            isOpen={previewEntry !== null}
            onOpenChange={(open) => {
              if (!open) setPreviewEntry(null);
            }}
            title="Preview Saved Version"
            subtext={previewEntry ? new Date(previewEntry.savedAt).toLocaleString() : undefined}
            entry={previewEntry}
            onReplace={() => {
              if (previewEntry) {
                const saved = previewEntry.value as { scriptText?: string; markdown?: string };
                const ast =
                  saved.scriptText !== undefined
                    ? parseScriptBlock(saved.scriptText)
                    : saved.markdown !== undefined
                      ? withMarkdownFileBody(state.ast, saved.markdown)
                      : null;
                if (ast && ast.diagnostics.length === 0) {
                  dispatchWithUndo({ type: 'REPLACE_AST', ast }, 'Restore file version');
                  setTextDraft(printScript(ast));
                  const body = markdownFileBody(ast);
                  directMarkdownDraft.current = body ?? '';
                  if (directMarkdown && body !== null)
                    setMarkdownDraftReplacement({ body, revision: Date.now() });
                  if (directMarkdown && body === null) switchFileEditor(false);
                } else {
                  showToast('This saved version cannot be restored. Its source is invalid.');
                }
              }
              setPreviewEntry(null);
              setIsHistoryOpen(false);
            }}
            contentClassName="h-[85vh] max-w-5xl">
            {previewEntry && (
              <StaticPreviewContent>
                {renderPreviewContent ? (
                  renderPreviewContent(previewEntry)
                ) : previewMarkdown !== null ? (
                  <InputOptionsProvider gameId={gameId} showInputs={!hideInputs}>
                    <ShadowScrollView
                      className="flex-1"
                      scrollViewClassName="flex-1 rounded-xl p-3">
                      <MarkdownRenderer markdown={previewMarkdown} isInDialog />
                    </ShadowScrollView>
                  </InputOptionsProvider>
                ) : previewAst ? (
                  <ShadowScrollView className="flex-1" scrollViewClassName="flex-1 rounded-xl p-3">
                    <Canvas
                      statements={previewAst.statements}
                      columnTitles={sources?.userTableTitle}
                      definedVariables={previewVariables}
                      definedFunctions={previewFunctions}
                      onAdd={() => showToast('Preview only')}
                      onSetExpression={() => showToast('Preview only')}
                      onSetStatementField={() => showToast('Preview only')}
                      onDeleteStatement={() => showToast('Preview only')}
                      onRenameVariable={() => showToast('Preview only')}
                      entryKeysBySource={previewEntryKeys}
                      inputSources={previewInputSources}
                      isTriggerContext={effectiveTrigger}
                      gameId={gameId}
                      savedFunctionNames={savedFunctionNames}
                      onSaveFunction={() => showToast('Preview only')}
                      onUnsaveFunction={() => showToast('Preview only')}
                      onLockedFunctionClick={() => showToast('Preview only')}
                      decoupledFunctionNames={decoupledFunctions}
                      onSetComment={() => showToast('Preview only')}
                      onEditMarkdown={() => showToast('Preview only')}
                      fileBlocks={previewFileBlocks}
                      invalidExpressions={previewInvalidExpressions}
                      invalidStatements={previewInvalidStatements}
                      flagMessages={previewFlagMessages}
                    />
                  </ShadowScrollView>
                ) : (
                  <ShadowScrollView className="flex-1">
                    <FontText className="p-4 font-mono text-sm">
                      {previewEntry.value?.scriptText ?? previewEntry.value?.markdown ?? ''}
                    </FontText>
                  </ShadowScrollView>
                )}
              </StaticPreviewContent>
            )}
          </ViewOnlyPreviewModal>
        </>
      )}
    </ScriptFilesIndexContext.Provider>
  );
};

export default ScriptEditorDialog;
