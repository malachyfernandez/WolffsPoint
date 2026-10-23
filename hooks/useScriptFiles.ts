import { useCallback, useMemo, useRef } from 'react';
import { nowMs } from '../utils/simNow';
import { useValue } from './useData';
import { useSharedVariableValue } from './useSharedVariableValue';
import { getGameScopedKey } from '../utils/multiplayer';
import {
  buildFilesIndex,
  cleanupFileInputsInDoc,
  createMarkdownFileSource,
  docWithFile,
  docWithFolder,
  docWithoutFile,
  docWithoutFolder,
  emptyScriptFilesDoc,
  fileName,
  flattenCellContent,
  folderOfPath,
  isProtectedFolder,
  isValidFileName,
  joinFilePath,
  makeFileId,
  normalizeFilePath,
  rewritePathReferences,
  suggestFileName,
  type FlattenIssue,
  type ScriptFile,
  type ScriptFileKind,
  type ScriptFileRole,
  type ScriptFilesDoc,
  type ScriptFilesIndex,
} from '../utils/scriptFiles';
import { foldCellForResolve, previewCellText } from '../utils/cellPieces';
import { adoptFolderIdentities, repathFolderIdentities } from '../utils/scriptFolderIdentity';
import { planFolderImport, type FolderArchivePayload } from '../utils/scriptFolderArchive';
import { useCellModuleStatus, useSharedCellModuleStatus } from '../utils/legacySystems';
import { useSimEditWarning } from '../contexts/SimEditWarningContext';
import { useUndoRedo } from './useUndoRedo';

export const SCRIPT_FILES_KEY = 'scriptFiles';

interface UseScriptFilesResult {
  doc: ScriptFilesDoc;
  index: ScriptFilesIndex;
  /** Resolve cell text to flat markdown, legacy text passes through. */
  resolve: (text: string) => string;
  /** Resolve with issues for UI surfacing (editor warnings). */
  resolveWithIssues: (text: string) => { markdown: string; issues: FlattenIssue[] };
  /** Friendly cell label: file names for file-mode cells, raw text otherwise. */
  previewText: (text: string) => string;
  isLoading: boolean;
}

const makeResolve = (index: ScriptFilesIndex, displayModules: boolean) => {
  const cache = new Map<string, string>();
  return (text: string): string => {
    const cached = cache.get(text);
    if (cached !== undefined) return cached;
    const resolved = flattenCellContent(
      foldCellForResolve(text, index, { displayModules }),
      index,
      { displayModules }
    ).markdown;
    if (cache.size > 500) cache.clear();
    cache.set(text, resolved);
    return resolved;
  };
};

/**
 * Read-only files access: used by player-facing renderers that only need
 * `resolve`/`previewText` (no CRUD).
 */
export function useScriptFilesReader(
  gameId: string | undefined,
  userIds?: string[]
): UseScriptFilesResult {
  const { value, isLoading } = useSharedVariableValue<ScriptFilesDoc>({
    key: getGameScopedKey(SCRIPT_FILES_KEY, gameId ?? ''),
    defaultValue: emptyScriptFilesDoc(),
    userIds,
  });
  const doc = value ?? emptyScriptFilesDoc();
  const index = useMemo(() => buildFilesIndex(doc), [doc]);
  // The version marker is operator-owned; players read it through userIds.
  const { displayModules } = useSharedCellModuleStatus(gameId, userIds);
  const resolve = useMemo(() => makeResolve(index, displayModules), [index, displayModules]);
  const resolveWithIssues = useCallback(
    (text: string) =>
      flattenCellContent(foldCellForResolve(text, index, { displayModules }), index, {
        displayModules,
      }),
    [index, displayModules]
  );
  const previewText = useCallback((text: string) => previewCellText(text, index), [index]);
  return { doc, index, resolve, resolveWithIssues, previewText, isLoading };
}

/**
 * Full operator access: the shared doc plus CRUD ops. Every mutation writes
 * the whole doc back through `useValue` (the doc is small: file count is
 * dozens, not thousands).
 */
