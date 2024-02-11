export {
  useMutation,
  type UseMutationReturn,
  type UseMutationOptions,
} from './use-mutation'
export { useQuery, type UseQueryReturn } from './use-query'

export {
  USE_QUERY_DEFAULTS,
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

// TODO: idea of plugin that persists the cached values
