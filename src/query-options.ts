import { inject } from 'vue'
import type { InjectionKey, MaybeRefOrGetter } from 'vue'
import type { EntryKey } from './entry-keys'
import type { ErrorDefault, QueryMeta } from './types-extension'
import type { UseQueryEntry } from './query-store'

/**
 * Possible values for `refetchOnMount`, `refetchOnWindowFocus`, and `refetchOnReconnect`.
 * `true` refetches if data is stale (calles `refresh()`), `false` never refetches, `'always'` always refetches.
 */
export type RefetchOnControl = boolean | 'always'

/**
 * Options for queries that can be globally overridden.
 */
export interface UseQueryOptionsGlobal {
  /**
   * Whether the query should be enabled or not. If `false`, the query will not
   * be executed until `refetch()` or `refresh()` is called. If it becomes
   * `true`, the query will be refreshed.
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Time in ms after which the data is considered stale and will be refreshed
   * on next read.
   *
   * @default 5000 (5 seconds)
   */
  staleTime?: number

  /**
   * Time in ms after which, once the data is no longer being used, it will be
   * garbage collected to free resources. Set to `false` to disable garbage
   * collection.
   *
   * @default 300_000 (5 minutes)
   */
  gcTime?: number | false

  /**
   * Whether to refetch the query when the component is mounted.
   * @default true
   */
  refetchOnMount?: MaybeRefOrGetter<RefetchOnControl>

  /**
   * Whether to refetch the query when the window regains focus.
   * @default true
   */
  refetchOnWindowFocus?: MaybeRefOrGetter<RefetchOnControl>

  /**
   * Whether to refetch the query when the network reconnects.
   * @default true
   */
  refetchOnReconnect?: MaybeRefOrGetter<RefetchOnControl>

  /**
   * A placeholder data that is initially shown while the query is loading for
   * the first time. This will also show the `status` as `success` until the
   * query finishes loading (no matter the outcome of the query). Note: unlike
   * with `initialData`, the placeholder does not change the cache state.
   */
  placeholderData?: (previousData: unknown) => any // any allows us to not worry about the types when merging options

  /**
   * Whether to catch errors during SSR (onServerPrefetch) when the query fails.
   * @default false
   */
  ssrCatchError?: boolean
}

/**
 * Context object passed to the `query` function of `useQuery()`.
 * @see {@link UseQueryOptions}
 */
export interface UseQueryFnContext<
  TData = unknown,
  TError = unknown,
  // allows for UseQueryEntry to have unknown everywhere (generic version)
  TDataInitial extends TData | undefined = unknown extends TData ? unknown : undefined,
  >
  {
  /**
   * `AbortSignal` instance attached to the query call. If the call becomes
   * outdated (e.g. due to a new call with the same key), the signal will be
   * aborted.
   */
  signal: AbortSignal

  /**
   * The query entry associated with the current query.
   */
  entry: UseQueryEntry<TData, TError, TDataInitial>
}

/**
 * Type-only symbol to keep the type
 *
 * @internal
 */
export declare const tErrorSymbol: unique symbol

/**
 * Options for `useQuery()`. Can be extended by plugins.
 *
 * @example
 * ```ts
 * // use-query-plugin.d.ts
 * export {} // needed
 * declare module '@pinia/colada' {
 *   interface UseQueryOptions {
 *     // Whether to refresh the data when the component is mounted.
 *     refreshOnMount?: boolean
 *   }
 * }
 * ```
 */
export interface UseQueryOptions<
  TData = unknown,
  // eslint-disable-next-line unused-imports/no-unused-vars
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
> extends Pick<
  UseQueryOptionsGlobal,
  | 'gcTime'
  | 'enabled'
  | 'refetchOnMount'
  | 'refetchOnReconnect'
  | 'refetchOnWindowFocus'
  | 'staleTime'
  | 'ssrCatchError'
