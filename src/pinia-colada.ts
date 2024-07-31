import type { App } from 'vue'
import type { Pinia } from 'pinia'
import {
  USE_QUERY_DEFAULTS,
  USE_QUERY_OPTIONS_KEY,
  type UseQueryOptions,
} from './query-options'
import { useQueryCache } from './query-store'
import { noop } from './utils'
import type { ErrorDefault } from './types-extension'
import type { PiniaColadaPlugin } from './plugins'

/**
 * Options for the Pinia Colada plugin.
 */
export interface PiniaColadaOptions
  extends Omit<
    UseQueryOptions,
    'key' | 'query' | 'initialData' | 'transformError'
  > {
  /**
   * Pinia instance to use. This is only needed if installing before the Pinia plugin.
   */
  pinia?: Pinia

  /**
   * Pinia Colada plugins to install.
   */
  plugins?: PiniaColadaPlugin[]

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
}

/**
 * Plugin that installs the Query and Mutation plugins alongside some extra plugins.
 *
 * @see {@link PiniaColada} to only install the Query plugin.
 * @see {@link MutationPlugin} to only install the Query plugin.
 *
 * @param app - Vue App
 * @param options - Pinia Colada options
 * @param options.pinia - Pinia instance to use. This is only needed if installing before the Pinia plugin.
 * @param options.query - Query plugin options
 * @param options.plugins - Pinia Colada plugins to install.
 */
export function PiniaColada(app: App, options: PiniaColadaOptions = {}) {
  const {
    pinia = app.config.globalProperties.$pinia,
    plugins,
    onError = noop,
    onSettled = noop,
    onSuccess = noop,
    ...useQueryOptions
  } = options

  app.provide(USE_QUERY_OPTIONS_KEY, {
    ...USE_QUERY_DEFAULTS,
    ...useQueryOptions,
  })

  if (process.env.NODE_ENV !== 'production' && !pinia) {
    throw new Error(
      '[@pinia/colada] root pinia plugin not detected. Make sure you install pinia before installing the "PiniaColada" plugin or to manually pass the pinia instance.',
    )
  }

  const store = useQueryCache(pinia)
  store.$onAction(({ name, after, onError: _onError }) => {
    if (name === 'refetch') {
      // TODO: the refetch/refresh should probably return more information so we can query the error or data here. They don't throw errors
      after(async (data) => {
        await onSuccess(data)
        onSettled(data, null)
      })
      // FIXME: this doesn't work since the error is caught by refetch/refresh
      _onError(async (error) => {
        await onError(error)
        onSettled(undefined, error)
      })
    }
  })

  // install plugins
  plugins?.forEach((plugin) => plugin({ cache: useQueryCache(pinia), pinia }))
}
