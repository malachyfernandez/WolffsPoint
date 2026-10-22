import { useMemo } from 'react';
import { useList } from './useData';
import { buildFileDiagnostics } from '../utils/fileDiagnostics';
import type { ScriptFilesIndex } from '../utils/scriptFiles';
import type { UserTableTitle } from '../types/playerTable';

/**
 * Cross-file diagnostics: fileId → problem messages for every file in the
 * index, including errors caused by edits to OTHER files (deleted/renamed/
 * role-flipped references, dropped input contract entries, unknown tags,
 * include cycles) and table-column changes.
 *
 * Rebuilds on index/title changes only; parsing is fully cached upstream so
 * a rebuild walks statements but never re-parses unchanged sources.
 */
export const useFileDiagnostics = (
  gameId: string | null | undefined,
  index: ScriptFilesIndex
): Map<string, string[]> => {
  const [userTableTitle] = useList<UserTableTitle>('userTableTitle', gameId ?? '');
  const titles = userTableTitle?.scheduledUpdate?.value ?? userTableTitle?.value;
  return useMemo(() => buildFileDiagnostics(index, titles), [index, titles]);
};
