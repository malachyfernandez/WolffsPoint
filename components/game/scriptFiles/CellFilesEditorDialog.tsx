import React, { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { Code2, FileText, FolderSearch } from 'lucide-react-native';
import Column from '../../layout/Column';
import FontText from '../../ui/text/FontText';
import ScriptEditorDialog, {
  type PendingMovePayload,
  type ScriptFileContext,
} from '../../../script/editor/ScriptEditorDialog';
import MarkdownEditorDialog, { type MarkdownEditorDialogProps } from '../MarkdownEditorDialog';
import CompositionInsertDialog from './CompositionInsertDialog';
import FileBrowserDialog from './FileBrowserDialog';
import FileEditorDialog from './FileEditorDialog';
import { useFileEditorHost } from './FileEditorHostContext';
import { useMarkdownRendererInputData } from '../../ui/markdown/MarkdownRenderer';
import { InputOptionsProvider } from '../markdownEditor/InputOptionsProvider';
import { printScript, printStatement } from '../../../script/lang/printer';
import { emptySpan, type Statement } from '../../../script/lang/ast';
import {
  fileInputDefaults,
  createMarkdownFileSource,
  makeFileStatement,
  parseDisplayComposition,
  parseFileCell,
  type ScriptFile,
  type ScriptFileKind,
  type ScriptFileRole,
} from '../../../utils/scriptFiles';
import { useCellModuleStatus } from '../../../utils/legacySystems';
import type { useScriptFiles } from '../../../hooks/useScriptFiles';
import {
  displayCellEditorText,
  fileCellEditorText,
  parseCellPieces,
  reconcileDisplayCell,
  reconcileFileCell,
} from '../../../utils/cellPieces';
import { makeFolderStatement } from '../../../utils/scriptFolders';

type FilesApi = ReturnType<typeof useScriptFiles>;

interface PickRequest {
  onPick: (file: ScriptFile) => void;
  onCancel?: () => void;
  /** Restrict the browser's files to these kinds (move placement → script
   *  files only). */
  fileKinds?: ScriptFileKind[];
}

interface CompositionPickRequest {
  onPick: (result: { file?: ScriptFile; folderPath?: string; statement?: Statement }) => void;
  onCancel?: () => void;
}

interface FolderPickRequest {
  onPick: (path: string) => void;
  onCancel?: () => void;
}

export interface CellFilesEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  dialogSubtext?: string;
  /** The cell's stored text: either a `File(...)` list or legacy markdown. */
  cellText: string;
  /** Writes the new cell text (file list or legacy markdown passthrough). */
  onSubmitText: (text: string) => void;
  filesApi: FilesApi;
  /** Pinned folder new files default to ('roleMessage' | 'voteMessage' | 'morningMessage'). */
  pinnedFolder: string;
  /** Base for auto-suggested file names (role or player name). */
  nameBase?: string;
  gameId?: string;
  hideInputs?: boolean;
  allowVoteInput?: boolean;
  readOnly?: boolean;
  forceFiles?: boolean;
  /** Cell identity for the file-list stage's save history, stored under a
   *  `cellFiles:` prefix so its `{scriptText}` entries never mix with the
   *  legacy markdown editor's entries. Defaults to
   *  `legacyEditorProps.historyKey` — most callers get history for free. */
  historyKey?: string;
  /** Forwarded to the legacy markdown editor when the user keeps old content. */
  legacyEditorProps?: Omit<
    MarkdownEditorDialogProps,
    'isOpen' | 'onOpenChange' | 'onSubmit' | 'initialMarkdown' | 'title'
  >;
}

type Stage = 'editor' | 'legacy';

/**
 * Editor for a file-based cell (role message / vote message / morning
 * message). The cell's text is a list of `File(PATH = "...")` statements;
 * this is a ScriptEditorDialog in `fileOnly` mode. Empty cells open the
 * file-list editor with the new-file options as its blank state; legacy
 * markdown content offers a replace-with-files flow.
 */
