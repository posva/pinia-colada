import { type App } from 'vue'
import {
  USE_QUERY_DEFAULTS,
  USE_QUERY_OPTIONS_KEY,
  UseQueryOptions,
  UseQueryOptionsWithDefaults,
} from './query-options'
import { UseQueryEntry, useDataFetchingStore } from './data-fetching-store'
import { _Simplify, noop } from './utils'
import type { UseQueryReturn } from './use-query'

export interface QueryPluginOptions
  extends Omit<UseQueryOptions, 'key' | 'query' | 'initialData'> {
  /**
   * Executes setup code inside `useQuery()` to add custom behavior to all queries. **Must be synchronous**.
   *
   * @param context - properties of the `useQuery` return value and the options
   */
  setup?: <TResult = unknown, TError = unknown>(
    context: _Simplify<
      UseQueryReturn<TResult, TError> & {
        options: UseQueryOptionsWithDefaults<TResult>
      }
    >
  ) => void | Promise<never>

  // TODO: and others
  onSuccess?: () => void
  onSettled?: () => void
  onError?: () => void
}

export function QueryPlugin(
  app: App,
  {
    onSuccess = noop,
    onSettled = noop,
    onError = noop,
    ...useQueryOptions
  }: QueryPluginOptions = {}
) {
  app.provide(USE_QUERY_OPTIONS_KEY, {
    ...USE_QUERY_DEFAULTS,
    ...useQueryOptions,
  })

  const pinia = app.config.globalProperties.$pinia

  if (process.env.NODE_ENV !== 'production' && !pinia) {
    throw new Error(
      '[@pinia/colada] root pinia plugin not detected. Make sure you install pinia before installing the "QueryPlugin" plugin.'
    )
  }

  const store = useDataFetchingStore(pinia)
  store.$onAction(({ name, after, onError: _onError }) => {
    // FIXME: refetch / refresh
    if (name === 'query') {
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
