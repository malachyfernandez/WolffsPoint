import React, { useEffect, useRef, useState } from 'react';
import ScriptEditorDialog, {
  type PendingMovePayload,
  type ScriptFileContext,
} from '../../../script/editor/ScriptEditorDialog';
import FileBrowserDialog from './FileBrowserDialog';
import { useMarkdownRendererInputData } from '../../ui/markdown/MarkdownRenderer';
import {
  createTagFileSource,
  fileName,
  getTagMeta,
  isTagFile,
  isTriggerFile,
  tagFileSourceWithMeta,
  tagFileTriggerSource,
  tagFileName,
  type ScriptFile,
  type ScriptFileKind,
  type ScriptFileRole,
  type TagMeta,
} from '../../../utils/scriptFiles';
import type { useScriptFiles } from '../../../hooks/useScriptFiles';
import { useFileEditorHost } from './FileEditorHostContext';

type FilesApi = ReturnType<typeof useScriptFiles>;

export interface FileEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** File being edited. Live-looked-up from the doc so renames update. */
  fileId: string | null;
  filesApi: FilesApi;
  gameId?: string;
  hideInputs?: boolean;
  allowVoteInput?: boolean;
  readOnly?: boolean;
  /** Folder + name base for files created from inside this editor. */
  defaultFolder?: string;
  nameBase?: string;
  /** Fires after the editor saves (Done). Used by callers that want to pick a
   *  file right after it was created/edited. */
  onSubmitted?: (file: ScriptFile) => void;
  /** Open counting as already-modified: Done stays enabled so a just-created
   *  file can be committed without forcing an edit first. */
  initialModified?: boolean;
  /** Hosted minimize (FileEditorHost): hides the portal while the entry
   *  stays mounted; the minimized card calls onRestore to reopen. */
  onMinimize?: () => void;
  onRestore?: () => void;
  /** The editor switched which file it edits (header pick): lets the host
   *  keep its dedupe/delete-prune identity accurate. */
  onCurrentFileChange?: (fileId: string | null) => void;
  /** Move/clone session handed off from another editor: opens in place
   *  phase with the selections shelved. */
  pendingMove?: PendingMovePayload;
}

interface PickRequest {
  onPick: (file: ScriptFile) => void;
  onCancel?: () => void;
  role?: ScriptFileRole;
  /** Set when the picker may also commit a folder (Folder() statements). */
  onPickFolder?: (path: string) => void;
  /** Restrict the browser's files to these kinds (move placement → script
   *  files only). */
  fileKinds?: ScriptFileKind[];
}

/**
 * Editor for a single script file: ScriptEditorDialog in file mode (path
 * chip, inputs strip, preview). Owns its own file browser for File-block
 * insertion and supports stacked nested editors when a file calls a file.
 */
