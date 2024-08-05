import type { App } from 'vue'
import type { Pinia } from 'pinia'
import {
  USE_QUERY_DEFAULTS,
  USE_QUERY_OPTIONS_KEY,
  type UseQueryOptions,
} from './query-options'
import { useQueryCache } from './query-store'
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
   * Function to ensure the `error` property is always an instance of the default global type error. Defaults to the
   * identity function.
   *
   * @param error - error thrown
   */
  transformError?: (error: unknown) => ErrorDefault

  /**
   * Executes setup code inside `useQuery()` to add custom behavior to all queries. **Must be synchronous**.
   * @experimental still going through testing to see what is needed
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

  // install plugins
  plugins?.forEach((plugin) => plugin({ cache: useQueryCache(pinia), pinia }))
}
