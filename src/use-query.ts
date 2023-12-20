import { useEventListener } from './utils'
import {
  type ComputedRef,
  computed,
  onMounted,
  onServerPrefetch,
  toValue,
} from 'vue'
import { useDataFetchingStore } from './data-fetching-store'

export interface UseQueryReturn<TResult = unknown, TError = Error> {
  data: ComputedRef<TResult | undefined>
  error: ComputedRef<TError | null>
  isFetching: ComputedRef<boolean>
  isPending: ComputedRef<boolean>
  refresh: () => Promise<void>
}

export interface UseDataFetchingQueryEntry<TResult = unknown, TError = any> {
  data: () => TResult | undefined
  error: () => TError | null
  /**
   * Returns whether the request is still pending its first call
   */
  isPending: () => boolean
  /**
   * Returns whether the request is currently fetching data
   */
  isFetching: () => boolean

  /**
   * Refreshes the data ignoring any cache but still decouples the refreshes (only one refresh at a time)
   * @returns a promise that resolves when the refresh is done
   */
  refresh: () => Promise<void>
  /**
   * Fetches the data but only if it's not already fetching
   * @returns a promise that resolves when the refresh is done
   */
  fetch: () => Promise<TResult>

  pending: null | {
    refreshCall: Promise<void>
    when: number
  }
  previous: null | {
    /**
     * When was this data fetched the last time in ms
     */
    when: number
    data: TResult | undefined
    error: TError | null
  }
}

export type UseQueryKey = string | symbol

export interface UseQueryOptions<TResult = unknown> {
  key: UseQueryKey | (() => UseQueryKey)
  fetcher: () => Promise<TResult>

  cacheTime?: number
  initialValue?: () => TResult
  refetchOnWindowFocus?: boolean
  refetchOnReconnect?: boolean
}
/**
 * Default options for `useQuery()`. Modifying this object will affect all the queries that don't override these
 */
export const USE_QUERY_DEFAULTS = {
  cacheTime: 1000 * 5,
  refetchOnWindowFocus: true as boolean,
  refetchOnReconnect: true as boolean,
} satisfies Partial<UseQueryOptions>
export type UseQueryOptionsWithDefaults<TResult> = typeof USE_QUERY_DEFAULTS &
  UseQueryOptions<TResult>

export function useQuery<TResult, TError = Error>(
  _options: UseQueryOptions<TResult>
): UseQueryReturn<TResult, TError> {
  const store = useDataFetchingStore()

  const options = {
    ...USE_QUERY_DEFAULTS,
    ..._options,
  } satisfies UseQueryOptionsWithDefaults<TResult>

  const entry = computed(() =>
    store.ensureEntry<TResult, TError>(toValue(options.key), options)
  )

  // only happens on server, app awaits this
  onServerPrefetch(async () => {
    await entry.value.refresh()
    // NOTE: workaround to https://github.com/vuejs/core/issues/5300
    // eslint-disable-next-line
    queryReturn.data.value,
      queryReturn.error.value,
      queryReturn.isFetching.value,
      queryReturn.isPending.value
  })

  // only happens on client
  // we could also call fetch instead but forcing a refresh is more interesting
  onMounted(entry.value.refresh)
  // TODO: optimize so it doesn't refresh if we are hydrating

  if (IS_CLIENT) {
    if (options.refetchOnWindowFocus) {
      useEventListener(window, 'focus', () => {
        entry.value.refresh()
      })
    }

    if (options.refetchOnReconnect) {
      useEventListener(window, 'online', () => {
        entry.value.refresh()
      })
    }
  }

  const queryReturn = {
    data: computed(() => entry.value.data()),
    error: computed(() => entry.value.error()),
    isFetching: computed(() => entry.value.isFetching()),
    isPending: computed(() => entry.value.isPending()),

    refresh: () => entry.value.refresh(),
  } satisfies UseQueryReturn<TResult, TError>

  return queryReturn
}

/**
 * Notes for exercise:
 * - Start only with the data, error, and isLoading, no cache, no refresh
 * - Start without the options about refreshing, and mutations
 */

const IS_CLIENT = typeof window !== 'undefined'