export function useScriptFiles(gameId: string | undefined) {
  const [record, setRecord] = useValue<ScriptFilesDoc>(
    getGameScopedKey(SCRIPT_FILES_KEY, gameId ?? ''),
    { defaultValue: emptyScriptFilesDoc(), privacy: 'PUBLIC', autoCreate: false }
  );
  const doc = useMemo(() => record?.value ?? emptyScriptFilesDoc(), [record?.value]);
  const index = useMemo(() => buildFilesIndex(doc), [doc]);
  const { displayModules } = useCellModuleStatus(gameId);
  const docRef = useRef(doc);
  docRef.current = doc;

  const commit = useCallback(
    (next: ScriptFilesDoc) => {
      docRef.current = next;
      setRecord(next);
    },
    [setRecord]
  );

  // File/folder creation flags "simulation only" first (no-op outside the
  // sim) - only creation ops use this, not edits/deletes.
  const warnSimEdit = useSimEditWarning();
  const commitNew = useCallback(
    (next: ScriptFilesDoc) => {
      warnSimEdit();
      commit(next);
    },
    [warnSimEdit, commit]
  );

  // Every files mutation is undoable: the doc is immutable, so the previous
  // object is a complete snapshot. `isNew` ops keep the simulation warning
  // on the forward action only; undo/redo re-commit silently.
  const { executeCommand } = useUndoRedo();
  const commitUndoable = useCallback(
    (next: ScriptFilesDoc, description: string, isNew = false) => {
      const previous = docRef.current;
      const apply = isNew ? commitNew : commit;
      executeCommand({
        action: () => apply(next),
        undoAction: () => commit(previous),
        description,
      });
    },
    [commit, commitNew, executeCommand]
  );

  const resolve = useMemo(() => makeResolve(index, displayModules), [index, displayModules]);
  const resolveWithIssues = useCallback(
    (text: string) =>
      flattenCellContent(foldCellForResolve(text, index, { displayModules }), index, {
        displayModules,
      }),
    [index, displayModules]
  );
  const previewText = useCallback((text: string) => previewCellText(text, index), [index]);

  // ------------------------------------------------------------- files

  const createFile = useCallback(
    (
      folder: string,
      name: string,
      kind: ScriptFileKind,
      role?: ScriptFileRole
    ): ScriptFile | null => {
      const cleanName = name.trim();
      if (!isValidFileName(cleanName)) return null;
      const path = joinFilePath(folder, cleanName);
      const current = buildFilesIndex(docRef.current);
      if (current.byPath.has(path.toLowerCase())) return null;
      const file: ScriptFile = {
        id: makeFileId(),
        path,
        kind,
        source: kind === 'markdown' ? createMarkdownFileSource() : '',
        role,
        updatedAt: nowMs(),
      };
      commitUndoable(
        docWithFolder(docWithFile(docRef.current, file), folder),
        `New file ${path}`,
        true
      );
      return file;
    },
    [commitUndoable]
  );

  const updateFileSource = useCallback(
    (id: string, source: string) => {
      const file = docRef.current.files[id];
      if (!file) return;
      commitUndoable(
        cleanupFileInputsInDoc(docWithFile(docRef.current, { ...file, source, updatedAt: nowMs() })),
        `Edit ${file.path}`
      );
    },
    [commitUndoable]
  );

  /** Switch a file's kind (markdown -> script when its source outgrows the
   *  single-CreateMarkdown shape; the editor gates saving behind this). */
  const setFileKind = useCallback(
    (id: string, kind: ScriptFileKind) => {
      const file = docRef.current.files[id];
      if (!file || file.kind === kind) return;
      commitUndoable(
        docWithFile(docRef.current, { ...file, kind, updatedAt: nowMs() }),
        `Convert ${file.path} to ${kind}`
      );
    },
    [commitUndoable]
  );

  /** Set a script file's role. `undefined`/'display' clears back to the
   *  default. Tag files are inherently trigger - callers shouldn't toggle. */
  const setFileRole = useCallback(
    (id: string, role: ScriptFileRole | undefined) => {
      const file = docRef.current.files[id];
      if (!file) return;
      commitUndoable(
        docWithFile(docRef.current, {
          ...file,
          role: role === 'display' ? undefined : role,
          updatedAt: nowMs(),
        }),
        `Set ${file.path} role`
      );
    },
    [commitUndoable]
  );

  const deleteFile = useCallback(
    (id: string) => {
      const file = docRef.current.files[id];
      if (!file) return;
      commitUndoable(docWithoutFile(docRef.current, id), `Delete ${file.path}`);
    },
    [commitUndoable]
  );

  const cloneFile = useCallback(
    (id: string): ScriptFile | null => {
      const file = docRef.current.files[id];
      if (!file) return null;
      const current = buildFilesIndex(docRef.current);
      const name = suggestFileName(`${fileName(file.path)} copy`, folderOfPath(file.path), current);
      const clone: ScriptFile = {
        ...file,
        id: makeFileId(),
        path: joinFilePath(folderOfPath(file.path), name),
        updatedAt: nowMs(),
      };
      commitUndoable(docWithFile(docRef.current, clone), `Clone ${file.path}`, true);
      return clone;
    },
    [commitUndoable]
  );

  /** Copy `file` into `folder`, keeping its name (uniqued on collision).
   *  Paste semantics - unlike cloneFile there's no " copy" suffix unless the
   *  destination already has that name. */
  const copyFileInto = useCallback(
    (id: string, folder: string): ScriptFile | null => {
      const file = docRef.current.files[id];
      if (!file) return null;
      const dest = normalizeFilePath(folder);
      const current = buildFilesIndex(docRef.current);
      const name = suggestFileName(fileName(file.path), dest, current);
      const copy: ScriptFile = {
        ...file,
        id: makeFileId(),
        path: joinFilePath(dest, name),
        updatedAt: nowMs(),
      };
      commitUndoable(docWithFile(docRef.current, copy), `Paste ${fileName(file.path)}`, true);
      return copy;
    },
    [commitUndoable]
  );

  const renameFile = useCallback(
    (id: string, newName: string): boolean => {
      const file = docRef.current.files[id];
      const cleanName = newName.trim();
      if (!file || !isValidFileName(cleanName)) return false;
      const nextPath = joinFilePath(folderOfPath(file.path), cleanName);
      if (nextPath.toLowerCase() === file.path.toLowerCase()) return true;
      const current = buildFilesIndex(docRef.current);
      if (current.byPath.has(nextPath.toLowerCase())) return false;
      const renamed = docWithFile(docRef.current, {
        ...file,
        path: nextPath,
        updatedAt: nowMs(),
      });
      commitUndoable(
        rewritePathReferences(renamed, file.path, nextPath),
        `Rename ${fileName(file.path)}`
      );
      return true;
    },
    [commitUndoable]
  );

  const moveFile = useCallback(
    (id: string, folder: string): boolean => {
      const file = docRef.current.files[id];
      if (!file) return false;
      const nextPath = joinFilePath(folder, fileName(file.path));
      if (nextPath.toLowerCase() === file.path.toLowerCase()) return true;
      const current = buildFilesIndex(docRef.current);
      if (current.byPath.has(nextPath.toLowerCase())) return false;
      const moved = docWithFile(docRef.current, {
        ...file,
        path: nextPath,
        updatedAt: nowMs(),
      });
      commitUndoable(
        rewritePathReferences(docWithFolder(moved, folder), file.path, nextPath),
        `Move ${fileName(file.path)}`
      );
      return true;
    },
    [commitUndoable]
  );

  // ------------------------------------------------------------- folders

  const createFolder = useCallback(
    (folder: string) => {
      const normalized = normalizeFilePath(folder);
      if (normalized) {
        commitUndoable(docWithFolder(docRef.current, normalized), `New folder ${normalized}`, true);
      }
    },
    [commitUndoable]
  );

  const renameFolder = useCallback(
    (folder: string, newName: string): boolean => {
      const normalized = normalizeFilePath(folder);
      const cleanName = newName.trim();
      if (!normalized || isProtectedFolder(normalized) || !isValidFileName(cleanName)) {
        return false;
      }
      const parent = folderOfPath(normalized);
      const nextPath = joinFilePath(parent, cleanName);
      const current = buildFilesIndex(docRef.current);
      if (
        current.byPath.has(nextPath.toLowerCase()) ||
        current.folders.some((f) => f.toLowerCase() === nextPath.toLowerCase())
      ) {
        return false;
      }
      // Move every descendant file + folder to the new prefix.
      const identified = adoptFolderIdentities(docRef.current, current.folders);
      const lower = normalized.toLowerCase();
      const repath = (p: string) =>
        p.toLowerCase().startsWith(`${lower}/`) ? `${nextPath}/${p.slice(lower.length + 1)}` : p;
      const next: ScriptFilesDoc = {
        ...identified,
        files: Object.fromEntries(
          Object.entries(identified.files).map(([id, file]) => [
            id,
            {
              ...file,
              path:
                folderOfPath(file.path).toLowerCase() === lower ||
                folderOfPath(file.path).toLowerCase().startsWith(`${lower}/`)
                  ? joinFilePath(repath(folderOfPath(file.path)), fileName(file.path))
                  : file.path,
              updatedAt: nowMs(),
            },
          ])
        ),
        folders: current.folders.map((f) => (f.toLowerCase() === lower ? nextPath : repath(f))),
        folderIds: repathFolderIdentities(identified, normalized, nextPath),
      };
      commitUndoable(
        rewritePathReferences(next, normalized, nextPath),
        `Rename folder ${fileName(normalized)}`
      );
      return true;
    },
    [commitUndoable]
  );

  /** Move `folder` under `newParent` (descendants + file refs follow). */
  const moveFolder = useCallback(
    (folder: string, newParent: string): boolean => {
      const normalized = normalizeFilePath(folder);
      const parent = normalizeFilePath(newParent);
      if (!normalized || isProtectedFolder(normalized)) return false;
      const lower = normalized.toLowerCase();
      if (
        parent.toLowerCase() === lower ||
        parent.toLowerCase().startsWith(`${lower}/`) ||
        folderOfPath(normalized).toLowerCase() === parent.toLowerCase()
      ) {
        return false;
      }
      const nextPath = joinFilePath(parent, fileName(normalized));
      const current = buildFilesIndex(docRef.current);
      if (
        current.byPath.has(nextPath.toLowerCase()) ||
        current.folders.some((f) => f.toLowerCase() === nextPath.toLowerCase())
      ) {
        return false;
      }
      const repath = (p: string) =>
        p.toLowerCase() === lower
          ? nextPath
          : p.toLowerCase().startsWith(`${lower}/`)
            ? `${nextPath}/${p.slice(lower.length + 1)}`
            : p;
      const identified = adoptFolderIdentities(docRef.current, current.folders);
      const next: ScriptFilesDoc = {
        ...identified,
        files: Object.fromEntries(
          Object.entries(identified.files).map(([id, file]) => {
            const dir = folderOfPath(file.path);
            const dirLower = dir.toLowerCase();
            const inside = dirLower === lower || dirLower.startsWith(`${lower}/`);
            return [
              id,
              inside
                ? {
                    ...file,
                    path: joinFilePath(repath(dir), fileName(file.path)),
                    updatedAt: nowMs(),
                  }
                : file,
            ];
          })
        ),
        folders: current.folders.map(repath).filter(Boolean),
        folderIds: repathFolderIdentities(identified, normalized, nextPath),
      };
      commitUndoable(
        rewritePathReferences(docWithFolder(next, parent), normalized, nextPath),
        `Move folder ${fileName(normalized)}`
      );
      return true;
    },
    [commitUndoable]
  );

  const deleteFolder = useCallback(
    (folder: string) => {
      const normalized = normalizeFilePath(folder);
      if (!normalized || isProtectedFolder(normalized)) return false;
      commitUndoable(docWithoutFolder(docRef.current, normalized), `Delete folder ${normalized}`);
      return true;
    },
    [commitUndoable]
  );

  const cloneFolder = useCallback(
    (folder: string) => {
      const normalized = normalizeFilePath(folder);
      if (!normalized || isProtectedFolder(normalized)) return;
      const current = buildFilesIndex(docRef.current);
      const taken = new Set([
        ...current.byPath.keys(),
        ...current.folders.map((f) => f.toLowerCase()),
      ]);
      const parent = folderOfPath(normalized);
      const base = `${fileName(normalized)} copy`;
      let name = base;
      for (let i = 2; taken.has(joinFilePath(parent, name).toLowerCase()); i++) {
        name = `${base} ${i}`;
      }
      const nextPrefix = joinFilePath(folderOfPath(normalized), name);
      const lower = normalized.toLowerCase();
      let next = docRef.current;
      for (const f of current.folders) {
        if (f.toLowerCase() === lower || f.toLowerCase().startsWith(`${lower}/`)) {
          next = docWithFolder(next, `${nextPrefix}${f.slice(lower.length)}`);
        }
      }
      for (const file of Object.values(next.files)) {
        const dir = folderOfPath(file.path).toLowerCase();
        if (dir === lower || dir.startsWith(`${lower}/`)) {
          const clone: ScriptFile = {
            ...file,
            id: makeFileId(),
            path: joinFilePath(
              `${nextPrefix}${dir === lower ? '' : dir.slice(lower.length)}`,
              fileName(file.path)
            ),
            updatedAt: nowMs(),
          };
          next = docWithFile(next, clone);
        }
      }
      commitUndoable(next, `Clone folder ${normalized}`, true);
    },
    [commitUndoable]
  );

  /** Copy `folder` and its whole subtree under `destParent`, keeping its
   *  name (uniqued on collision). Paste semantics - the folder-into-itself/
   *  descendant cases are rejected like moveFolder's. */
  const copyFolderInto = useCallback(
    (folder: string, destParent: string) => {
      const normalized = normalizeFilePath(folder);
      const parent = normalizeFilePath(destParent);
      if (!normalized || isProtectedFolder(normalized)) return;
      const lower = normalized.toLowerCase();
      const parentLower = parent.toLowerCase();
      if (parentLower === lower || parentLower.startsWith(`${lower}/`)) return;
      const current = buildFilesIndex(docRef.current);
      const taken = new Set([
        ...current.byPath.keys(),
        ...current.folders.map((f) => f.toLowerCase()),
      ]);
      const base = fileName(normalized);
      let name = base;
      for (let i = 2; taken.has(joinFilePath(parent, name).toLowerCase()); i++) {
        name = `${base} ${i}`;
      }
      const nextPrefix = joinFilePath(parent, name);
      let next = docRef.current;
      for (const f of current.folders) {
        if (f.toLowerCase() === lower || f.toLowerCase().startsWith(`${lower}/`)) {
          next = docWithFolder(next, `${nextPrefix}${f.slice(lower.length)}`);
        }
      }
      for (const file of Object.values(next.files)) {
        const dir = folderOfPath(file.path).toLowerCase();
        if (dir === lower || dir.startsWith(`${lower}/`)) {
          const clone: ScriptFile = {
            ...file,
            id: makeFileId(),
            path: joinFilePath(
              `${nextPrefix}${dir === lower ? '' : dir.slice(lower.length)}`,
              fileName(file.path)
            ),
            updatedAt: nowMs(),
          };
          next = docWithFile(next, clone);
        }
      }
      commitUndoable(next, `Paste folder ${normalized}`, true);
    },
    [commitUndoable]
  );

  const suggestName = useCallback(
    (base: string, folder: string) => suggestFileName(base, folder, index),
    [index]
  );

  /** Import a folder archive under `destParent` as a new folder (merging into
   *  the pinned folder when the exported root name collides with one). The
   *  planner remaps ids + rewrites internal refs; here we commit atomically. */
  const importFolderTree = useCallback(
    (
      payload: FolderArchivePayload,
      destParent: string
    ): { rootPath: string; fileCount: number } => {
      const plan = planFolderImport(payload, docRef.current, destParent);
      const folders = new Map(
        docRef.current.folders.map((f) => [
          normalizeFilePath(f).toLowerCase(),
          normalizeFilePath(f),
        ])
      );
      for (const f of plan.folders) folders.set(f.toLowerCase(), f);
      // Identities merged before folder materialization so adoption validates
      // them instead of minting throwaway aliases.
      let next: ScriptFilesDoc = {
        ...docRef.current,
        folders: [...folders.values()],
        folderIds: { ...docRef.current.folderIds, ...plan.folderIds },
      };
      next = docWithFolder(next, plan.rootPath);
      for (const file of plan.files) next = docWithFile(next, file);
      commitUndoable(next, `Import folder ${plan.rootPath}`, true);
      return { rootPath: plan.rootPath, fileCount: plan.files.length };
    },
    [commitUndoable]
  );

  const identifyFolder = useCallback(
    (folder: string): { id: string; path: string } | null => {
      const current = buildFilesIndex(docRef.current);
      const path = current.folders.find(
        (candidate) => candidate.toLowerCase() === normalizeFilePath(folder).toLowerCase()
      );
      if (!path) return null;
      const next = adoptFolderIdentities(docRef.current, current.folders);
      const id = buildFilesIndex(next).folderIdentities.byPath.get(path.toLowerCase());
      if (!id) return null;
      if (next !== docRef.current) commit(next);
      return { id, path };
    },
    [commit]
  );

  return {
    doc,
    index,
    resolve,
    resolveWithIssues,
    previewText,
    isLoading: record === undefined,
    createFile,
    updateFileSource,
    setFileKind,
    setFileRole,
    deleteFile,
    cloneFile,
    renameFile,
    moveFile,
    createFolder,
    identifyFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    cloneFolder,
    copyFileInto,
    copyFolderInto,
    suggestName,
    importFolderTree,
  };
}
