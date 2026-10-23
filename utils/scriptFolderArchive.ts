import {
  buildFilesIndex,
  fileName,
  folderOfPath,
  isProtectedFolder,
  joinFilePath,
  makeFileId,
  normalizeFilePath,
  type ScriptFile,
  type ScriptFileKind,
  type ScriptFileRole,
  type ScriptFilesDoc,
} from './scriptFiles';
import { isReservedFolderId, makeFolderId } from './scriptFolderIdentity';
import { nowMs } from './simNow';

// ---------------------------------------------------------------------------
// Folder archive format
//
// A folder archive is a zip containing:
//   wolffspoint-folder.json  - the manifest (FolderArchiveManifest)
//   files/<relpath>.txt      - one entry per file holding its raw source
//
// All paths inside the manifest are relative to the exported root folder so
// the same zip can land under any destination name. File/folder identities are
// preserved verbatim when free and remapped on collision; every quoted
// reference inside imported sources (`ID =`, `PATH =`, ORDER/HIDDEN lists) is
// rewritten to the remapped value.
// ---------------------------------------------------------------------------

export const FOLDER_ARCHIVE_FORMAT = 'wolffspoint-folder';
export const FOLDER_ARCHIVE_VERSION = 1;
export const FOLDER_ARCHIVE_MANIFEST = 'wolffspoint-folder.json';
export const FOLDER_ARCHIVE_FILES_PREFIX = 'files/';

export interface FolderArchiveFileEntry {
  id: string;
  /** Path relative to the exported root, filename included. */
  path: string;
  kind: ScriptFileKind;
  role?: ScriptFileRole;
  updatedAt?: number;
  /** Zip entry name holding this file's source. */
  entry: string;
}

export interface FolderArchiveManifest {
  format: typeof FOLDER_ARCHIVE_FORMAT;
  version: number;
  /** Exported root folder's name - the suggested folder name on import. */
  name: string;
  /** Exported root folder's original absolute path. */
  root: string;
  /** Relative folder paths under the root ('' = the root itself). */
  folders: string[];
  /** Folder id -> relative folder path ('' = the root itself). */
  folderIds: Record<string, string>;
  files: FolderArchiveFileEntry[];
}

/** Manifest plus the raw sources keyed by manifest entry name. */
export interface FolderArchivePayload {
  manifest: FolderArchiveManifest;
  sources: Record<string, string>;
}

