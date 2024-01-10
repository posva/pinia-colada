export {
  useMutation,
  type UseMutationReturn,
  type UseMutationOptions,
} from './use-mutation'

export {
  USE_QUERY_DEFAULTS,
  useQuery,
  type UseQueryKey,
  type UseQueryOptions,
  type UseQueryOptionsWithDefaults,
  type UseQueryReturn,
} from './use-query'

export {
  useDataFetchingStore,
  type UseQueryStatus,
  serialize,
  createTreeMap,
} from './data-fetching-store'

// TODO: idea of plugin that persists the cached values
