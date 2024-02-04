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
  watch,
  getCurrentInstance,
  ComputedRef,
} from 'vue'
import { UseQueryStatus, useDataFetchingStore } from './data-fetching-store'
import { EntryNodeKey } from './tree-map'

/**
 * Return type of `useQuery()`.
 */
export interface UseQueryReturn<TResult = unknown, TError = Error> {
  // TODO: is it worth to be a shallowRef?
  data: Ref<TResult | undefined>

  error: ShallowRef<TError | null>

  /**
   * Returns whether the request is still pending its first call. Alias for `status.value === 'pending'`
   */
  isPending: ComputedRef<boolean>

  /**
   * Returns whether the request is currently fetching data.
   */
  isFetching: ShallowRef<boolean>

  /**
   * The status of the query.
   * @see {@link UseQueryStatus}
   */
  status: ShallowRef<UseQueryStatus>

  /**
   * Ensures the current data is fresh. If the data is stale, refetch, if not return as is.
   * @returns a promise that resolves when the refresh is done
   */
  refresh: () => Promise<TResult>

  /**
   * Ignores fresh data and triggers a new fetch
   * @returns a promise that resolves when the refresh is done
   */
  refetch: () => Promise<TResult>
}

/**
 * `true` refetch if data is stale, false never refetch, 'always' always refetch.
 */
export type _RefetchOnControl = boolean | 'always'

/**
 * Key used to identify a query.
 */
export type UseQueryKey = EntryNodeKey | _ObjectFlat
// TODO: if it's worth allowing more complex keys, we could expose an extendable interface  TypesConfig where this is set.

export interface UseQueryOptions<TResult = unknown> {
  /**
   * The key used to identify the query. It should either be an array of primitives without reactive values or a reactive array.
   */
  key: MaybeRefOrGetter<_MaybeArray<UseQueryKey>>

  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
  query: () => Promise<TResult>

  /**
   * Time in ms after which the data is considered stale and will be refreshed on next read
   */
  staleTime?: number

  /**
   * Time in ms after which, once the data is no longer being used, it will be garbage collected to free resources.
   */
  gcTime?: number

  initialData?: () => TResult
  // TODO: rename to refresh since that's the default? and change 'always' to 'force'?
  refetchOnMount?: _RefetchOnControl
  refetchOnWindowFocus?: _RefetchOnControl
  refetchOnReconnect?: _RefetchOnControl
}

/**
 * Default options for `useQuery()`. Modifying this object will affect all the queries that don't override these
 */
export const USE_QUERY_DEFAULTS = {
  staleTime: 1000 * 5, // 5 seconds
  gcTime: 1000 * 60 * 5, // 5 minutes
  // avoid type narrowing to `true`
  refetchOnWindowFocus: true as _RefetchOnControl,
  refetchOnReconnect: true as _RefetchOnControl,
  refetchOnMount: true as _RefetchOnControl,
} satisfies Partial<UseQueryOptions>
// TODO: inject for the app rather than a global variable

export type UseQueryOptionsWithDefaults<TResult = unknown> =
  typeof USE_QUERY_DEFAULTS & UseQueryOptions<TResult>

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

  const refresh = () => entry.value.refresh()
  const refetch = () => entry.value.refetch()

  const queryReturn = {
    data: computed(() => entry.value.data.value),
    error: computed(() => entry.value.error.value),
    isFetching: computed(() => entry.value.isFetching.value),
    isPending: computed(() => entry.value.isPending.value),
    status: computed(() => entry.value.status.value),

    refresh,
    refetch,
  } satisfies UseQueryReturn<TResult, TError>

  const hasCurrentInstance = getCurrentInstance()

  if (hasCurrentInstance) {
    // only happens on server, app awaits this
    onServerPrefetch(async () => {
      await refresh()
      // TODO: after adding a test, remove these lines and refactor the const queryReturn to just a return statement
      // NOTE: workaround to https://github.com/vuejs/core/issues/5300
      // eslint-disable-next-line
      queryReturn.data.value,
        queryReturn.error.value,
        queryReturn.isFetching.value,
        queryReturn.isPending.value
    })
  }

  // should we be watching entry
  let isActive = false
  if (hasCurrentInstance) {
    onMounted(() => {
      isActive = true
    })
  } else {
    isActive = true
  }

  watch(entry, (entry, _, onCleanup) => {
    if (!isActive) return
    entry.refresh()
    onCleanup(() => {
      // TODO: decrement ref count
    })
  })

  // only happens on client
  // we could also call fetch instead but forcing a refresh is more interesting
  if (options.refetchOnMount && hasCurrentInstance) {
    // TODO: optimize so it doesn't refresh if we are hydrating
    onMounted(() => {
      if (options.refetchOnMount === 'always') {
        refetch()
      } else {
        refresh()
      }
    })
  }
  // TODO: we could save the time it was fetched to avoid fetching again. This is useful to not refetch during SSR app but do refetch in SSG apps if the data is stale. Careful with timers and timezones

  onScopeDispose(() => {
    // TODO: add a reference count to the entry and garbage collect it if it's 0 after the given delay
  })

  if (IS_CLIENT) {
    if (options.refetchOnWindowFocus) {
      useEventListener(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (options.refetchOnWindowFocus === 'always') {
            refetch()
          } else {
            refresh()
          }
        }
      })
    }

    if (options.refetchOnReconnect) {
      useEventListener(window, 'online', () => {
        if (options.refetchOnReconnect === 'always') {
          refetch()
        } else {
          refresh()
        }
      })
    }
  }

  return queryReturn
}
