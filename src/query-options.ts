import { type InjectionKey, type MaybeRefOrGetter, inject } from 'vue'
import type { EntryNodeKey } from './tree-map'
import type { _ObjectFlat } from './utils'
import type { QueryPluginOptions } from './query-plugin'

/**
 * `true` refetch if data is stale (refresh()), `false` never refetch, 'always' always refetch.
 */
export type _RefetchOnControl = boolean | 'always'

/**
 * Symbol used to attach a data type to a `UseQueryKey`. It's never actually used, it's just for types.
 */
const DATA_TYPE_SYMBOL = Symbol()

/**
 * Key used to identify a query. Always an array.
 */
export type UseQueryKey = Array<EntryNodeKey | _ObjectFlat>

/**
 * Key used to identify a query with a specific data type.
 * @internal
 */
export type _UseQueryKeyWithDataType<T> = UseQueryKey & {
  /**
   * Attach a data type to a key to infer the type of the data solely from the key.
   * @see {@link InferUseQueryKeyData}
   *
   * @internal
   */
  [DATA_TYPE_SYMBOL]: T
}

// export type UseQueryKey<T = unknown> = Array<EntryNodeKey | _ObjectFlat> & {
//   /**
//    * Attach a data type to a key to infer the type of the data solely from the key.
//    * @see {@link InferUseQueryKeyData}
//    *
//    * @internal
//    */
//   [DATA_TYPE_SYMBOL]?: T
// }

/**
 * Infer the data type from a `UseQueryKey` if possible. Falls back to `unknown`.
 */
export type InferUseQueryKeyData<Key> =
  Key extends Record<typeof DATA_TYPE_SYMBOL, infer T> ? T : unknown

/**
 * Context object passed to the `query` function of `useQuery()`.
 * @see {@link UseQueryOptions}
 */
export interface UseQueryFnContext {
  /**
   * `AbortSignal` instance attached to the query call. If the call becomes outdated (e.g. due to a new call with the
   * same key), the signal will be aborted.
   */
  signal: AbortSignal
}

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
export interface UseQueryOptions<TResult = unknown> {
  /**
   * The key used to identify the query. Array of primitives **without** reactive values or a reactive array or getter.
   * It should be treaded as an array of dependencies of your queries, e.g. if you use the `route.params.id` property,
   * it should also be part of the key:
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
  key: MaybeRefOrGetter<UseQueryKey>

  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
  query: (context: UseQueryFnContext) => Promise<TResult>

  /**
   * Time in ms after which the data is considered stale and will be refreshed on next read
   */
  staleTime?: number

  /**
   * Time in ms after which, once the data is no longer being used, it will be garbage collected to free resources.
   */
  gcTime?: number

  initialData?: () => TResult

  // TODO: move to a plugin
  // TODO: rename to refresh since that's the default? and change 'always' to 'force'?
  refetchOnMount?: _RefetchOnControl
  refetchOnWindowFocus?: _RefetchOnControl
  refetchOnReconnect?: _RefetchOnControl
}

export const queryOptions = <Options extends UseQueryOptions>(
  options: Options
): Options & {
  key: Options['key'] & {
    [DATA_TYPE_SYMBOL]: Options extends UseQueryOptions<infer T> ? T : unknown
  }
} => options as any

/**
 * Default options for `useQuery()`. Modifying this object will affect all the queries that don't override these
 */
export const USE_QUERY_DEFAULTS = {
  staleTime: 1000 * 5, // 5 seconds
  gcTime: 1000 * 60 * 5, // 5 minutes
  // avoid type narrowing to `true`
  refetchOnWindowFocus: true as _RefetchOnControl,
  refetchOnReconnect: true as _RefetchOnControl,
  refetchOnMount: true as _RefetchOnControl,
} satisfies Partial<UseQueryOptions>

export type UseQueryOptionsWithDefaults<TResult = unknown> =
  typeof USE_QUERY_DEFAULTS & UseQueryOptions<TResult>

export const USE_QUERY_OPTIONS_KEY: InjectionKey<
  typeof USE_QUERY_DEFAULTS &
    Omit<UseQueryOptions, 'key' | 'query' | 'initialData'> &
    // TODO: refactor types
    Pick<QueryPluginOptions, 'setup'>
> = process.env.NODE_ENV !== 'production' ? Symbol('useQueryOptions') : Symbol()

/**
 * Injects the global query options.
 * @internal
 */
export const useQueryOptions = () => inject(USE_QUERY_OPTIONS_KEY)!
