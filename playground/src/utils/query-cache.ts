import {
  useMutationCache,
  useQueryCache,
  type UseMutationEntryFilter,
  type UseQueryEntryFilter,
} from '@pinia/colada'
import { computed, type ComputedRef } from 'vue'

/**
 * Returns a computed ref that indicates whether there are any ongoing queries
 * matching the provided filters.
 * @param filters - Optional filters to narrow down the queries to check.
 * @returns A computed ref that is true if there are ongoing queries, false otherwise.
 */
export function useIsLoading(filters?: UseQueryEntryFilter): ComputedRef<boolean> {
  const queryCache = useQueryCache()

  return computed(() =>
    queryCache.getEntries(filters).some((entry) => entry.asyncStatus.value === 'loading'),
  )
}

/**
 * Returns a computed ref that indicates whether there are any ongoing mutations
 * matching the provided filters.
 *
 * @param filters - Optional filters to narrow down the mutations to check.
 * @returns A computed ref that is true if there are ongoing mutations, false otherwise.
 */
export function useIsMutating(filters?: UseMutationEntryFilter): ComputedRef<boolean> {
  const mutationCache = useMutationCache()

  return computed(() =>
    mutationCache.getEntries(filters).some((entry) => entry.asyncStatus.value === 'loading'),
  )
}
