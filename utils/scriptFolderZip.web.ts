import JSZip from 'jszip';
import type { ScriptFilesDoc } from './scriptFiles';
import {
  buildFolderArchive,
  FOLDER_ARCHIVE_MANIFEST,
  parseFolderArchiveManifest,
  type FolderArchivePayload,
} from './scriptFolderArchive';

/** Build + download `<folder>.zip` holding the folder's whole subtree. */
export const downloadFolderZip = async (doc: ScriptFilesDoc, folder: string): Promise<string> => {
  const { manifest, sources } = buildFolderArchive(doc, folder);
  const zip = new JSZip();
  zip.file(FOLDER_ARCHIVE_MANIFEST, JSON.stringify(manifest, null, 2));
  for (const [entry, source] of Object.entries(sources)) {
    zip.file(entry, source);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${manifest.name.replace(/\s+/g, '_')}.folder.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return manifest.name;
};

/** Open the OS file picker for a folder-archive zip. Null = cancelled. */
export const pickFolderZipFile = (): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip,application/x-zip-compressed';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });

/** Read + validate a folder-archive zip into an import payload. */
export const readFolderZip = async (file: File): Promise<FolderArchivePayload> => {
  const zip = await JSZip.loadAsync(file);
  const manifestEntry = zip.file(FOLDER_ARCHIVE_MANIFEST);
  if (!manifestEntry) {
    throw new Error(`Not a Wolffspoint folder archive: missing ${FOLDER_ARCHIVE_MANIFEST}`);
  }
  const manifest = parseFolderArchiveManifest(JSON.parse(await manifestEntry.async('string')));
  const sources: Record<string, string> = {};
  const missing: string[] = [];
  for (const entry of manifest.files) {
    const zipEntry = zip.file(entry.entry);
    if (!zipEntry) {
      missing.push(entry.path);
      continue;
    }
    sources[entry.entry] = await zipEntry.async('string');
  }
  if (missing.length) {
    throw new Error(`Folder archive is missing ${missing.length} file(s): ${missing.join(', ')}`);
  }
  return { manifest, sources };
};

export type { FolderArchivePayload };
