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
import { useCellModuleStatus, useSharedCellModuleStatus } from '../utils/legacySystems';
import { useSimEditWarning } from '../contexts/SimEditWarningContext';

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
      commitNew(docWithFolder(docWithFile(docRef.current, file), folder));
      return file;
    },
    [commitNew]
  );

  const updateFileSource = useCallback(
    (id: string, source: string) => {
      const file = docRef.current.files[id];
      if (!file) return;
      commit(
        cleanupFileInputsInDoc(docWithFile(docRef.current, { ...file, source, updatedAt: nowMs() }))
      );
    },
    [commit]
  );

  /** Switch a file's kind (markdown -> script when its source outgrows the
   *  single-CreateMarkdown shape; the editor gates saving behind this). */
  const setFileKind = useCallback(
    (id: string, kind: ScriptFileKind) => {
      const file = docRef.current.files[id];
      if (!file || file.kind === kind) return;
      commit(docWithFile(docRef.current, { ...file, kind, updatedAt: nowMs() }));
    },
    [commit]
  );

  /** Set a script file's role. `undefined`/'display' clears back to the
   *  default. Tag files are inherently trigger - callers shouldn't toggle. */
  const setFileRole = useCallback(
    (id: string, role: ScriptFileRole | undefined) => {
      const file = docRef.current.files[id];
      if (!file) return;
      commit(
        docWithFile(docRef.current, {
          ...file,
          role: role === 'display' ? undefined : role,
          updatedAt: nowMs(),
        })
      );
    },
    [commit]
  );

  const deleteFile = useCallback(
    (id: string) => commit(docWithoutFile(docRef.current, id)),
    [commit]
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
      commitNew(docWithFile(docRef.current, clone));
      return clone;
    },
    [commitNew]
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
      commitNew(docWithFile(docRef.current, copy));
      return copy;
    },
    [commitNew]
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
      commit(rewritePathReferences(renamed, file.path, nextPath));
      return true;
    },
    [commit]
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
      commit(rewritePathReferences(docWithFolder(moved, folder), file.path, nextPath));
      return true;
    },
    [commit]
  );

  // ------------------------------------------------------------- folders

  const createFolder = useCallback(
    (folder: string) => {
      const normalized = normalizeFilePath(folder);
      if (normalized) commitNew(docWithFolder(docRef.current, normalized));
    },
    [commitNew]
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
      commit(rewritePathReferences(next, normalized, nextPath));
      return true;
    },
    [commit]
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
      commit(rewritePathReferences(docWithFolder(next, parent), normalized, nextPath));
      return true;
    },
    [commit]
  );

  const deleteFolder = useCallback(
    (folder: string) => {
      const normalized = normalizeFilePath(folder);
      if (!normalized || isProtectedFolder(normalized)) return false;
      commit(docWithoutFolder(docRef.current, normalized));
      return true;
    },
    [commit]
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
      commitNew(next);
    },
    [commitNew]
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
      commitNew(next);
    },
    [commitNew]
  );

  const suggestName = useCallback(
    (base: string, folder: string) => suggestFileName(base, folder, index),
    [index]
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
  };
}
