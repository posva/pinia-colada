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

export {
  useDataFetchingStore,
  type UseQueryStatus,
  serialize,
  UseQueryEntry,
} from './data-fetching-store'

export { TreeMapNode, type EntryNodeKey } from './tree-map'

// TODO: idea of plugin that persists the cached values
