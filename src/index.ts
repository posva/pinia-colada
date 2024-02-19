export {
  useMutation,
  type UseMutationReturn,
  type UseMutationOptions,
} from './use-mutation'
export { useQuery, type UseQueryReturn } from './use-query'

// export { type UseQueryKeyList } from './query-keys'

export {
  // TODO: figure out if worth
  // queryOptions,
  // type InferUseQueryKeyData,
  type UseQueryKey,
  type UseQueryOptions,
  type UseQueryOptionsWithDefaults,
} from './query-options'

export { QueryPlugin, type QueryPluginOptions } from './query-plugin'

export {
  useQueryCache,
  type UseQueryStatus,
  serialize,
  type UseQueryEntry,
} from './query-store'

export { TreeMapNode, type EntryNodeKey } from './tree-map'

export { delayLoadingRef } from './utils'

export type { TypesConfig } from './types-extension'

// TODO: idea of plugin that persists the cached values
