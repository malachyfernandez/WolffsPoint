

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { devWarn } from "../utils/devWarnings";
import { userVarConfig } from "../utils/userVarConfig";

// Frontend privacy shape: PUBLIC, PRIVATE, or whitelist of userIds
type Privacy = "PUBLIC" | "PRIVATE" | string[];

type SyncState = {
    isSyncing: boolean;
    lastOpStatus?: "idle" | "pending" | "confirmed" | "timed_out";
    lastOpStartedAt?: number;
    lastOpTimedOutAt?: number;
};

type ObjectKeys<T> = T extends object ? Extract<keyof T, string> : never;

// Rich bean value exposed to the UI
export type UserVariableResult<T> = {
    value: T;
    confirmedValue?: T;
    lastModified?: number;
    timeCreated?: number;
    userId?: string;
    state: SyncState;
};

export type OptimisticTimeoutBehavior = "reset" | "keep";

export type UserVarOpStatusInfo<T> = {
    key: string;
    status: "pending" | "confirmed" | "timed_out";
    optimisticValue: T;
    lastConfirmedValue: T | undefined;
    msSinceSet: number;
};


/**
 * **User Variable Hook**
 *
 * This acts just like `useState`, but it saves the data to the database so it persists
 * across reloads and devices.
 *
 * ---
 * ### Examples
 *
 * **1. Simple: Reading & Writing your own data**
 * ```ts
 * const [myCount, setMyCount] = useUserVariable<number>({
 *   key: "count",
 *   defaultValue: 0,
 * });
 *
 * myCount.value
 * myCount.lastModified
 * myCount.timeCreated
 * myCount.userId
 * myCount.state.isSyncing
 *
 * setMyCount(123);
 * ```
 *
 * **2. Public profile + searchable fields**
 * ```ts
 * type UserData = { username: string; name: string };
 *
 * const [profile, setProfile] = useUserVariable<UserData>({
 *   key: "profile",
 *   privacy: "PUBLIC",
 *   searchKeys: ["username", "name"],
 * });
 *
 * setProfile({ username: "malachy", name: "Malachy" });
 * ```
 *
 * **3. Filterable variables**
 * ```ts
 * type Bean = { name: string; description: string; color: string };
 *
 * const [bean, setBean] = useUserVariable<Bean>({
 *   key: "beans",
 *   privacy: "PUBLIC",
 *   filterKey: "color",
 *   searchKeys: ["name", "description"],
 * });
 * ```
 *
 * Notes:
 * - For performance warnings (searchMode=SORTED, in-memory filtering, etc.) edit `utils/devWarningsConfig.ts`.
 * - Writes are optimistic. If a write is not confirmed by the server after `timeoutMs` (default 5000), the hook will
 *   warn and (by default) auto-reset `value` to the last confirmed server value.
 *
 * ---
 * @template T - The type of data to store (number, string, object, etc).
 * @param key - A unique name for this variable.
 * @param defaultValue - The value to use while loading or if the variable doesn't exist yet.
 * @param options - Settings for privacy, searching, filtering, and other server-backed behavior.
 */