const FileEditorDialog = ({
  isOpen,
  onOpenChange,
  fileId,
  filesApi,
  gameId,
  hideInputs,
  allowVoteInput,
  readOnly = false,
  defaultFolder,
  nameBase,
  onSubmitted,
  initialModified = false,
  onMinimize,
  onRestore,
  onCurrentFileChange,
  pendingMove,
}: FileEditorDialogProps) => {
  const { scriptSources } = useMarkdownRendererInputData();
  const host = useFileEditorHost();
  // Which file this editor is editing, seeded from the prop, changeable via
  // the header's "change file" action.
  const [currentFileId, setCurrentFileId] = useState<string | null>(fileId);
  // Stacked nested editor (a File card's "open file" action).
  const [childFileId, setChildFileId] = useState<string | null>(null);
  const pickRef = useRef<PickRequest | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [pickAfterEdit, setPickAfterEdit] = useState<ScriptFile | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentFileId(fileId);
      setChildFileId(null);
      pickRef.current = null;
      setBrowserOpen(false);
      setPickAfterEdit(null);
    } else {
      // Minimize only detaches the portal: a pending pick browser or nested
      // editor it spawned would float with no parent, so resolve as cancel.
      if (browserOpen) {
        pickRef.current?.onCancel?.();
        pickRef.current = null;
        setBrowserOpen(false);
      }
      if (childFileId !== null || pickAfterEdit !== null) {
        setChildFileId(null);
        setPickAfterEdit(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fileId]);

  // Hosted editors report file switches so the host's dedupe/delete-prune
  // entry tracks the file actually on screen (a restore then reopens the
  // switched-to file, not the one originally launched). The callback prop is
  // a fresh closure each host render, so gate on the value changing.
  const lastReportedFileId = useRef<string | null>(null);
  useEffect(() => {
    if (lastReportedFileId.current === currentFileId) return;
    lastReportedFileId.current = currentFileId;
    onCurrentFileChange?.(currentFileId);
  }, [currentFileId, onCurrentFileChange]);

  const file = currentFileId ? filesApi.doc.files[currentFileId] : undefined;
  const tagFile = !!file && isTagFile(file);
  const triggerFile = !!file && isTriggerFile(file);
  /** Live tag meta (name/color) - edited via the header row, not blocks. */
  const tagMeta: TagMeta | undefined = file
    ? (getTagMeta(file) ?? { name: fileName(file.path), color: 'Grey' })
    : undefined;

  /** The editor only sees the trigger body for tag files; the Tag({...})
   *  header is file meta re-attached on every save. */
  const wrapBody = (body: string): string => {
    if (!file || !tagFile) return body;
    const meta = getTagMeta(file) ?? { name: fileName(file.path), color: 'Grey' };
    return createTagFileSource(meta.name, meta.color, body);
  };
  const saveSource = (text: string) => {
    if (file) filesApi.updateFileSource(file.id, wrapBody(text));
  };

  const requestFilePick = (
    onPick: (f: ScriptFile) => void,
    onCancel?: () => void,
    role?: ScriptFileRole,
    onPickFolder?: (path: string) => void,
    fileKinds?: ScriptFileKind[]
  ) => {
    pickRef.current = { onPick, onCancel, role, onPickFolder, fileKinds };
    setBrowserOpen(true);
  };

  /** Folder-block retarget: folders commit; a file pick cancels (same rule
   *  as the cell file-list editor's folder picker). */
  const requestFolderPick = (onPick: (path: string) => void, onCancel?: () => void) => {
    pickRef.current = { onPick: () => onCancel?.(), onCancel, onPickFolder: onPick };
    setBrowserOpen(true);
  };

  const fileContext: ScriptFileContext | undefined = file
    ? {
        index: filesApi.index,
        fileId: file.id,
        filePath: file.path,
        fileKind: file.kind,
        requestFilePick,
        requestFolderPick,
        // Hosted: nested "open file" becomes a top-level editor (infinite
        // stacking). Unhosted: keep the stacked child dialog.
        onOpenFile: (f) => (host ? host.openFile(f.id) : setChildFileId(f.id)),
        onSwitchFile: (f) => setCurrentFileId(f.id),
        // Cross-file move: persist another file's source (the source file's
        // removal) without leaving this editor. Tag files need their meta
        // header re-attached on the way out.
        onSaveFile: (fileId, text) => {
          const target = filesApi.index.byId.get(fileId);
          if (!target) return;
          const meta = isTagFile(target)
            ? (getTagMeta(target) ?? { name: fileName(target.path), color: 'Grey' as const })
            : null;
          filesApi.updateFileSource(
            fileId,
            meta ? createTagFileSource(meta.name, meta.color, text) : text
          );
        },
        onRenameFile: (name) => filesApi.renameFile(file.id, name),
        onMoveFile: (folder) => filesApi.moveFile(file.id, folder),
        onCreateFolder: (path) => filesApi.createFolder(path),
        onCloneFile: () => filesApi.cloneFile(file.id),
        onDeleteFile: () => {
          filesApi.deleteFile(file.id);
          onOpenChange(false);
        },
        fileRole: triggerFile ? 'trigger' : 'display',
        isTagFile: tagFile,
        tagMeta: tagFile ? tagMeta : undefined,
        onTagMetaChange: tagFile
          ? (meta) => filesApi.updateFileSource(file.id, tagFileSourceWithMeta(file, meta))
          : undefined,
        onSetFileRole:
          !tagFile && file.kind === 'script'
            ? (role) => filesApi.setFileRole(file.id, role)
            : undefined,
        onConvertToScript:
          file.kind === 'markdown' ? () => filesApi.setFileKind(file.id, 'script') : undefined,
      }
    : undefined;

  return (
    <>
      <ScriptEditorDialog
        isOpen={isOpen && !!file}
        onOpenChange={onOpenChange}
        title={
          file
            ? tagFile
              ? `Edit tag ${tagFileName(file)}`
              : `Edit ${fileName(file.path)}`
            : 'Edit file'
        }
        initialScriptText={file ? (tagFile ? tagFileTriggerSource(file) : file.source) : ''}
        onSubmit={(text) => {
          if (file) {
            saveSource(text);
            onSubmitted?.(file);
          }
          onOpenChange(false);
        }}
        sources={scriptSources}
        gameId={gameId}
        hideInputs={hideInputs || triggerFile}
        isTriggerContext={triggerFile}
        allowVoteInput={allowVoteInput}
        onSaveToServer={file ? saveSource : undefined}
        readOnly={readOnly}
        fileContext={fileContext}
        initialModified={initialModified}
        initialMoveSession={pendingMove}
        onMinimize={onMinimize}
        onRestore={onRestore}
        // Done must resolve the pending append/pick, handleSubmit prefers
        // onSaveToServer so onSubmit never fires when it's set.
        onDone={() => {
          if (file) onSubmitted?.(file);
        }}
      />

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
          defaultFolder={defaultFolder}
          nameBase={nameBase}
          // New files made from a trigger file are trigger files - a
          // display file include would just get lint-flagged anyway.
          defaultFileRole={pickRef.current?.role ?? (triggerFile ? 'trigger' : undefined)}
          fileKinds={pickRef.current?.fileKinds}
          mode="pick"
          onPick={(f) => {
            const req = pickRef.current;
            pickRef.current = null;
            setBrowserOpen(false);
            req?.onPick(f);
          }}
          onPickFolder={
            pickRef.current?.onPickFolder
              ? (path) => {
                  const req = pickRef.current;
                  pickRef.current = null;
                  setBrowserOpen(false);
                  req?.onPickFolder?.(path);
                }
              : undefined
          }
          // Files created inside the pick browser open for editing; when that
          // edit completes, the pick resolves to the new file.
          onOpenFile={(f) => {
            if (host) {
              host.openFile(f.id, {
                initialModified: true,
                hideInputs,
                allowVoteInput,
                readOnly,
                defaultFolder,
                nameBase,
                onSubmitted: (nf) => {
                  if (nf.id !== f.id) return;
                  const req = pickRef.current;
                  pickRef.current = null;
                  setBrowserOpen(false);
                  setPickAfterEdit(null);
                  req?.onPick(nf);
                },
              });
              return;
            }
            setPickAfterEdit(f);
            setChildFileId(f.id);
          }}
        />
      )}

      {/* Gated: this component renders itself, so it must not mount until a
          nested edit is requested: an always-mounted child recurses forever. */}
      {childFileId !== null && (
        <FileEditorDialog
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              // Cancelled: the browser (if open) stays up with its pick pending.
              setChildFileId(null);
              setPickAfterEdit(null);
            }
          }}
          fileId={childFileId}
          filesApi={filesApi}
          gameId={gameId}
          hideInputs={hideInputs}
          allowVoteInput={allowVoteInput}
          readOnly={readOnly}
          defaultFolder={defaultFolder}
          nameBase={nameBase}
          initialModified={pickAfterEdit?.id === childFileId}
          onSubmitted={(f) => {
            // File created inside the pick browser: once its editor saves,
            // resolve the pending pick to the new file and close the browser.
            if (pickAfterEdit?.id === f.id) {
              const req = pickRef.current;
              pickRef.current = null;
              setBrowserOpen(false);
              setPickAfterEdit(null);
              setChildFileId(null);
              req?.onPick(f);
            }
          }}
        />
      )}
    </>
  );
};

export default FileEditorDialog;
