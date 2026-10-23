import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMinimize } from '../../ui/minimize/MinimizeContext';
import { MemoryScope } from '../../../contexts/MemoryPressureContext';
import { useScriptFiles } from '../../../hooks/useScriptFiles';
import { InputOptionsProvider } from '../markdownEditor/InputOptionsProvider';
import FileEditorDialog from './FileEditorDialog';
import {
  FileEditorHostProvider,
  type FileEditorHostApi,
  type FileEditorOpenOptions,
} from './FileEditorHostContext';

interface HostEntry {
  key: string;
  /** The file this editor is on. Updated when the editor switches files, so
   *  dedupe and the deleted-file prune track what it actually shows. */
  fileId: string;
  /** False while minimized: the component stays mounted so its saved draft
   *  survives, the portal just detaches. */
  isOpen: boolean;
  opts?: FileEditorOpenOptions;
}

/**
 * Game-level host for file editors, mounted above the operator tab panes.
 *
 * Any "open file" action anywhere in the game page funnels here instead of
 * mounting a FileEditorDialog inside a tab pane or another dialog, so the
 * editor outlives tab switches/evictions and can minimize into the app-wide
 * minimize row. Entries dedupe on fileId: reopening a file focuses its
 * editor; different files stack without limit. Minimize hides the portal
 * but keeps the component mounted, matching the minimize system's
 * close-and-reopen model (drafts are saved-or-clean at minimize time).
 */
const FileEditorHost = ({ gameId, children }: { gameId: string; children: React.ReactNode }) => {
  const filesApi = useScriptFiles(gameId);
  const scopeId = `op-file-editors-${gameId}`;
  const { removeByScope } = useMinimize();
  const [entries, setEntries] = useState<HostEntry[]>([]);
  const nextKey = useRef(0);

  const openFile = useCallback((fileId: string, opts?: FileEditorOpenOptions) => {
    setEntries((prev) => {
      const existing = prev.find((e) => e.fileId === fileId);
      if (existing) {
        // Fresh opts (e.g. a move hand-off) must still reach an already-open
        // editor for this file - merge instead of dropping them.
        if (existing.isOpen) {
          if (!opts) return prev;
          return prev.map((e) => (e.key === existing.key ? { ...e, opts } : e));
        }
        // Restoring a minimized entry re-mounts its portal, landing it on top.
        return prev.map((e) =>
          e.key === existing.key ? { ...e, isOpen: true, opts: opts ?? e.opts } : e
        );
      }
      return [...prev, { key: `fe-${nextKey.current++}`, fileId, isOpen: true, opts }];
    });
  }, []);

  const api = useMemo<FileEditorHostApi>(() => ({ openFile }), [openFile]);

  // Files deleted from another surface close their hosted editor instead of
  // leaving a card that restores into a missing file.
  useEffect(() => {
    if (filesApi.isLoading) return;
    setEntries((prev) => {
      const alive = prev.filter((e) => filesApi.doc.files[e.fileId]);
      return alive.length === prev.length ? prev : alive;
    });
  }, [filesApi.doc.files, filesApi.isLoading]);

  // Leaving the game unmounts every hosted editor and its restore closures;
  // drop their minimized cards so no dead UI lingers in the minimize row.
  useEffect(() => () => removeByScope(scopeId), [removeByScope, scopeId]);

  return (
    <FileEditorHostProvider value={api}>
      {children}
      <MemoryScope id={scopeId}>
        <InputOptionsProvider gameId={gameId} showInputs>
          {entries.map((entry) => (
            <FileEditorDialog
              key={entry.key}
              isOpen={entry.isOpen}
              // Hard close removes the entry (the dialog already gated on
              // unsaved changes); minimize only detaches the portal.
              onOpenChange={(open) => {
                if (!open) setEntries((prev) => prev.filter((e) => e.key !== entry.key));
              }}
              onMinimize={() =>
                setEntries((prev) =>
                  prev.map((e) => (e.key === entry.key ? { ...e, isOpen: false } : e))
                )
              }
              onRestore={() =>
                setEntries((prev) =>
                  prev.map((e) => (e.key === entry.key ? { ...e, isOpen: true } : e))
                )
              }
              onCurrentFileChange={(fileId) => {
                if (!fileId) return;
                // Bail to the same reference when the file is unchanged: the
                // dialog reports on every render (fresh closure), so mapping
                // unconditionally would loop setState -> render forever.
                setEntries((prev) => {
                  const current = prev.find((e) => e.key === entry.key);
                  if (!current || current.fileId === fileId) return prev;
                  return prev.map((e) => (e.key === entry.key ? { ...e, fileId } : e));
                });
              }}
              fileId={entry.fileId}
              filesApi={filesApi}
              gameId={gameId}
              {...entry.opts}
            />
          ))}
        </InputOptionsProvider>
      </MemoryScope>
    </FileEditorHostProvider>
  );
};

export default FileEditorHost;
