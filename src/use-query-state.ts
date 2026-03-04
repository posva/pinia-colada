import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { useQueryCache } from './query-store'
import type { UseQueryReturn } from './use-query'
import type { EntryKey, EntryKeyTagged } from './entry-keys'
import type { AsyncStatus, DataState, DataStateStatus } from './data-state'
import type { ErrorDefault } from './types-extension'

/**
 * Return type for the {@link useQueryState} composable.
 *
 * @see {@link useQueryState}
 */
export interface UseQueryStateReturn<
  TData = unknown,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
> {
  /**
   * `state` of the query entry.
   *
   * @see {@link UseQueryReturn#state}
   */
  state: ComputedRef<DataState<TData, TError, TDataInitial> | undefined>

  /**
   * `data` of the query entry.
   *
   * @see {@link UseQueryReturn#data}
   */
  data: ComputedRef<TData | TDataInitial | undefined>

  /**
   * `error` of the query entry.
   *
   * @see {@link UseQueryReturn#error}
   */
  error: ComputedRef<TError | null | undefined>

  /**
   * `status` of the query entry.
   *
   * @see {@link DataStateStatus}
   * @see {@link UseQueryReturn#status}
   */
  status: ComputedRef<DataStateStatus | undefined>

  /**
   * `asyncStatus` of the query entry.
   *
   * @see {@link AsyncStatus}
   * @see {@link UseQueryReturn#asyncStatus}
   */
  asyncStatus: ComputedRef<AsyncStatus | undefined>

  /**
   * Is the query entry currently pending or non existent.
   */
  isPending: ComputedRef<boolean>
}

/**
 * Reactive access to the state of a query entry without fetching it.
 *
 * @param key - tagged key of the query entry to access
 */
export function useQueryState<
  TData,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
>(
  key: MaybeRefOrGetter<EntryKeyTagged<TData, TError, TDataInitial>>,
): UseQueryStateReturn<TData, TError, TDataInitial>

/**
 * Reactive access to the state of a query entry without fetching it.
 *
 * @param key - key of the query entry to access
 */
export function useQueryState<
  TData,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
>(key: MaybeRefOrGetter<EntryKey>): UseQueryStateReturn<TData, TError, TDataInitial>

export function useQueryState<
  TData,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
>(
  key: MaybeRefOrGetter<EntryKeyTagged<TData, TError, TDataInitial> | EntryKey>,
): UseQueryStateReturn<TData, TError, TDataInitial> {
  const queryCache = useQueryCache()

  const entry = computed(() => queryCache.get(toValue(key)))

  const state = computed(() => entry.value?.state.value)
  const data = computed(() => state.value?.data)
  const error = computed(() => state.value?.error)
  const status = computed(() => state.value?.status)
  const asyncStatus = computed(() => entry.value?.asyncStatus.value)
  const isPending = computed(() => !state.value || state.value.status === 'pending')

  return {
    state,
    data,
    error,
    status,
    asyncStatus,
    isPending,
  }
}
