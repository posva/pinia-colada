import {
  IS_CLIENT,
  _JSONPrimitive,
  _MaybeArray,
  _ObjectFlat,
  toArray,
  useEventListener,
} from './utils'
import {
  computed,
  onMounted,
  onServerPrefetch,
  toValue,
  onScopeDispose,
  ShallowRef,
  Ref,
  MaybeRefOrGetter,
} from 'vue'
import {
  UseQueryPropertiesEntry,
  UseQueryStateEntry,
  useDataFetchingStore,
} from './data-fetching-store'

/**
 * Return type of `useQuery()`.
 */
export interface UseQueryReturn<TResult = unknown, TError = Error>
  extends UseQueryStateEntry<TResult, TError>,
    Pick<UseQueryPropertiesEntry<TResult, TError>, 'refresh' | 'refetch'> {}

/**
 * Key used to identify a query.
 */
export type UseQueryKey = _JSONPrimitive | _ObjectFlat
// TODO: if it's worth allowing more complex keys, we could expose an extendable interface  TypesConfig where this is set.

export interface UseQueryOptions<TResult = unknown> {
  /**
   * The key used to identify the query. It should either be an array of primitives without reactive values or a reactive array.
   */
  key: MaybeRefOrGetter<_MaybeArray<UseQueryKey>>

  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
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
  // TODO: rename to refresh and use refresh instead by default?
  refetchOnWindowFocus?: boolean // TODO: | 'force' or options to adapt this
  refetchOnReconnect?: boolean
}

/**
 * Default options for `useQuery()`. Modifying this object will affect all the queries that don't override these
 */
export const USE_QUERY_DEFAULTS = {
  staleTime: 1000 * 5, // 5 seconds
  gcTime: 1000 * 60 * 5, // 5 minutes
  // avoid type narrowing to `true`
  refetchOnWindowFocus: true as UseQueryOptions['refetchOnWindowFocus'],
  refetchOnReconnect: true as UseQueryOptions['refetchOnReconnect'],
} satisfies Partial<UseQueryOptions>
// TODO: inject for the app rather than a global variable

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
    store.ensureEntry<TResult, TError>(toArray(toValue(options.key)), options)
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
          entry.value.refetch()
        }
      })
    }

    if (options.refetchOnReconnect) {
      useEventListener(window, 'online', () => {
        entry.value.refetch()
      })
    }
  }

  // TODO: handle if key is reactive

  const queryReturn = {
    data: entry.value.data,
    error: entry.value.error,
    isFetching: entry.value.isFetching,
    isPending: entry.value.isPending,
    status: entry.value.status,

    // TODO: do we need to force bound to the entry?
    refresh: () => entry.value.refresh(),
    refetch: () => entry.value.refetch(),
  } satisfies UseQueryReturn<TResult, TError>

  return queryReturn
}