const sanitizeName = (name: string): string =>
  name
    .trim()
    .replace(/[/\\:*?"<>|]/g, '')
    .trim() || 'Imported folder';

/** Collect `folder`'s whole subtree into a manifest + raw sources. */
export const buildFolderArchive = (doc: ScriptFilesDoc, folder: string): FolderArchivePayload => {
  const root = normalizeFilePath(folder);
  const lower = `${root.toLowerCase()}/`;
  const index = buildFilesIndex(doc);
  const rel = (abs: string) => normalizeFilePath(abs).slice(root.length + 1);

  const folders = index.folders
    .filter((f) => f.toLowerCase() === root.toLowerCase() || f.toLowerCase().startsWith(lower))
    .map((f) => (f.toLowerCase() === root.toLowerCase() ? '' : rel(f)));

  const files: FolderArchiveFileEntry[] = [];
  const sources: Record<string, string> = {};
  for (const file of Object.values(doc.files)) {
    const dir = folderOfPath(file.path);
    const dirLower = dir.toLowerCase();
    if (dirLower !== root.toLowerCase() && !dirLower.startsWith(lower)) continue;
    const relPath = rel(file.path);
    const entry = `${FOLDER_ARCHIVE_FILES_PREFIX}${relPath}.txt`;
    files.push({
      id: file.id,
      path: relPath,
      kind: file.kind,
      ...(file.role ? { role: file.role } : {}),
      ...(file.updatedAt !== undefined ? { updatedAt: file.updatedAt } : {}),
      entry,
    });
    sources[entry] = file.source;
  }

  const folderIds: Record<string, string> = {};
  for (const [id, absPath] of Object.entries(doc.folderIds ?? {})) {
    const normalized = normalizeFilePath(absPath);
    const nLower = normalized.toLowerCase();
    if (nLower === root.toLowerCase()) folderIds[id] = '';
    else if (nLower.startsWith(lower)) folderIds[id] = rel(normalized);
  }

  return {
    manifest: {
      format: FOLDER_ARCHIVE_FORMAT,
      version: FOLDER_ARCHIVE_VERSION,
      name: fileName(root) || 'folder',
      root,
      folders,
      folderIds,
      files: files.sort((a, b) => a.path.localeCompare(b.path)),
    },
    sources,
  };
};

/** Validate parsed manifest JSON. Throws with a user-friendly reason. */
export const parseFolderArchiveManifest = (value: unknown): FolderArchiveManifest => {
  const fail = (reason: string): never => {
    throw new Error(`Not a Wolffspoint folder archive: ${reason}`);
  };
  if (!value || typeof value !== 'object') fail('missing manifest');
  const m = value as Record<string, unknown>;
  if (m.format !== FOLDER_ARCHIVE_FORMAT) fail('unrecognized manifest format');
  if (m.version !== FOLDER_ARCHIVE_VERSION) fail(`unsupported archive version ${m.version}`);
  if (typeof m.name !== 'string' || typeof m.root !== 'string') fail('missing folder name');
  if (!Array.isArray(m.folders) || !m.folders.every((f) => typeof f === 'string')) {
    fail('invalid folder list');
  }
  if (!m.folderIds || typeof m.folderIds !== 'object' || Array.isArray(m.folderIds)) {
    fail('invalid folder identities');
  }
  if (!Array.isArray(m.files)) fail('invalid file list');
  const files: FolderArchiveFileEntry[] = [];
  for (const raw of m.files as unknown[]) {
    if (!raw || typeof raw !== 'object') fail('invalid file entry');
    const f = raw as Record<string, unknown>;
    if (typeof f.id !== 'string' || typeof f.path !== 'string' || typeof f.entry !== 'string') {
      fail('invalid file entry');
    }
    if (f.kind !== 'markdown' && f.kind !== 'script') fail(`unknown file kind ${f.kind}`);
    if (f.role !== undefined && f.role !== 'display' && f.role !== 'trigger') {
      fail(`unknown file role ${f.role}`);
    }
    files.push({
      id: f.id as string,
      path: normalizeFilePath(f.path as string),
      kind: f.kind as ScriptFileKind,
      ...(f.role ? { role: f.role as ScriptFileRole } : {}),
      ...(typeof f.updatedAt === 'number' ? { updatedAt: f.updatedAt } : {}),
      entry: f.entry as string,
    });
  }
  const folderIds: Record<string, string> = {};
  for (const [id, relPath] of Object.entries(m.folderIds as Record<string, unknown>)) {
    if (typeof relPath !== 'string') fail('invalid folder identities');
    folderIds[id] = normalizeFilePath(relPath as string);
  }
  return {
    format: FOLDER_ARCHIVE_FORMAT,
    version: FOLDER_ARCHIVE_VERSION,
    name: m.name as string,
    root: normalizeFilePath(m.root as string),
    folders: (m.folders as string[]).map(normalizeFilePath),
    folderIds,
    files,
  };
};

export interface FolderImportPlan {
  /** Final absolute path of the imported root folder. */
  rootPath: string;
  /** Absolute folder paths to materialize. */
  folders: string[];
  /** Folder id -> absolute path (already collision-remapped). */
  folderIds: Record<string, string>;
  /** Imported files with final ids/paths and rewritten sources. */
  files: ScriptFile[];
}

const QUOTED = (value: string) =>
  new RegExp(`(["'\`])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g');

/**
 * Replace every quoted literal equal to a remapped id/path inside `source`.
 * Covers `ID = "f_x"`, `PATH = "a/b"`, `ORDER = ["f_x", ...]`, `HIDDEN` lists
 * and positional `File("a/b")` refs - anything written as a string literal.
 * Refs pointing outside the export are left alone: they resolve (or
 * deliberately fail) against the destination doc.
 */
export const rewriteArchiveRefs = (source: string, remaps: ReadonlyMap<string, string>): string => {
  if (!remaps.size) return source;
  const keys = [...remaps.keys()].sort((a, b) => b.length - a.length);
  let next = source;
  for (const old of keys) {
    const replacement = remaps.get(old)!;
    if (replacement === old) continue;
    next = next.replace(QUOTED(old), (match, quote: string) => `${quote}${replacement}${quote}`);
  }
  return next;
};

/**
 * Plan an import of `payload` into a new folder under `destParent`
 * (normalizeFilePath('') = project root). Pure - applies nothing.
 *
 * Collisions: if the suggested root name is taken, import merges into the
 * existing folder only when it is pinned (tags/...), otherwise a `name 2`
 * sibling is created. File ids and folder ids keep their exported values when
 * free, and mint fresh ones on collision - all quoted references inside the
 * imported sources are rewritten so internal links keep working.
 */
export const planFolderImport = (
  payload: FolderArchivePayload,
  doc: ScriptFilesDoc,
  destParent: string
): FolderImportPlan => {
  const { manifest } = payload;
  const parent = normalizeFilePath(destParent);
  const index = buildFilesIndex(doc);
  const name = sanitizeName(manifest.name || fileName(manifest.root));

  // ---- root folder placement --------------------------------------------
  const takenFolders = new Set(index.folders.map((f) => f.toLowerCase()));
  const folderTaken = (abs: string) =>
    takenFolders.has(abs.toLowerCase()) || index.byPath.has(abs.toLowerCase());
  let rootPath = joinFilePath(parent, name);
  if (folderTaken(rootPath)) {
    if (isProtectedFolder(rootPath)) {
      // Pinned folders always exist in the index - an export of `tags` merges
      // back into `tags` so tag files keep their tag semantics.
    } else {
      let i = 2;
      while (folderTaken(joinFilePath(parent, `${name} ${i}`))) i++;
      rootPath = joinFilePath(parent, `${name} ${i}`);
    }
  }

  // ---- absolute path map (old abs -> new abs) ---------------------------
  const oldRoot = normalizeFilePath(manifest.root);
  const pathMap = new Map<string, string>();
  const takenFiles = new Set(index.byPath.keys());
  const newFolders = new Map<string, string>(); // rel -> abs
  newFolders.set('', rootPath);
  pathMap.set(oldRoot, rootPath);
  for (const rel of manifest.folders) {
    if (!rel) continue;
    const abs = joinFilePath(rootPath, rel);
    newFolders.set(rel, abs);
    pathMap.set(joinFilePath(oldRoot, rel), abs);
  }

  // ---- file ids + paths -------------------------------------------------
  const remaps = new Map<string, string>();
  for (const [oldAbs, newAbs] of pathMap) {
    if (oldAbs !== newAbs) remaps.set(oldAbs, newAbs);
  }

  const claimedIds = new Set(index.byId.keys());
  const files: ScriptFile[] = manifest.files.map((entry) => {
    const rel = entry.path;
    let newAbs = joinFilePath(rootPath, rel);
    // File-name collision inside a merged folder: unique the file name.
    if (takenFiles.has(newAbs.toLowerCase())) {
      const dir = folderOfPath(newAbs);
      const base = fileName(newAbs);
      let candidate = '';
      for (let i = 2; ; i++) {
        candidate = `${base} ${i}`;
        if (!takenFiles.has(joinFilePath(dir, candidate).toLowerCase())) break;
      }
      newAbs = joinFilePath(dir, candidate);
    }
    takenFiles.add(newAbs.toLowerCase());
    const oldAbs = joinFilePath(oldRoot, rel);
    pathMap.set(oldAbs, newAbs);
    if (oldAbs !== newAbs) remaps.set(oldAbs, newAbs);
    // Folders implied by file paths exist even when the manifest omits them.
    let dirRel = folderOfPath(rel);
    while (dirRel && !newFolders.has(dirRel)) {
      newFolders.set(dirRel, joinFilePath(rootPath, dirRel));
      dirRel = folderOfPath(dirRel);
    }

    const taken = claimedIds.has(entry.id);
    const id = taken ? makeFileId() : entry.id;
    claimedIds.add(id);
    if (id !== entry.id) remaps.set(entry.id, id);
    return {
      id,
      path: newAbs,
      kind: entry.kind,
      ...(entry.role ? { role: entry.role } : {}),
      source: payload.sources[entry.entry] ?? '',
      updatedAt: entry.updatedAt ?? nowMs(),
    };
  });

  // ---- folder identities -------------------------------------------------
  const existingIds = new Set(Object.keys(doc.folderIds ?? {}));
  const folderIds: Record<string, string> = {};
  for (const [oldId, rel] of Object.entries(manifest.folderIds)) {
    const abs = newFolders.get(rel) ?? joinFilePath(rootPath, rel);
    if (isProtectedFolder(abs)) {
      // Pinned identities are implicit - never written into folderIds.
      continue;
    }
    const existing = doc.folderIds?.[oldId];
    const id =
      isReservedFolderId(oldId) ||
      (existingIds.has(oldId) && normalizeFilePath(existing ?? '') !== abs)
        ? makeFolderId()
        : oldId;
    if (id !== oldId) remaps.set(oldId, id);
    folderIds[id] = abs;
  }

  // ---- rewrite sources --------------------------------------------------
  for (const file of files) {
    file.source = rewriteArchiveRefs(file.source, remaps);
  }

  return {
    rootPath,
    folders: [...newFolders.values()],
    folderIds,
    files,
  };
};
