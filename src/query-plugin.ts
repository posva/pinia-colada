import type { App } from 'vue'
import {
  USE_QUERY_DEFAULTS,
  USE_QUERY_OPTIONS_KEY,
  type UseQueryOptions,
  type UseQueryOptionsWithDefaults,
} from './query-options'
import { useQueryCache } from './query-store'
import { type _Simplify, noop } from './utils'
import type { UseQueryReturn } from './use-query'
import type { ErrorDefault } from './types-extension'

export interface QueryPluginOptions
  extends Omit<UseQueryOptions, 'key' | 'query' | 'initialData' | 'transformError'> {
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

  // TODO: and others
  onSuccess?: () => void
  onSettled?: () => void
  onError?: () => void

  /**
   * Function to ensure the `error` property is always an instance of the default global type error. Defaults to the
   * identity function.
   *
   * @param error - error thrown
   */
  transformError?: (error: unknown) => ErrorDefault
}

export function QueryPlugin(
  app: App,
  {
    onSuccess = noop,
    onSettled = noop,
    onError = noop,
    ...useQueryOptions
  }: QueryPluginOptions = {},
) {
  app.provide(USE_QUERY_OPTIONS_KEY, {
    ...USE_QUERY_DEFAULTS,
    ...useQueryOptions,
  })

  const pinia = app.config.globalProperties.$pinia

  if (process.env.NODE_ENV !== 'production' && !pinia) {
    throw new Error(
      '[@pinia/colada] root pinia plugin not detected. Make sure you install pinia before installing the "QueryPlugin" plugin.',
    )
  }

  const store = useQueryCache(pinia)
  store.$onAction(({ name, after, onError: _onError }) => {
    // FIXME: refetch / refresh
    if (name === 'refetch' || name === 'refresh') {
      after(() => {
        onSuccess()
        onSettled()
      })
      _onError(() => {
        onError()
        onSettled()
      })
    }
  })
}
