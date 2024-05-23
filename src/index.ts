import type { App } from 'vue'
import type { QueryPluginOptions } from './query-plugin'
import { QueryPlugin } from './query-plugin'

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
 * Plugin that installs the Query and Mutation plugins alonside some extra plugins.
 *
 * @see {@link QueryPlugin} to only install the Query plugin.
 * @see {@link MutationPlugin} to only install the Query plugin.
 *
 * @param app - Vue App
 * @param options - Pinia Colada options
 * @param options.query - Options for the query plugin
 */
export function PiniaColada(
  app: App,
  options: {
    query?: QueryPluginOptions
    // TODO:
    // mutation?: MutationPluginOptions
  } = {},
) {
  app.use(QueryPlugin, options.query)
  // app.use(MutationPlugin, options.mutation)
  // TODO: extract other parts like retrying into plugins
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