export function useUserVariable<T>({
    key,
    defaultValue,
    privacy = "PRIVATE",
    filterKey,
    searchKeys,
    filterString,
    searchString,
    timeoutMs = userVarConfig.defaultTimeoutMs,
    optimisticTimeoutBehavior = "reset",
    onOpStatusChange,
}: {
    key: string;
    defaultValue?: T;
    privacy?: Privacy;
    filterKey?: ObjectKeys<T>;
    searchKeys?: ObjectKeys<T>[];
    filterString?: string;
    searchString?: string;
    sortKey?: "PROPERTY_LAST_MODIFIED" | "PROPERTY_TIME_CREATED";
    /**
     * How long (ms) to wait for a setter call to be confirmed by the server before timing out.
     * Default 5000.
     */
    timeoutMs?: number;
    /**
     * What to do when a write times out.
     * - "reset" (default): auto-reset the optimistic value back to the last confirmed server value.
     * - "keep": keep showing the optimistic value.
     */
    optimisticTimeoutBehavior?: OptimisticTimeoutBehavior;
    /**
     * Called when a setter transitions to pending/confirmed/timed_out.
     */
    onOpStatusChange?: (info: UserVarOpStatusInfo<T>) => void;
}): [UserVariableResult<T>, (newValue: T) => void] {
    const record = useQuery(api.user_vars.get, { key });

    const isSyncing = record === undefined;

    const [confirmedValue, setConfirmedValue] = useState<T | undefined>(undefined);
    const confirmedValueRef = useRef<T | undefined>(undefined);
    const [opState, setOpState] = useState<{
        lastOpStatus: SyncState["lastOpStatus"];
        lastOpStartedAt?: number;
        lastOpTimedOutAt?: number;
    }>({ lastOpStatus: "idle" });

    const pendingOpRef = useRef<{
        id: number;
        startedAt: number;
        optimisticValue: T;
        timeoutHandle: ReturnType<typeof setTimeout> | null;
        hasTimedOut: boolean;
    } | null>(null);
    const opIdRef = useRef(0);

    const baseValue: T = isSyncing
        ? (defaultValue as T)
        : ((record?.value ?? defaultValue) as T);

    const lastModified = record?.lastModified as number | undefined;
    const timeCreated = (record as any)?.createdAt as number | undefined;
    const userId = (record as any)?.userToken as string | undefined;

    useEffect(() => {
        if (record === undefined) return;
        if (record === null) return;

        // IMPORTANT: Convex optimistic updates also update the query result.
        // We should not treat those as "server confirmed".
        // So we only update the confirmedValue snapshot when there is no pending write.
        if (pendingOpRef.current) return;

        const next = (record as any)?.value as T;
        confirmedValueRef.current = next;
        setConfirmedValue(next);
    }, [record]);

    const shouldAutoResetOnTimeout = optimisticTimeoutBehavior === "reset";
    const value: T =
        shouldAutoResetOnTimeout && opState.lastOpStatus === "timed_out"
            ? ((confirmedValue ?? defaultValue) as T)
            : baseValue;

    // Log rollback when we actually revert the UI value
    useEffect(() => {
        if (!shouldAutoResetOnTimeout) return;
        if (opState.lastOpStatus !== "timed_out") return;
        if (!opState.lastOpTimedOutAt) return;
        if (!confirmedValueRef.current) return;
        devWarn(
            "uservar_rollback",
            `Rolled back key="${key}" to last confirmed value after timeout. ` +
            `Optimistic value was not saved.`
        );
    }, [opState.lastOpStatus, opState.lastOpTimedOutAt, key, shouldAutoResetOnTimeout]);

    const didAutoCreateRef = useRef(false);

    const setMutation = useMutation(api.user_vars.set)
        .withOptimisticUpdate((localStore, args) => {
            const existing = localStore.getQuery(api.user_vars.get, { key }) as any;
            const now = Date.now();
            localStore.setQuery(api.user_vars.get, { key }, {
                ...(existing ?? {}),
                key,
                value: args.value,
                lastModified: now,
                createdAt: existing?.createdAt ?? now,
                privacy: args.privacy,
                filterKey: args.filterKey,
                searchKeys: args.searchKeys,
            });
        });

    const setValue = (newValue: T) => {
        const startedAt = Date.now();
        const opId = (opIdRef.current += 1);

        const existingPending = pendingOpRef.current;
        if (existingPending?.timeoutHandle) clearTimeout(existingPending.timeoutHandle);

        setOpState({ lastOpStatus: "pending", lastOpStartedAt: startedAt, lastOpTimedOutAt: undefined });
        onOpStatusChange?.({
            key,
            status: "pending",
            optimisticValue: newValue,
            lastConfirmedValue: confirmedValueRef.current,
            msSinceSet: 0,
        });

        // Map frontend privacy to backend format
        const backendPrivacy = Array.isArray(privacy)
            ? { allowList: privacy }
            : privacy;

        const effectiveFilterKey = filterKey ?? ((record as any)?.filterKey as string | undefined);
        const effectiveSearchKeys = searchKeys ?? ((record as any)?.searchKeys as string[] | undefined);

        const timeoutHandle = setTimeout(() => {
            const pending = pendingOpRef.current;
            if (!pending) return;
            if (pending.id !== opId) return;

            const msSinceSet = Date.now() - startedAt;
            devWarn(
                "uservar_op_timeout",
                `Setter for key="${key}" has not been confirmed after ${msSinceSet}ms (timeoutMs=${timeoutMs}). ` +
                    `ResetBehavior=${optimisticTimeoutBehavior}.`
            );

            // Mark this op as timed out so we don’t re-apply it later on reconnection
            pending.hasTimedOut = true;

            setOpState({ lastOpStatus: "timed_out", lastOpStartedAt: startedAt, lastOpTimedOutAt: Date.now() });
            onOpStatusChange?.({
                key,
                status: "timed_out",
                optimisticValue: newValue,
                lastConfirmedValue: confirmedValueRef.current,
                msSinceSet,
            });

            if (optimisticTimeoutBehavior === "reset") {
                return;
            }
        }, timeoutMs);

        pendingOpRef.current = {
            id: opId,
            startedAt,
            optimisticValue: newValue,
            timeoutHandle,
            hasTimedOut: false,
        };

        const p = setMutation({
            key,
            value: newValue,
            privacy: backendPrivacy,
            filterKey: effectiveFilterKey,
            searchKeys: effectiveSearchKeys,
            filterString,
            searchString,
        });

        Promise.resolve(p)
            .then(() => {
                const pending = pendingOpRef.current;
                if (!pending) return;
                if (pending.id !== opId) return;
                if (pending.timeoutHandle) clearTimeout(pending.timeoutHandle);
                // If this operation already timed out, do NOT apply the optimistic value on reconnection
                if (pending.hasTimedOut) {
                    pendingOpRef.current = null;
                    return;
                }
                pendingOpRef.current = null;
                confirmedValueRef.current = newValue;
                setConfirmedValue(newValue);
                setOpState({ lastOpStatus: "confirmed" });
                onOpStatusChange?.({
                    key,
                    status: "confirmed",
                    optimisticValue: newValue,
                    lastConfirmedValue: newValue,
                    msSinceSet: Date.now() - startedAt,
                });
            })
            .catch(() => {
                const pending = pendingOpRef.current;
                if (!pending) return;
                if (pending.id !== opId) return;
                if (pending.timeoutHandle) clearTimeout(pending.timeoutHandle);
                pendingOpRef.current = null;
            });
    };

    useEffect(() => {
        if (didAutoCreateRef.current) return;
        if (record !== null) return;
        if (defaultValue === undefined) return;
        didAutoCreateRef.current = true;
        setValue(defaultValue as T);
    }, [record, defaultValue]);

    useEffect(() => {
        return () => {
            const pending = pendingOpRef.current;
            if (pending?.timeoutHandle) clearTimeout(pending.timeoutHandle);
            pendingOpRef.current = null;
        };
    }, []);

    return [
        {
            value,
            confirmedValue,
            lastModified,
            timeCreated,
            userId,
            state: {
                isSyncing,
                lastOpStatus: opState.lastOpStatus,
                lastOpStartedAt: opState.lastOpStartedAt,
                lastOpTimedOutAt: opState.lastOpTimedOutAt,
            },
        },
        setValue,
    ];
}