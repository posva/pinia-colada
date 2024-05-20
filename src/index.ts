/**
 * @module @pinia/colada
 */
export {
  useMutation,
  type UseMutationReturn,
} from './use-mutation'
export {
  type UseMutationOptions,
  type _ReduceContext,
  type _EmptyObject,
  type MutationStatus,
} from './mutation-options'
export { defineMutation } from './define-mutation'

export { useQuery, type UseQueryReturn } from './use-query'
export { defineQuery } from './define-query'

// export { type UseQueryKeyList } from './query-keys'

export {
  type EntryKey,
} from './entry-options'

export {
  type UseQueryOptions,
  type UseQueryOptionsWithDefaults,
} from './query-options'

export { QueryPlugin, type QueryPluginOptions } from './query-plugin'
export { MutationPlugin, type MutationPluginOptions } from './mutation-plugin'

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
