import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { useMutationCache } from './mutation-store'
import type { UseMutationEntry, UseMutationEntryFilter } from './mutation-store'
import type { ErrorDefault } from './types-extension'

/**
 * Filters for querying mutation entries.
 */
export type MutationFilters = UseMutationEntryFilter

/**
 * Options for the {@link useMutationState} composable.
 */
export interface UseMutationStateOptions<TResult = UseMutationEntry, TError = ErrorDefault> {
  /**
   * Filters to apply to the mutation entries.
   */
  filters?: MutationFilters

  /**
   * Function to select data from the mutation entries.
   * If not provided, returns the full mutation entries.
   *
   * @param mutationEntry - the mutation entry to select from
   * @returns the selected data
   */
  select?: (mutationEntry: UseMutationEntry) => TResult
}

/**
 * Return type for the {@link useMutationState} composable.
 *
 * @see {@link useMutationState}
 */
export interface UseMutationStateReturn<TResult = UseMutationEntry, TError = ErrorDefault> {
  /**
   * The result of the mutation state query. Returns an array of selected data or mutation entries.
   */
  data: ComputedRef<TResult[]>
}

/**
 * Reactive access to the state of mutation entries without executing them.
 * Allows filtering and selecting from all mutation entries in the cache.
 *
 * @param filters - filters to apply to the mutation entries
 *
 * @example
 * ```ts
 * // Get all mutations
 * const { data: allMutations } = useMutationState()
 *
 * // Get mutations with specific status
 * const { data: pendingMutations } = useMutationState({ status: 'pending' })
 *
 * // Get only the data from successful mutations
 * const { data: successfulData } = useMutationState({
 *   filters: { status: 'success' },
 *   select: (entry) => entry.state.value.data
 * })
 * ```
 */
export function useMutationState<TResult = UseMutationEntry, TError = ErrorDefault>(
  filters?: MaybeRefOrGetter<MutationFilters>,
): UseMutationStateReturn<UseMutationEntry, TError>

/**
 * Reactive access to the state of mutation entries without executing them.
 * Allows filtering and selecting from all mutation entries in the cache.
 *
 * @param options - options including filters and select function
 *
 * @example
 * ```ts
 * // Get all mutations
 * const { data: allMutations } = useMutationState()
 *
 * // Get mutations with specific status
 * const { data: pendingMutations } = useMutationState({ filters: { status: 'pending' } })
 *
 * // Get only the data from successful mutations
 * const { data: successfulData } = useMutationState({
 *   filters: { status: 'success' },
 *   select: (entry) => entry.state.value.data
 * })
 * ```
 */
export function useMutationState<TResult = UseMutationEntry, TError = ErrorDefault>(
  options: UseMutationStateOptions<TResult, TError>,
): UseMutationStateReturn<TResult, TError>

export function useMutationState<TResult = UseMutationEntry, TError = ErrorDefault>(
  optionsOrFilters?: MaybeRefOrGetter<MutationFilters> | UseMutationStateOptions<TResult, TError>,
): UseMutationStateReturn<TResult, TError> {
  const mutationCache = useMutationCache()

  // Normalize arguments - determine if we got filters directly or options object
  const isOptionsObject = optionsOrFilters && typeof optionsOrFilters === 'object' && 
    ('filters' in optionsOrFilters || 'select' in optionsOrFilters)

  const options = computed(() => {
    if (isOptionsObject) {
      return optionsOrFilters as UseMutationStateOptions<TResult, TError>
    } else {
      return {
        filters: toValue(optionsOrFilters as MaybeRefOrGetter<MutationFilters>),
      } as UseMutationStateOptions<TResult, TError>
    }
  })

  const data = computed(() => {
    const { filters = {}, select } = options.value
    const entries = mutationCache.getEntries(filters)
    
    if (select) {
      return entries.map(select)
    } else {
      return entries as TResult[]
    }
  })

  return {
    data,
  }
}