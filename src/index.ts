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
export { useQuery, type UseQueryReturn } from './use-query'

// export { type UseQueryKeyList } from './query-keys'

export {
  // TODO: figure out if worth compared to `defineQuery()`
  // queryOptions,
  // type InferUseQueryKeyData,
  type UseQueryKey,
  type UseQueryOptions,
  type UseQueryOptionsWithDefaults,
} from './query-options'

export { QueryPlugin, type QueryPluginOptions } from './query-plugin'

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
