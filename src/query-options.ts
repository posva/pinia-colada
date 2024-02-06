import { type InjectionKey, type MaybeRefOrGetter, inject } from 'vue'
import type { EntryNodeKey } from './tree-map'
import type { _MaybeArray, _ObjectFlat } from './utils'
import type { QueryPluginOptions } from './query-plugin'

/**
 * `true` refetch if data is stale (refresh()), `false` never refetch, 'always' always refetch.
 */
export type _RefetchOnControl = boolean | 'always'

/**
 * Key used to identify a query.
 */
export type UseQueryKey = EntryNodeKey | _ObjectFlat
// TODO: if it's worth allowing more complex keys, we could expose an extendable interface  TypesConfig where this is set.

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
   * The key used to identify the query. It should either be an array of primitives without reactive values or a reactive array.
   */
  key: MaybeRefOrGetter<_MaybeArray<UseQueryKey>>

  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
  query: () => Promise<TResult>

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
 * Injects the query options.
 * @internal
 */
export const useQueryOptions = () => inject(USE_QUERY_OPTIONS_KEY)!
