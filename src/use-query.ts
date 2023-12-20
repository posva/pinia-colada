import { useEventListener } from './utils'
import {
  type ComputedRef,
  computed,
  onMounted,
  onServerPrefetch,
  toValue,
  onScopeDispose,
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

  // TODO: should we just have refresh and allow a parameter to force a refresh? instead of having fetch and refresh
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

  /**
   * Time in ms after which the data is considered stale and will be refreshed on next read
   */
  staleTime?: number

  /**
   * Time in ms after which, once the data is no longer in used, it will be garbage collected to free resources.
   */
  gcTime?: number

  initialData?: () => TResult
  refetchOnWindowFocus?: boolean
  refetchOnReconnect?: boolean
}

/**
 * Default options for `useQuery()`. Modifying this object will affect all the queries that don't override these
 */
export const USE_QUERY_DEFAULTS = {
  staleTime: 1000 * 5, // 5 seconds
  gcTime: 1000 * 60 * 5, // 5 minutes
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

  // TODO: we could save the time it was fetched to avoid fetching again. This is useful to not refetch during SSR app but do refetch in SSG apps if the data is stale. Careful with timers and timezones

  onScopeDispose(() => {
    // TODO: add a reference count to the entry and garbage collect it if it's 0 after the given delay
  })

  if (IS_CLIENT) {
    if (options.refetchOnWindowFocus) {
      useEventListener(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          entry.value.refresh()
        }
      })
    }

    if (options.refetchOnReconnect) {
      useEventListener(window, 'online', () => {
        entry.value.refresh()
      })
    }
  }

  const queryReturn = {
    // TODO: optimize so we create only one computed per entry. We could have an application plugin that creates an effectScope and allows us to inject the scope to create entries
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
