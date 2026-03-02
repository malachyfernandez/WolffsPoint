/**
 * Central configuration for the user variable system.
 *
 * - Dev warnings: control console warnings for non-ideal paths.
 * - Timeouts: default timeout for optimistic writes.
 */

export const userVarConfig = {
    // === Dev Warnings ===
    // Master switch to enable/disable all dev warnings.
    devWarningsEnabled: true,

    // Warn when a setter call isn’t confirmed by the server within the timeout window.
    warnOnUserVarOpTimeout: true,

    // Log when the hook automatically rolls back an optimistic value to the last confirmed server value (due to timeout).
    logOnUserVarRollback: true,

    // Warn when the backend falls back to in-memory sorting because the requested sort key isn’t indexed.
    warnOnInMemoryValueSort: true,

    // Warn when the backend filters userIds in memory after fetching a broader result set.
    warnOnInMemoryUserIdsFilterInSearch: true,

    // Warn when using SORTED search mode (scans more rows, less scalable than RELEVANCE).
    warnOnSortedSearchMode: true,

    // === Timeouts ===
    // Default timeout (ms) for optimistic writes before rollback.
    // Can be overridden per-hook via the timeoutMs option.
    defaultTimeoutMs: 5000,
} as const;
