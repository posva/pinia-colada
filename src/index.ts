import type { App } from 'vue'
import type { QueryPluginOptions } from './query-plugin'
import { QueryPlugin } from './query-plugin'
import type { PiniaColadaPlugin } from './plugins'
import type { Pinia } from 'pinia'
import { useQueryCache } from './query-store'

/**
 * @module @pinia/colada
 */
export {
  useMutation,
  type UseMutationReturn,
  type UseMutationOptions,
  type _ReduceContext,
  type _EmptyObject,
  type MutationStatus,
} from './use-mutation'
export { defineMutation } from './define-mutation'

export { useQuery, type UseQueryReturn } from './use-query'
export { defineQuery } from './define-query'

// export { type UseQueryKeyList } from './query-keys'

export { type EntryKey } from './entry-options'

export {
  type UseQueryOptions,
  type UseQueryOptionsWithDefaults,
} from './query-options'

export { QueryPlugin, type QueryPluginOptions } from './query-plugin'

/**
 * Options for the Pinia Colada plugin.
 */
export interface PiniaColadaOptions extends QueryPluginOptions {
  /**
   * Pinia instance to use. This is only needed if installing before the Pinia plugin.
   */
  pinia?: Pinia

  /**
   * Pinia Colada plugins to install.
   */
  plugins?: PiniaColadaPlugin[]
  //
  // TODO:
  // mutation?: MutationPluginOptions
}

/**
 * Plugin that installs the Query and Mutation plugins alongside some extra plugins.
 *
 * @see {@link QueryPlugin} to only install the Query plugin.
 * @see {@link MutationPlugin} to only install the Query plugin.
 *
 * @param app - Vue App
 * @param options - Pinia Colada options
 * @param options.pinia - Pinia instance to use. This is only needed if installing before the Pinia plugin.
 * @param options.query - Query plugin options
 * @param options.plugins - Pinia Colada plugins to install.
 */
export function PiniaColada(app: App, options: PiniaColadaOptions = {}) {
  app.use(QueryPlugin, options)
  // app.use(MutationPlugin, options.mutation)
  // TODO: extract other parts like retrying into plugins
  //
  const { plugins, pinia = app.config.globalProperties.$pinia } = options

  plugins?.forEach((plugin) => plugin({ cache: useQueryCache(pinia), pinia }))
}

export {
  useQueryCache,
  type QueryStatus,
  serialize,
  type UseQueryEntry,
} from './query-store'

export { TreeMapNode, type EntryNodeKey } from './tree-map'

export { delayLoadingRef, type _MaybeArray, type _Awaitable } from './utils'

export type { TypesConfig } from './types-extension'

// TODO: idea of plugin that persists the cached values
