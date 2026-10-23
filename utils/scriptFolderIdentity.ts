import type { ScriptFilesDoc } from './scriptFiles';
import { nowMs } from './simNow';

export const PINNED_FOLDER_PATHS = [
  'roleMessage',
  'voteMessage',
  'morningMessage',
  'aboutRole',
  'tags',
] as const;

export const ABOUT_ROLE_FOLDER = 'aboutRole';

const pinnedIds: Readonly<Record<string, string>> = {
  rolemessage: 'folder_role_message',
  votemessage: 'folder_vote_message',
  morningmessage: 'folder_morning_message',
  aboutrole: 'folder_about_role',
  tags: 'folder_tags',
};

const normalize = (path: string) =>
  path
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');

export interface FolderIdentityIndex {
  byId: Map<string, string>;
  byPath: Map<string, string>;
  issues: string[];
}

/** Indexing old documents is read-only. Only explicit writes adopt ordinary folders. */
export const buildFolderIdentityIndex = (
  folders: string[],
  metadata: ScriptFilesDoc['folderIds']
): FolderIdentityIndex => {
  const paths = new Map(folders.map((path) => [normalize(path).toLowerCase(), normalize(path)]));
  const byId = new Map<string, string>();
  const byPath = new Map<string, string>();
  const issues: string[] = [];
  for (const path of PINNED_FOLDER_PATHS) {
    const id = pinnedIds[path.toLowerCase()];
    byId.set(id, path);
    byPath.set(path.toLowerCase(), id);
  }

  const candidates = new Map<string, string[]>();
  for (const [id, value] of Object.entries(metadata ?? {})) {
    if (!/^folder_[a-zA-Z0-9_-]+$/.test(id) || typeof value !== 'string' || !normalize(value)) {
      issues.push(`Invalid folder identity: ${id}`);
      continue;
    }
    const path = normalize(value);
    const lower = path.toLowerCase();
    const reservedPath = PINNED_FOLDER_PATHS.find((entry) => pinnedIds[entry.toLowerCase()] === id);
    if (reservedPath || pinnedIds[lower]) {
      if (pinnedIds[lower] !== id) issues.push(`Invalid pinned folder identity: ${id}`);
      continue;
    }
    if (!paths.has(lower)) {
      issues.push(`Missing folder for identity: ${id}`);
      continue;
    }
    const ids = candidates.get(lower) ?? [];
    ids.push(id);
    candidates.set(lower, ids);
  }
  for (const [lower, ids] of candidates) {
    if (ids.length !== 1) {
      issues.push(`Ambiguous folder identity: ${paths.get(lower)}`);
      continue;
    }
    byId.set(ids[0], paths.get(lower)!);
    byPath.set(lower, ids[0]);
  }
  return { byId, byPath, issues };
};

export const makeFolderId = (): string =>
  `folder_${nowMs().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/** Reserved ids belong to the pinned top-level folders only - adopting one
 *  for an ordinary folder is rejected by `buildFolderIdentityIndex`. */
export const isReservedFolderId = (id: string): boolean =>
  (Object.values(pinnedIds) as string[]).includes(id);

/** Assign IDs on an explicit mutation, preserving all previously assigned IDs. */
export const adoptFolderIdentities = (
  doc: ScriptFilesDoc,
  folders: string[],
  createId: () => string = makeFolderId
): ScriptFilesDoc => {
  const index = buildFolderIdentityIndex(folders, doc.folderIds);
  if (index.issues.length) throw new Error(index.issues.join('; '));
  const folderIds = { ...doc.folderIds };
  for (const path of folders) {
    const normalized = normalize(path);
    if (!normalized) continue;
    const known = index.byPath.get(normalized.toLowerCase());
    const id = known ?? createId();
    if (!known) {
      // An injected/test ID generator must not alias another identity.
      if (!/^folder_[a-zA-Z0-9_-]+$/.test(id) || id in folderIds || index.byId.has(id)) {
        throw new Error(`Duplicate or invalid new folder identity: ${id}`);
      }
      index.byPath.set(normalized.toLowerCase(), id);
      index.byId.set(id, normalized);
    }
    folderIds[id] = index.byId.get(id) ?? normalized;
  }
  // Adopted implied folders become explicit so moving their final file doesn't
  // accidentally delete the folder identity.
  const explicit = new Map(
    [...doc.folders, ...folders].map((path) => [normalize(path).toLowerCase(), normalize(path)])
  );
  const nextFolders = [...explicit.values()].filter(Boolean);
  if (
    JSON.stringify(folderIds) === JSON.stringify(doc.folderIds) &&
    JSON.stringify(nextFolders) === JSON.stringify(doc.folders)
  )
    return doc;
  return { ...doc, folders: nextFolders, folderIds };
};

export const repathFolderIdentities = (
  doc: ScriptFilesDoc,
  oldPath: string,
  newPath: string
): ScriptFilesDoc['folderIds'] =>
  doc.folderIds
    ? Object.fromEntries(
        Object.entries(doc.folderIds).map(([id, path]) => {
          const normalized = normalize(path);
          const lower = normalized.toLowerCase();
          const old = normalize(oldPath).toLowerCase();
          return [
            id,
            lower === old
              ? normalize(newPath)
              : lower.startsWith(`${old}/`)
                ? `${normalize(newPath)}/${normalized.slice(old.length + 1)}`
                : path,
          ];
        })
      )
    : undefined;

export const withoutFolderIdentities = (
  doc: ScriptFilesDoc,
  folder: string
): ScriptFilesDoc['folderIds'] => {
  if (!doc.folderIds) return undefined;
  const lower = normalize(folder).toLowerCase();
  return Object.fromEntries(
    Object.entries(doc.folderIds).filter(([, path]) => {
      const candidate = normalize(path).toLowerCase();
      return candidate !== lower && !candidate.startsWith(`${lower}/`);
    })
  );
};
