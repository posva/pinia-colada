import type { App } from 'vue'
import type { Pinia } from 'pinia'
import type {
  UseQueryOptionsGlobal,
} from './query-options'
import {
  USE_QUERY_DEFAULTS,
  USE_QUERY_OPTIONS_KEY,
} from './query-options'
import { useQueryCache } from './query-store'
import type { PiniaColadaPlugin } from './plugins'

/**
 * Options for the Pinia Colada plugin.
 */
export interface PiniaColadaOptions extends UseQueryOptionsGlobal {
  /**
   * Pinia instance to use. This is only needed if installing before the Pinia plugin.
   */
  pinia?: Pinia

  /**
   * Pinia Colada plugins to install.
   */
  plugins?: PiniaColadaPlugin[]
}

/**
 * Plugin that installs the Query and Mutation plugins alongside some extra plugins.
 *
 * @see {@link QueryPlugin} to only install the Query plugin.
 * @see {@link MutationPlugin} to only install the Query plugin.
 *
 * @param app - Vue App
 * @param options - Pinia Colada options
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
  plugins?.forEach((plugin) => plugin({ queryCache: useQueryCache(pinia), pinia }))
}
