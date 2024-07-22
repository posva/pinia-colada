import type { App } from 'vue'
import type { Pinia } from 'pinia'
import {
  USE_QUERY_DEFAULTS,
  USE_QUERY_OPTIONS_KEY,
  type UseQueryOptions,
  type UseQueryOptionsWithDefaults,
} from './query-options'
import { useQueryCache } from './query-store'
import { noop } from './utils'
import type { _Simplify } from './utils'
import type { UseQueryReturn } from './use-query'
import type { ErrorDefault } from './types-extension'

export interface QueryPluginOptions
  extends Omit<
    UseQueryOptions,
    'key' | 'query' | 'initialData' | 'transformError'
  > {
  /**
   * Executes setup code inside `useQuery()` to add custom behavior to all queries. **Must be synchronous**.
   *
   * @param context - properties of the `useQuery` return value and the options
   */
  setup?: <TResult = unknown, TError = ErrorDefault>(
    context: _Simplify<
      UseQueryReturn<TResult, TError> & {
        options: UseQueryOptionsWithDefaults<TResult, TError>
      }
    >,
  ) => void | Promise<never>

  /**
   * Global handler for when a query is successful.
   *
   * @param data - data returned by the query
   */
  onSuccess?: (data: unknown) => unknown

  /**
   * Global handler for when a query is settled (either successfully or with an error). Will await for the `onSuccess`
   * or `onError` handlers to resolve if they return a promise.
   *
   * @param data - data returned by the query if any
   * @param error - error thrown if any
   */
  onSettled?: (data: unknown | undefined, error: unknown | null) => unknown

  /**
   * Global error handler for all queries.
   *
   * @param error - error thrown
   */
  onError?: (error: unknown) => unknown

  /**
   * Function to ensure the `error` property is always an instance of the default global type error. Defaults to the
   * identity function.
   *
   * @param error - error thrown
   */
  transformError?: (error: unknown) => ErrorDefault

  /**
   * Pinia instance to use. This is only needed if installing before the Pinia plugin.
   */
  pinia?: Pinia
}

/**
 * Plugin for the Pinia Colada Query functionality.
 * @param app - Vue App
 * @param options
 *
 * @deprecated Use `PiniaColada` instead
 */
export function QueryPlugin(
  app: App,
  {
    onSuccess = noop,
    onSettled = noop,
    onError = noop,
    pinia = app.config.globalProperties.$pinia,
    ...useQueryOptions
  }: QueryPluginOptions = {},
) {
  app.provide(USE_QUERY_OPTIONS_KEY, {
    ...USE_QUERY_DEFAULTS,
    ...useQueryOptions,
  })

  if (process.env.NODE_ENV !== 'production' && !pinia) {
    throw new Error(
      '[@pinia/colada] root pinia plugin not detected. Make sure you install pinia before installing the "QueryPlugin" plugin or to manually pass the pinia instance.',
    )
  }

  const store = useQueryCache(pinia)
  store.$onAction(({ name, after, onError: _onError }) => {
    if (name === 'refetch' || name === 'refresh') {
      // TODO: the refetch/refresh should probably return more information so we can query the error or data here. They don't throw errors
      after(async (data) => {
        await onSuccess(data)
        onSettled(data, null)
      })
      _onError(async (error) => {
        await onError(error)
        onSettled(undefined, error)
      })
    }
  })
}
