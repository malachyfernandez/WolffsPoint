import { userVarConfig } from "./userVarConfig";

export type DevWarningKey =
    | "sorted_search_mode"
    | "in_memory_value_sort"
    | "in_memory_userIds_filter_in_search"
    | "uservar_op_timeout"
    | "uservar_rollback";

export function devWarn(key: DevWarningKey, message: string) {
    if (!userVarConfig.devWarningsEnabled) return;

    const configPath = "utils/userVarConfig.ts";

    if (key === "sorted_search_mode" && !userVarConfig.warnOnSortedSearchMode) return;
    if (key === "in_memory_value_sort" && !userVarConfig.warnOnInMemoryValueSort) return;
    if (key === "in_memory_userIds_filter_in_search" && !userVarConfig.warnOnInMemoryUserIdsFilterInSearch) return;
    if (key === "uservar_op_timeout" && !userVarConfig.warnOnUserVarOpTimeout) return;
    if (key === "uservar_rollback" && !userVarConfig.logOnUserVarRollback) return;

    console.warn(`[BeanJar Dev Warning:${key}] ${message} (disable/edit: ${configPath})`);
}
