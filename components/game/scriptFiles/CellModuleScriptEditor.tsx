import React, { useRef, useState } from 'react';
import ScriptEditorDialog, {
  type PendingMovePayload,
  type ScriptEditorDialogProps,
  type ScriptFileContext,
} from '../../../script/editor/ScriptEditorDialog';
import { useScriptFiles } from '../../../hooks/useScriptFiles';
import type { ScriptFile, ScriptFileKind } from '../../../utils/scriptFiles';
import FileBrowserDialog from './FileBrowserDialog';
import FileEditorDialog from './FileEditorDialog';
import { useFileEditorHost } from './FileEditorHostContext';

/** Legacy markdown islands still need the same cell-module picker as files,
 * but must retain their script-island wrapper on save. */
export default function CellModuleScriptEditor(
  props: ScriptEditorDialogProps & { gameId: string }
) {
  const filesApi = useScriptFiles(props.gameId);
  const host = useFileEditorHost();
  const [browserOpen, setBrowserOpen] = useState(false);
  const [editFileId, setEditFileId] = useState<string | null>(null);
  const [createdFileId, setCreatedFileId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMovePayload | null>(null);
  const pick = useRef<{
    onPick: (file: ScriptFile) => void;
    onCancel?: () => void;
    onPickFolder?: (path: string) => void;
    fileKinds?: ScriptFileKind[];
  } | null>(null);
  const context: ScriptFileContext = {
    index: filesApi.index,
    scriptIsland: true,
    requestFilePick: (onPick, onCancel, _role, onPickFolder, fileKinds) => {
      pick.current = { onPick, onCancel, onPickFolder, fileKinds };
      setBrowserOpen(true);
    },
    // Folder blocks retarget through the same picker; a file pick cancels.
    requestFolderPick: (onPick, onCancel) => {
      pick.current = { onPick: () => onCancel?.(), onCancel, onPickFolder: onPick };
      setBrowserOpen(true);
    },
    onOpenFile: (file) => (host ? host.openFile(file.id) : setEditFileId(file.id)),
    // "Place in another file": open the destination's file editor with the
    // shelved selections armed for placement.
    onMoveToFile: (file, payload) => {
      if (host) {
        host.openFile(file.id, { pendingMove: payload, readOnly: props.readOnly });
        return;
      }
      setPendingMove(payload);
      setEditFileId(file.id);
    },
  };
  const openCreatedFile = (file: ScriptFile) => {
    if (host) {
      host.openFile(file.id, {
        initialModified: true,
        readOnly: props.readOnly,
        onSubmitted: (submitted) => {
          if (submitted.id !== file.id) return;
          const request = pick.current;
          pick.current = null;
          setBrowserOpen(false);
          request?.onPick(submitted);
        },
      });
      return;
    }
    setCreatedFileId(file.id);
    setEditFileId(file.id);
  };
  return (
    <>
      <ScriptEditorDialog {...props} fileContext={context} />
      {browserOpen && (
        <FileBrowserDialog
          isOpen
          onOpenChange={(open) => {
            if (open) return;
            pick.current?.onCancel?.();
            pick.current = null;
            setBrowserOpen(false);
          }}
          filesApi={filesApi}
          mode="pick"
          defaultFileRole="display"
          fileKinds={pick.current?.fileKinds}
          onPick={(file) => {
            const request = pick.current;
            pick.current = null;
            setBrowserOpen(false);
            request?.onPick(file);
          }}
          onPickFolder={
            pick.current?.onPickFolder
              ? (path) => {
                  const request = pick.current;
                  pick.current = null;
                  setBrowserOpen(false);
                  request?.onPickFolder?.(path);
                }
              : undefined
          }
          onOpenFile={openCreatedFile}
        />
      )}
      {editFileId && !host && (
        <FileEditorDialog
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setEditFileId(null);
              setCreatedFileId(null);
              setPendingMove(null);
            }
          }}
          filesApi={filesApi}
          fileId={editFileId}
          gameId={props.gameId}
          readOnly={props.readOnly}
          pendingMove={pendingMove ?? undefined}
          initialModified={editFileId === createdFileId}
          onSubmitted={(file) => {
            if (file.id !== createdFileId) return;
            const request = pick.current;
            pick.current = null;
            setCreatedFileId(null);
            setBrowserOpen(false);
            setEditFileId(null);
            request?.onPick(file);
          }}
        />
      )}
    </>
  );
}
