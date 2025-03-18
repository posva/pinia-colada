import type { App, Plugin } from 'vue'
import type { Pinia } from 'pinia'
import type { UseQueryOptionsGlobal } from './query-options'
import { USE_QUERY_DEFAULTS, USE_QUERY_OPTIONS_KEY } from './query-options'
import { useQueryCache } from './query-store'
import type { PiniaColadaPlugin } from './plugins'
import { addDevtools } from './devtools/plugin'

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
 *
 * @param app - Vue App
 * @param options - Pinia Colada options
 */
export const PiniaColada: Plugin<[options?: PiniaColadaOptions]> = (
  app: App,
  options: PiniaColadaOptions = {},
): void => {
  const { pinia = app.config.globalProperties.$pinia, plugins, ...useQueryOptions } = options

  app.provide(USE_QUERY_OPTIONS_KEY, {
    ...USE_QUERY_DEFAULTS,
    ...useQueryOptions,
  })

  if (process.env.NODE_ENV !== 'production' && !pinia) {
    throw new Error(
      '[@pinia/colada] root pinia plugin not detected. Make sure you install pinia before installing the "PiniaColada" plugin or to manually pass the pinia instance.',
    )
  }

  if (typeof document !== 'undefined' && process.env.NODE_ENV === 'development') {
    addDevtools(app, pinia)
  }

  // install plugins
  const queryCache = useQueryCache(pinia)
  plugins?.forEach((plugin) =>
    plugin({
      scope: queryCache._s,
      queryCache,
      pinia,
    }),
  )
}