> {
  /**
   * The key used to identify the query. Array of primitives **without**
   * reactive values or a reactive array or getter. It should be treaded as an
   * array of dependencies of your queries, e.g. if you use the
   * `route.params.id` property, it should also be part of the key:
   *
   * ```ts
   * import { useRoute } from 'vue-router'
   * import { useQuery } from '@pinia/colada'
   *
   * const route = useRoute()
   * const { data } = useQuery({
   *   // pass a getter function (or computed, ref, etc.) to ensure reactivity
   *   key: () => ['user', route.params.id],
   *   query: () => fetchUser(route.params.id),
   * })
   * ```
   */
  key: MaybeRefOrGetter<EntryKey>

  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
  query: (context: UseQueryFnContext) => Promise<TData>

  /**
   * The data which is initially set to the query while the query is loading
   * for the first time. Note: unlike with {@link placeholderData}, setting the
   * initial data changes the state of the query (it will be set to `success`).
   *
   * @see {@link placeholderData}
   */
  initialData?: () => TDataInitial

  /**
   * The timestamp (in milliseconds) when the initial data was last updated.
   * This determines the staleness of the {@link initialData}. If not provided,
   * defaults to `Date.now()` when initial data is set.
   *
   * @default Date.now() when {@link initialData} is used
   *
   * @example
   * ```ts
   * // Using a static timestamp
   * useQuery({
   *   key: ['user'],
   *   query: () => fetchUser(),
   *   initialData: () => cachedUser,
   *   initialDataUpdatedAt: 1234567890000
   * })
   *
   * // Using a function
   * useQuery({
   *   key: ['user'],
   *   query: () => fetchUser(),
   *   initialData: () => cachedUser,
   *   initialDataUpdatedAt: () => Number(localStorage.getItem('userTimestamp'))
   * })
   * ```
   */
  initialDataUpdatedAt?: number | (() => number)

  /**
   * A placeholder data that is initially shown while the query is loading for
   * the first time. This will also show the `status` as `success` until the
   * query finishes loading (no matter the outcome of the query). Note: unlike
   * with {@link initialData}, the placeholder does not change the cache state.
   *
   * @see {@link initialData}
   */
  placeholderData?:
    | NoInfer<TDataInitial>
    | NoInfer<TData>
    // NOTE: the generic here allows to make UseQueryOptions<T> assignable to UseQueryOptions<unknown>
    // https://www.typescriptlang.org/play/?#code/JYOwLgpgTgZghgYwgAgPIAczAPYgM4A8AKsgLzICuIA1iNgO4gB8yA3gFDLICOAXMgAoAlGRYAFKNgC2wPBGJNOydAH5eSrgHpNyABZwAbqADmyMLpRwoxilIjhkAIygQ41PMmBgNyAD6CBdBcjbAo8ABE4MDh+ADlsAEkQGGgFP0oQABMIGFAITJFSFniklKgFIR9tZCJdWWQDaDwcEGR6bCh3Kp1-AWISCAAPSCyPIiZA4JwwyOj+IhJ-KmzckHzCliJKgF92dlBIWEQUAFFwKABPYjIM2gZmNiVsTBa8fgwsXEJx9JAKABt-uxduwYFQEJ9WggAPr2MCXBQCZ6Qt5oF5fNL+P6AoT8M7wq4-DhcFxgChQVqsZDI17IXa7BBfMDIDzkNb0ZAAZQgYAI+MuE0qeAAdHBMpkBDC4ZcBMSuDx+HA8BcQAhBBtkAAWABMABofOh+AIQBrWgBCNkA-7IFTIVoAKmQ2uQ-E1wKElSAA
    | (<T extends TData>(
        previousData: T | undefined,
      ) => NoInfer<TDataInitial> | NoInfer<TData> | undefined)

  /**
   * Meta information associated with the query. Can be a raw object, a function
   * returning the meta object, or a ref containing the meta object.
   * The meta is resolved when the entry is **created** and stored in
   * `entry.meta`.
   *
   * **Note**: Meta is serialized during SSR, so it must be serializable (no functions,
   * class instances, or circular references). You can also completely ignore
   * it during SSR with a ternary: `meta: import.meta.ev.SSR ? {} : actualMeta`
   *
   * @example
   * ```ts
   * // SSR-safe: simple serializable data
   * useQuery({
   *   key: ['user', id],
   *   query: () => fetchUser(id),
   *   meta: { errorMessage: true }
   * })
   *
   * // Using a function to compute meta
   * useQuery({
   *   key: ['user', id],
   *   query: () => fetchUser(id),
   *   meta: () => ({ timestamp: Date.now() })
   * })
   *
   * // Skipping meta during SSR
   * useQuery({
   *   key: ['user', id],
   *   query: () => fetchUser(id),
   *   meta: {
   *     onError: import.meta.env.SSR ? undefined : ((err) => console.log('error'))
   *   }
   * })
   * ```
   */
  meta?: MaybeRefOrGetter<QueryMeta>

  /**
   * Ghost property to ensure TError generic parameter is included in the
   * interface structure. This property should never be used directly and is
   * only for type system correctness. it could be removed in the future if the
   * type can be inferred in any other way.
   *
   * @internal
   */
  readonly [tErrorSymbol]?: TError
}

/**
 * Default options for `useQuery()`. Modifying this object will affect all the queries that don't override these
 */
export const USE_QUERY_DEFAULTS = {
  staleTime: 1000 * 5, // 5 seconds
  gcTime: (1000 * 60 * 5) as NonNullable<UseQueryOptions['gcTime']>, // 5 minutes
  // avoid type narrowing to `true`
  refetchOnWindowFocus: true as NonNullable<UseQueryOptions['refetchOnWindowFocus']>,
  refetchOnReconnect: true as NonNullable<UseQueryOptions['refetchOnReconnect']>,
  refetchOnMount: true as NonNullable<UseQueryOptions['refetchOnMount']>,
  enabled: true as MaybeRefOrGetter<boolean>,
} satisfies UseQueryOptionsGlobal

export type UseQueryOptionsWithDefaults<
  TData = unknown,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
> = UseQueryOptions<TData, TError, TDataInitial> & typeof USE_QUERY_DEFAULTS

/**
 * Global default options for `useQuery()`.
 * @internal
 */
export type UseQueryOptionsGlobalDefaults = Pick<
  UseQueryOptionsGlobal,
  | 'gcTime'
  | 'enabled'
  | 'refetchOnMount'
  | 'refetchOnReconnect'
  | 'refetchOnWindowFocus'
  | 'staleTime'
  | 'ssrCatchError'
> &
  typeof USE_QUERY_DEFAULTS

export const USE_QUERY_OPTIONS_KEY: InjectionKey<UseQueryOptionsGlobalDefaults> =
  process.env.NODE_ENV !== 'production' ? Symbol('useQueryOptions') : Symbol()

/**
 * Injects the global query options.
 *
 * @internal
 */
export const useQueryOptions = (): UseQueryOptionsGlobalDefaults =>
  inject(USE_QUERY_OPTIONS_KEY, USE_QUERY_DEFAULTS)
