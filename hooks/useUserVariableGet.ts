import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { UserVariableRecord } from "./useUserVariable";

type PrimitiveIndexValue = string | number | boolean;

interface UseUserVariableGetOptions {
  key: string;
  searchFor?: string;
  filterFor?: PrimitiveIndexValue;
  userIds?: string[];
  returnTop?: number;
  startAfter?: string;
}

/**
 * Query accessible user variables by key.
 *
 * This hook is the "multi-user read" companion to `useUserVariable(...)`.
 *
 * It returns records for the requested `key`, but only if the current viewer is
 * allowed to see them.
 *
 * Access rules:
 *
 * - your own variable is always visible to you
 * - PUBLIC variables are visible to everyone
 * - whitelist variables are visible only to the owner and users in `allowList` 
 * - PRIVATE variables are visible only to the owner
 *
 * -----------------------------------------------------------------------------
 * Important mental model
 * -----------------------------------------------------------------------------
 *
 * `useUserVariable(...)` is:
 *
 * - "my one variable for this key"
 *
 * `useUserVariableGet(...)` is:
 *
 * - "many accessible users' variables for this key"
 *
 * -----------------------------------------------------------------------------
 * Search/filter behavior
 * -----------------------------------------------------------------------------
 *
 * All returned records are restricted by:
 *
 * - `key` (required)
 *
 * and optionally narrowed by:
 *
 * - `searchFor` 
 * - `filterFor` 
 * - `userIds` 
 * - `returnTop` 
 *
 * `searchFor` 
 * - full-text style search against the server-derived `searchValue` 
 *
 * `filterFor` 
 * - exact match against the server-derived `filterValue` 
 *
 * `userIds` 
 * - restricts the result set to those users
 * - only requested users are queried (subject to access checks)
 *
 * `returnTop` 
 * - maximum number of records returned
 *
 * -----------------------------------------------------------------------------
 * Sorting behavior
 * -----------------------------------------------------------------------------
 *
 * Records are ordered by stored `sortValue` descending.
 * Ties fall back to `lastModified` descending.
 *
 * This is important:
 *
 * - sorting is configured when the variable is written (`sortKey`)
 * - sorting is not chosen ad hoc on the getter
 *
 * If a specific screen wants a different final sort for display, it can re-sort
 * the returned array on the frontend.
 *
 * -----------------------------------------------------------------------------
 * Return shape
 * -----------------------------------------------------------------------------
 *
 * Each returned item contains the full stored record shape, including:
 *
 * - `id` 
 * - `_id` 
 * - `key` 
 * - `userToken` 
 * - `value` 
 * - `privacy` 
 * - `filterKey` 
 * - `filterValue` 
 * - `searchKeys` 
 * - `searchValue` 
 * - `sortKey` 
 * - `sortValue` 
 * - `createdAt` 
 * - `lastModified` 
 *
 * While the query is loading, the hook returns `undefined`.
 *
 * -----------------------------------------------------------------------------
 * Examples
 * -----------------------------------------------------------------------------
 *
 * 1. Get public/shared profiles
 *
 * ```ts
 * const profiles = useUserVariableGet<{
 *   username: string;
 *   name: string;
 * }>({
 *   key: "profile",
 *   returnTop: 20,
 * });
 * ```
 *
 * 2. Search profiles by username or name
 *
 * ```ts
 * const profiles = useUserVariableGet<{
 *   username: string;
 *   name: string;
 * }>({
 *   key: "profile",
 *   searchFor: "mala",
 *   returnTop: 20,
 * });
 * ```
 *
 * 3. Filter beans by color
 *
 * ```ts
 * const greenBeans = useUserVariableGet<{
 *   name: string;
 *   color: string;
 *   rating: number;
 * }>({
 *   key: "favoriteBean",
 *   filterFor: "Green",
 *   returnTop: 50,
 * });
 * ```
 *
 * 4. Restrict to a friend list
 *
 * ```ts
 * const friendProfiles = useUserVariableGet<{
 *   username: string;
 *   name: string;
 * }>({
 *   key: "profile",
 *   userIds: ["user_a", "user_b", "user_c"],
 *   returnTop: 50,
 * });
 * ```
 *
 * 5. Search within a friend list
 *
 * ```ts
 * const matchingFriends = useUserVariableGet<{
 *   username: string;
 *   name: string;
 * }>({
 *   key: "profile",
 *   userIds: ["user_a", "user_b", "user_c"],
 *   searchFor: "alice",
 *   returnTop: 10,
 * });
 * ```
 *
 * 6. Filter within a friend list
 *
 * ```ts
 * const greenFriendBeans = useUserVariableGet<{
 *   name: string;
 *   color: string;
 * }>({
 *   key: "favoriteBean",
 *   userIds: ["user_a", "user_b"],
 *   filterFor: "Green",
 *   returnTop: 10,
 * });
 * ```
 *
 * 7. Search + filter + userIds together
 *
 * ```ts
 * const results = useUserVariableGet<{
 *   username: string;
 *   name: string;
 *   role: string;
 * }>({
 *   key: "profile",
 *   userIds: ["user_a", "user_b", "user_c"],
 *   searchFor: "alice",
 *   filterFor: "admin",
 *   returnTop: 5,
 * });
 * ```
 */
export function useUserVariableGet<TValue = any>({
  key,
  searchFor,
  filterFor,
  userIds,
  returnTop,
  startAfter,
}: UseUserVariableGetOptions) {
  const results = useQuery(api.user_vars_get.search, {
    key,
    searchFor,
    filterFor,
    userIds,
    returnTop,
    startAfter,
  });

  return results as UserVariableRecord<TValue>[] | undefined;
}