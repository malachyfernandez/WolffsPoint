import type { ScriptFilesDoc } from './scriptFiles';
import type { FolderArchivePayload } from './scriptFolderArchive';

/** Folder zip download is web-only; the native stub is never reached because
 *  the context-menu items are gated on Platform.OS === 'web'. */
export const downloadFolderZip = async (_doc: ScriptFilesDoc, _folder: string): Promise<string> => {
  throw new Error('Folder download is only available on web');
};

export const pickFolderZipFile = (): Promise<File | null> => Promise.resolve(null);

export const readFolderZip = async (_file: File): Promise<FolderArchivePayload> => {
  throw new Error('Folder import is only available on web');
};

export type { FolderArchivePayload };
