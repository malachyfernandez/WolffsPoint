import { useList } from '../hooks/useData';
import { useSharedListValue } from '../hooks/useSharedListValue';
import { displayModuleCapabilities } from './displayComposition';

/** Old records remain readable, but there is no longer a reversible legacy toggle. */
export const LEGACY_SYSTEMS_KEY = 'useLegacySystems';
export const CELL_MODULE_VERSION_KEY = 'cellModuleVersion';
export const CELL_MODULE_VERSION = 1;
export const DISPLAY_MODULE_VERSION = 2;

export const useCellModuleStatus = (gameId: string | undefined) => {
  const [record] = useList<number>(CELL_MODULE_VERSION_KEY, gameId ?? '', {
    defaultValue: 0,
    privacy: 'PUBLIC',
    enabled: !!gameId,
  });
  return {
    ...displayModuleCapabilities(record?.value),
    loading: !!gameId && (!record || record.state.isSyncing),
  };
};

/**
 * Player-facing variant: the version marker lives on the operator's account,
 * so player pages read it through the shared-record seam (same `userIds` list
 * they use for the operator-owned scriptFiles doc).
 */
export const useSharedCellModuleStatus = (
  gameId: string | undefined,
  userIds?: string[]
) => {
  const { value, isLoading } = useSharedListValue<number>({
    key: CELL_MODULE_VERSION_KEY,
    itemId: gameId ?? '',
    defaultValue: 0,
    userIds,
  });
  return {
    ...displayModuleCapabilities(value),
    loading: !!gameId && isLoading,
  };
};