const CellFilesEditorDialogContent = ({
  isOpen,
  onOpenChange,
  title,
  dialogSubtext,
  cellText,
  onSubmitText,
  filesApi,
  pinnedFolder,
  nameBase,
  gameId,
  hideInputs,
  allowVoteInput,
  readOnly = false,
  forceFiles = false,
  historyKey,
  legacyEditorProps,
}: CellFilesEditorDialogProps) => {
  const { scriptSources } = useMarkdownRendererInputData();

  const { migrated, displayModules, loading: legacyLoading } = useCellModuleStatus(gameId);

  const [stage, setStage] = useState<Stage>('editor');
  /** Draft cell text: seeds the file-list editor and picks up appends. */
  const [draftText, setDraftText] = useState('');
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [compositionOpen, setCompositionOpen] = useState(false);
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);
  const [editFileId, setEditFileId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMovePayload | null>(null);
  /** File created from the chooser/browser; its block is added after edit. */
  const [appendAfterEdit, setAppendAfterEdit] = useState<ScriptFile | null>(null);
  const pickRef = useRef<PickRequest | null>(null);
  const compositionPickRef = useRef<CompositionPickRequest | null>(null);
  const folderPickRef = useRef<FolderPickRequest | null>(null);
  const modular = forceFiles || migrated || parseCellPieces(cellText).pieces.length > 0;
  const editorText = modular
    ? displayModules
      ? displayCellEditorText(cellText, filesApi.index)
      : fileCellEditorText(cellText, filesApi.index)
    : cellText;
  const saveCellText = (text: string) =>
    onSubmitText(
      modular
        ? displayModules
          ? reconcileDisplayCell(cellText, text, filesApi.index)
          : reconcileFileCell(cellText, text, filesApi.index)
        : text
    );

  useEffect(() => {
    if (!isOpen || legacyLoading) return;
    const parsed = displayModules ? parseDisplayComposition(editorText) : parseFileCell(editorText);
    const isFileCell = parsed !== null && parsed.length > 0;
    // Old data remains readable until the single whole-game upgrade.
    // Empty cells always start in the new file editor.
    const nextStage = modular || isFileCell || parsed !== null ? 'editor' : 'legacy';
    setStage(nextStage);
    setDraftText(editorText);
    setLegacyOpen(nextStage === 'legacy');
    setBrowserOpen(false);
    setCompositionOpen(false);
    setFolderBrowserOpen(false);
    setEditFileId(null);
    setAppendAfterEdit(null);
    pickRef.current = null;
    compositionPickRef.current = null;
    folderPickRef.current = null;
  }, [isOpen, cellText, editorText, modular, displayModules, legacyLoading]);

  const requestFilePick = (
    onPick: (f: ScriptFile) => void,
    onCancel?: () => void,
    _role?: ScriptFileRole,
    _onPickFolder?: (path: string) => void,
    fileKinds?: ScriptFileKind[]
  ) => {
    pickRef.current = { onPick, onCancel, fileKinds };
    setBrowserOpen(true);
  };

  const requestCompositionPick = (
    onPick: CompositionPickRequest['onPick'],
    onCancel?: () => void
  ) => {
    compositionPickRef.current = { onPick, onCancel };
    setCompositionOpen(true);
  };

  const requestFolderPick = (onPick: (path: string) => void, onCancel?: () => void) => {
    folderPickRef.current = { onPick, onCancel };
    setFolderBrowserOpen(true);
  };

  /** Append `File({PATH})` to the cell draft and move to the file-list editor. */
  const appendFileBlock = (file: ScriptFile) => {
    setDraftText((prev) => {
      const stmts = parseFileCell(prev) ?? [];
      return printScript({
        kind: 'Script',
        statements: [...stmts, makeFileStatement(file, fileInputDefaults(file))],
        diagnostics: [],
        span: emptySpan(),
      });
    });
    setStage('editor');
  };

  /** Empty-state picks bypass the editor's internal '+' target, so append the
   *  chosen statement to the draft and let the editor reinitialize. */
  const appendCompositionResult = (result: {
    file?: ScriptFile;
    folderPath?: string;
    statement?: Statement;
  }) => {
    if (result.file) {
      appendFileBlock(result.file);
      return;
    }
    const statement = result.statement
      ? result.statement
      : result.folderPath
        ? makeFolderStatement({
            path: result.folderPath,
            id: filesApi.index.folderIdentities.byPath.get(result.folderPath.toLowerCase()),
          })
        : undefined;
    if (!statement) return;
    setDraftText((prev) => {
      const statements = parseDisplayComposition(prev) ?? [];
      return printScript({
        kind: 'Script',
        statements: [...statements, statement],
        diagnostics: [],
        span: emptySpan(),
      });
    });
    setStage('editor');
  };

  const host = useFileEditorHost();

  /** Open a file for editing: the game-level hosted editor when available
   *  (top-level + minimizable), else the local stacked dialog. `appendOnSave`
   *  marks files created to be appended/picked once their first save lands. */
  const openFileForEdit = (f: ScriptFile, appendOnSave: boolean) => {
    if (!host) {
      if (appendOnSave) setAppendAfterEdit(f);
      setEditFileId(f.id);
      return;
    }
    host.openFile(f.id, {
      initialModified: appendOnSave,
      hideInputs,
      allowVoteInput,
      readOnly,
      defaultFolder: pinnedFolder,
      nameBase,
      onSubmitted: appendOnSave
        ? (nf) => {
            if (nf.id !== f.id) return;
            if (pickRef.current) {
              const req = pickRef.current;
              pickRef.current = null;
              setBrowserOpen(false);
              req.onPick(nf);
            } else if (compositionPickRef.current) {
              const req = compositionPickRef.current;
              compositionPickRef.current = null;
              setCompositionOpen(false);
              req.onPick({ file: nf });
            } else {
              appendFileBlock(nf);
            }
          }
        : undefined,
    });
  };

  /** Create a fresh file, open its editor; the block is added once it saves. */
  const createAndEdit = (kind: 'markdown' | 'script') => {
    const file = filesApi.createFile(
      pinnedFolder,
      filesApi.suggestName(nameBase ?? 'New file', pinnedFolder),
      kind
    );
    if (!file) return;
    openFileForEdit(file, true);
  };

  const fileContext: ScriptFileContext = {
    index: filesApi.index,
    fileOnly: true,
    requestFilePick,
    requestCompositionPick: displayModules ? requestCompositionPick : undefined,
    requestFolderPick: displayModules ? requestFolderPick : undefined,
    onOpenFile: (f) => openFileForEdit(f, false),
    // "Place in another file" from a move/clone shelf: open the destination
    // file's editor with the shelved selections armed for placement.
    onMoveToFile: (f, payload) => {
      if (host) {
        host.openFile(f.id, { pendingMove: payload, readOnly });
        return;
      }
      setPendingMove(payload);
      setEditFileId(f.id);
    },
    // Blank state for an empty file list, the same three options the old
    // separate chooser stage had, rendered centered inside the editor.
    emptyState: readOnly ? undefined : (
      <Column className="w-full max-w-xs gap-2">
        <ChooserButton
          icon={<FileText size={18} color="#4a6a8a" />}
          label="New Text"
          subtext="A markdown file"
          onPress={() => createAndEdit('markdown')}
        />
        <ChooserButton
          icon={<Code2 size={18} color="#6a4a8a" />}
          label="New Script"
          subtext="A script file"
          onPress={() => createAndEdit('script')}
        />
        <ChooserButton
          icon={<FolderSearch size={18} color="#8a7355" />}
          label={displayModules ? 'Files / Blocks' : 'Open File Browser'}
          subtext={displayModules ? 'Pick a file or display block' : 'Pick an existing file'}
          onPress={() =>
            displayModules
              ? requestCompositionPick(appendCompositionResult)
              : requestFilePick(appendFileBlock)
          }
        />
      </Column>
    ),
  };

  const handleEditorSubmit = (text: string) => {
    saveCellText(text);
    onOpenChange(false);
  };

  return (
    <>
      {/* Stage: the file-list editor (restricted script editor, File blocks only) */}
      {isOpen && stage === 'editor' && (
        <ScriptEditorDialog
          isOpen
          onOpenChange={onOpenChange}
          title={title}
          initialScriptText={draftText}
          onSubmit={handleEditorSubmit}
          onSaveToServer={readOnly ? undefined : saveCellText}
          sources={scriptSources}
          gameId={gameId}
          hideInputs={hideInputs}
          allowVoteInput={allowVoteInput}
          readOnly={readOnly}
          historyKey={
            (historyKey ?? legacyEditorProps?.historyKey)
              ? `cellFiles:${historyKey ?? legacyEditorProps?.historyKey}`
              : undefined
          }
          fileContext={fileContext}
          // A just-picked/created file lands in draftText before the user
          // edits: the editor must treat that as a change or Done stays
          // disabled and the pick can never commit to the cell.
          initialModified={draftText.trim() !== editorText.trim()}
        />
      )}

      {/* Legacy markdown editor (unchanged old flow) */}
      {legacyOpen && (
        <MarkdownEditorDialog
          isOpen
          onOpenChange={(open) => {
            if (open) return;
            setLegacyOpen(false);
            onOpenChange(false);
          }}
          title={title}
          dialogSubtext={dialogSubtext}
          initialMarkdown={cellText}
          onSubmit={({ markdown }) => {
            if (migrated && markdown.trim()) {
              // Compatibility for old history/imports: never write new raw markdown
              // back into an upgraded file cell.
              const file = filesApi.createFile(
                pinnedFolder,
                filesApi.suggestName(nameBase ?? 'Recovered message', pinnedFolder),
                'markdown'
              );
              if (!file) return;
              filesApi.updateFileSource(file.id, createMarkdownFileSource(markdown));
              onSubmitText(printStatement(makeFileStatement(file)));
            } else onSubmitText(markdown);
            setLegacyOpen(false);
            onOpenChange(false);
          }}
          gameId={gameId}
          showScript
          hideInputs={hideInputs}
          allowVoteInput={allowVoteInput}
          readOnly={readOnly}
          {...legacyEditorProps}
        />
      )}

      {/* File-or-block chooser: modular cells can insert display composition. */}
      {compositionOpen && (
        <CompositionInsertDialog
          isOpen
          onOpenChange={(open) => {
            if (open) return;
            compositionPickRef.current?.onCancel?.();
            compositionPickRef.current = null;
            setCompositionOpen(false);
          }}
          filesApi={filesApi}
          defaultFolder={pinnedFolder}
          nameBase={nameBase}
          onInsertFile={(file) => {
            const req = compositionPickRef.current;
            compositionPickRef.current = null;
            setCompositionOpen(false);
            req?.onPick({ file });
          }}
          onInsertFolder={(folderPath) => {
            const req = compositionPickRef.current;
            compositionPickRef.current = null;
            setCompositionOpen(false);
            req?.onPick({ folderPath });
          }}
          onInsertStatement={(statement) => {
            const req = compositionPickRef.current;
            compositionPickRef.current = null;
            setCompositionOpen(false);
            req?.onPick({ statement });
          }}
          onOpenFile={(file) => openFileForEdit(file, true)}
        />
      )}

      {/* Folder picker: Folder(...) blocks keep a stable folder reference. */}
      {folderBrowserOpen && (
        <FileBrowserDialog
          isOpen
          onOpenChange={(open) => {
            if (open) return;
            folderPickRef.current?.onCancel?.();
            folderPickRef.current = null;
            setFolderBrowserOpen(false);
          }}
          filesApi={filesApi}
          defaultFolder={pinnedFolder}
          nameBase={nameBase}
          mode="pick"
          onPickFolder={(path) => {
            const req = folderPickRef.current;
            folderPickRef.current = null;
            setFolderBrowserOpen(false);
            req?.onPick(path);
          }}
          onPick={(file) => {
            // Picking a file while re-targeting a folder block inserts that
            // file normally through the same request pipeline.
            const req = folderPickRef.current;
            folderPickRef.current = null;
            setFolderBrowserOpen(false);
            req?.onCancel?.();
          }}
        />
      )}

      {/* File picker: stacks over whichever editor asked for it */}
      {browserOpen && (
        <FileBrowserDialog
          isOpen
          onOpenChange={(open) => {
            if (open) return;
            pickRef.current?.onCancel?.();
            pickRef.current = null;
            setBrowserOpen(false);
          }}
          filesApi={filesApi}
          defaultFolder={pinnedFolder}
          nameBase={nameBase}
          mode="pick"
          fileKinds={pickRef.current?.fileKinds}
          onPick={(f) => {
            const req = pickRef.current;
            pickRef.current = null;
            setBrowserOpen(false);
            req?.onPick(f);
          }}
          onOpenFile={(f) => {
            // New file created inside the pick browser, edit it, then pick it.
            openFileForEdit(f, true);
          }}
        />
      )}

      {/* File editor: for new files and "open file" from a File card.
          Hosted games route through FileEditorHost instead (minimizable). */}
      {editFileId !== null && !host && (
        <FileEditorDialog
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setEditFileId(null);
              setAppendAfterEdit(null);
              setPendingMove(null);
            }
          }}
          fileId={editFileId}
          filesApi={filesApi}
          gameId={gameId}
          hideInputs={hideInputs}
          allowVoteInput={allowVoteInput}
          readOnly={readOnly}
          pendingMove={pendingMove ?? undefined}
          defaultFolder={pinnedFolder}
          nameBase={nameBase}
          initialModified={appendAfterEdit?.id === editFileId}
          onSubmitted={(f) => {
            if (appendAfterEdit?.id === f.id) {
              setAppendAfterEdit(null);
              setEditFileId(null);
              if (pickRef.current) {
                // Came from the pick browser, resolve the pick.
                const req = pickRef.current;
                pickRef.current = null;
                setBrowserOpen(false);
                req.onPick(f);
              } else if (compositionPickRef.current) {
                // Created inside the file-or-block chooser: pick it after save.
                const req = compositionPickRef.current;
                compositionPickRef.current = null;
                setCompositionOpen(false);
                req.onPick({ file: f });
              } else {
                appendFileBlock(f);
              }
            }
          }}
        />
      )}
    </>
  );
};

const ChooserButton = ({
  icon,
  label,
  subtext,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  subtext: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="border-subtle-border bg-inner-background hover:bg-text/5 flex-row items-center gap-3 rounded-xl border px-4 py-3">
    {icon}
    <Column className="flex-1 gap-0.5">
      <FontText weight="medium">{label}</FontText>
      <FontText variant="subtext" className="text-xs">
        {subtext}
      </FontText>
    </Column>
  </Pressable>
);

/**
 * The provider must wrap the component, `useMarkdownRendererInputData`
 * runs in the component body, so it has to resolve from an ancestor. It
 * supplies `scriptSources` (players/roles/day data) for the Preview and for
 * script evaluation inside the editors.
 */
const CellFilesEditorDialog = (props: CellFilesEditorDialogProps) => (
  <InputOptionsProvider gameId={props.gameId} showInputs={!props.hideInputs}>
    <CellFilesEditorDialogContent {...props} />
  </InputOptionsProvider>
);

export default CellFilesEditorDialog;
