import { useGlobalVariable } from './useGlobalVariable';
import { CLIENT_VERSION, LATEST_VERSION_GLOBAL_KEY } from '../utils/appVersion';

interface AppVersionStatus {
  /** The version baked into the currently running client bundle. */
  clientVersion: number;
  /** The newest released version according to the server (null if never set). */
  latestVersion: number | null;
  /** True when the server reports a newer version than this client is running. */
  isOutdated: boolean;
}

/**
 * Subscribes to the server-side `latestClientVersion` global and compares it to
 * the bundled `CLIENT_VERSION`.
 *
 * While the global is loading (or if it has never been set) the client is
 * treated as up-to-date, so the notice never flashes on app start.
 */
export function useAppVersionStatus(): AppVersionStatus {
  const [latestVersion] = useGlobalVariable<number>(LATEST_VERSION_GLOBAL_KEY);

  const isOutdated = typeof latestVersion === 'number' && latestVersion > CLIENT_VERSION;

  return {
    clientVersion: CLIENT_VERSION,
    latestVersion: typeof latestVersion === 'number' ? latestVersion : null,
    isOutdated,
  };
}
