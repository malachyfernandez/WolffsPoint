import { createContext, useContext } from 'react';
import type { ScriptFile } from '../../../utils/scriptFiles';
import type { PendingMovePayload } from '../../../script/editor/ScriptEditorDialog';

export interface FileEditorOpenOptions {
  /** Done stays enabled so a just-created file can be committed without an
   *  edit first (same semantics as FileEditorDialog.initialModified). */
  initialModified?: boolean;
  /** Fires after the hosted editor saves (Done). Lets pick flows resolve to
   *  the file the user just edited. */
  onSubmitted?: (file: ScriptFile) => void;
  hideInputs?: boolean;
  allowVoteInput?: boolean;
  readOnly?: boolean;
  defaultFolder?: string;
  nameBase?: string;
  /** Open with a move/clone session already armed (handed off from a script
   *  island's "place in another file"): the editor starts in place phase. */
  pendingMove?: PendingMovePayload;
}

export interface FileEditorHostApi {
  /**
   * Open the top-level editor for a file, or focus the entry that already
   * edits it. Entries live at game level, so they survive tab switches and
   * can be minimized into the global minimize row with their saved state.
   */
  openFile: (fileId: string, opts?: FileEditorOpenOptions) => void;
}

/**
 * Lives in its own module (not FileEditorHost) because FileEditorDialog both
 * is rendered by the host and routes nested "open file" actions through it:
 * importing the context from the host component would create an import cycle.
 */
const FileEditorHostContext = createContext<FileEditorHostApi | null>(null);

/** Null outside the operator game page: callers keep their local editor. */
export const useFileEditorHost = () => useContext(FileEditorHostContext);

export const FileEditorHostProvider = FileEditorHostContext.Provider;
