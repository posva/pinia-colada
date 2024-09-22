import { type InjectionKey, type MaybeRefOrGetter, inject } from 'vue'
import type { EntryKey } from './entry-options'
import type { ErrorDefault } from './types-extension'
import type { PiniaColadaOptions } from './pinia-colada'

/**
 * `true` refetch if data is stale (refresh()), `false` never refetch, 'always' always refetch.
 */
export type _RefetchOnControl = boolean | 'always'

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
export interface UseQueryOptions<TResult = unknown, TError = ErrorDefault> {
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
  key: MaybeRefOrGetter<EntryKey>

  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
  query: (context: UseQueryFnContext) => Promise<TResult>

  /**
   * Whether the query should be enabled or not. If `false`, the query will not be executed until `refetch()` or
   * `refresh()` is called. If it becomes `true`, the query will be refreshed.
   */
  enabled?: MaybeRefOrGetter<boolean>

  /**
   * Time in ms after which the data is considered stale and will be refreshed on next read
   */
  staleTime?: number

  /**
   * Time in ms after which, once the data is no longer being used, it will be garbage collected to free resources.
   */
  gcTime?: number

  // TODO: this might be just sugar syntax to do `setQueryData()` on creation
  initialData?: () => NoInfer<TResult>

  placeholderData?:
    | NoInfer<TResult>
    | (<T extends TResult>(previousData: T | undefined) => NoInfer<TResult>)

  /**
   * Function to type and ensure the `error` property is always an instance of `TError`.
   *
   * @param error - error thrown
   * @example
   * ```ts
   * useQuery({
   *   key: ['user', id],
   *   query: () => fetchUser(id),
   *   transformError: (error): MyCustomError | UnexpectedError =>
   *     // this assumes both `MyCustomError` and a `UnexpectedError` are valid error classes
   *     error instanceof MyCustomError ? error : new UnexpectedError(error),
   * })
   * ```
   */
  transformError?: (error: unknown) => TError

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
  enabled: true as MaybeRefOrGetter<boolean>,
  // as any to simplify the typing with generics
  transformError: (error: unknown) => error as any,
} satisfies Partial<UseQueryOptions>

export type UseQueryOptionsWithDefaults<
  TResult = unknown,
  TError = ErrorDefault,
> = UseQueryOptions<TResult, TError> & typeof USE_QUERY_DEFAULTS

export const USE_QUERY_OPTIONS_KEY: InjectionKey<
  typeof USE_QUERY_DEFAULTS &
    Omit<
      UseQueryOptions,
      'key' | 'query' | 'initialData' | 'placeholderData'
    > & {
      setup?: PiniaColadaOptions['setup']
    }
> = process.env.NODE_ENV !== 'production' ? Symbol('useQueryOptions') : Symbol()

/**
 * Injects the global query options.
 * @internal
 */
export const useQueryOptions = () => inject(USE_QUERY_OPTIONS_KEY)!
