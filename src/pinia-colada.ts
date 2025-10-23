import type { App, Plugin } from 'vue'
import type { Pinia } from 'pinia'
import type { UseQueryOptionsGlobal } from './query-options'
import { USE_QUERY_DEFAULTS, USE_QUERY_OPTIONS_KEY } from './query-options'
import { useQueryCache } from './query-store'
import type { PiniaColadaPlugin } from './plugins'
import { addDevtools } from './devtools/plugin'
import { USE_MUTATION_DEFAULTS, USE_MUTATION_OPTIONS_KEY } from './mutation-options'
import type { UseMutationOptionsGlobal } from './mutation-options'

// Global default options storage
let globalDefaultOptions: PiniaColadaOptions = {}

/**
 * Set default Pinia Colada options that will be merged with options passed to the plugin.
 * This is useful for libraries/modules that want to provide default configurations.
 *
 * Multiple calls to this function will merge the options (arrays are concatenated).
 *
 * @example
 * ```ts
 * // In a Nuxt module
 * setDefaultPiniaColadaOptions({
 *   plugins: [MyAuthPlugin()],
 *   queryOptions: { staleTime: 5000 }
 * })
 * ```
 *
 * @param options - Partial Pinia Colada options to set as defaults
 */
export function setDefaultPiniaColadaOptions(options: Partial<PiniaColadaOptions>): void {
  globalDefaultOptions = mergeOptions(globalDefaultOptions, options)
}

/**
 * Get the current global default options.
 * Mainly useful for testing or debugging.
 */
export function getDefaultPiniaColadaOptions(): PiniaColadaOptions {
  return globalDefaultOptions
}

/**
 * Reset global default options to empty.
 * Mainly useful for testing.
 */
export function resetDefaultPiniaColadaOptions(): void {
  globalDefaultOptions = {}
}

/**
 * Merge two PiniaColadaOptions objects.
 * Arrays are concatenated, objects are deeply merged, primitives from the second argument win.
 */
function mergeOptions(
  target: Partial<PiniaColadaOptions>,
  source: Partial<PiniaColadaOptions>,
): PiniaColadaOptions {
  const result: PiniaColadaOptions = { ...target }

  // Merge plugins (concatenate arrays)
  if (source.plugins) {
    result.plugins = [...(result.plugins || []), ...source.plugins]
  }

  // Merge queryOptions (deep merge)
  if (source.queryOptions) {
    result.queryOptions = {
      ...result.queryOptions,
      ...source.queryOptions,
    }
  }

  // Merge mutationOptions (deep merge)
  if (source.mutationOptions) {
    result.mutationOptions = {
      ...result.mutationOptions,
      ...source.mutationOptions,
    }
  }

  // Pinia instance: source wins
  if (source.pinia) {
    result.pinia = source.pinia
  }

  return result
}

/**
 * Options for the Pinia Colada plugin.
 */
export interface PiniaColadaOptions {
  /**
   * Pinia instance to use. This is only needed if installing before the Pinia plugin.
   */
  pinia?: Pinia

  /**
   * Pinia Colada plugins to install.
   */
  plugins?: PiniaColadaPlugin[]

  /**
   * Global options for queries. These will apply to all `useQuery()`, `defineQuery()`, etc.
   */
  queryOptions?: UseQueryOptionsGlobal

  /**
   * Global options for mutations. These will apply to all `useMutation()`, `defineMutation()`, etc.
   */
  mutationOptions?: UseMutationOptionsGlobal
}

/**
 * Plugin that installs the Query and Mutation plugins alongside some extra plugins.
 *
 * @see {@link QueryPlugin} to only install the Query plugin.
 *
 * @param app - Vue App
 * @param options - Pinia Colada options (will be merged with global defaults)
 */
export const PiniaColada: Plugin<[options?: PiniaColadaOptions]> = (
  app: App,
  options: PiniaColadaOptions = {},
): void => {
  // Merge global defaults with provided options
  // User-provided options have higher priority
  const mergedOptions = mergeOptions(globalDefaultOptions, options)

  const {
    pinia = app.config.globalProperties.$pinia,
    plugins,
    queryOptions,
    mutationOptions = {},
  } = mergedOptions

  app.provide(USE_QUERY_OPTIONS_KEY, {
    ...USE_QUERY_DEFAULTS,
    ...queryOptions,
  })

  app.provide(USE_MUTATION_OPTIONS_KEY, {
    ...USE_MUTATION_DEFAULTS,
    ...mutationOptions,
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
