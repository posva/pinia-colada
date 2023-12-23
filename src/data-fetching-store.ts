import { defineStore } from 'pinia'
import {
  type Ref,
  shallowReactive,
  getCurrentScope,
  ShallowRef,
  ref,
  ComputedRef,
  computed,
} from 'vue'
import type { UseQueryOptionsWithDefaults, UseQueryKey } from './use-query'

export type UseQueryStatus = 'pending' | 'error' | 'success'

export interface UseQueryStateEntry<TResult = unknown, TError = unknown> {
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
  isFetching: Ref<boolean>

  /**
   * The status of the request. `pending` indicates that no request has been made yet and there is no cached data to
   * display (`data.value = undefined`). `error` indicates that the last request failed. `success` indicates that the
   * last request succeeded.
   */
  status: Ref<UseQueryStatus>
}

export interface UseQueryPropertiesEntry<TResult = unknown, TError = unknown> {
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

export interface UseQueryEntry<TResult = unknown, TError = Error>
  extends UseQueryStateEntry<TResult, TError>,
    UseQueryPropertiesEntry<TResult, TError> {}

export const useDataFetchingStore = defineStore('PiniaColada', () => {
  const entryStateRegistry = shallowReactive(
    new Map<UseQueryKey, UseQueryStateEntry>()
  )
  // these are not reactive as they are mostly functions
  const entryPropertiesRegistry = new Map<
    UseQueryKey,
    UseQueryPropertiesEntry
  >()

  // FIXME: start from here: replace properties entry with a QueryEntry that is created when needed and contains all the needed part, included functions

  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  function ensureEntry<TResult = unknown, TError = Error>(
    key: UseQueryKey,
    { fetcher, initialData, staleTime }: UseQueryOptionsWithDefaults<TResult>
  ): UseQueryEntry<TResult, TError> {
    // ensure the state
    console.log('⚙️ Ensuring entry', key)
    if (!entryStateRegistry.has(key)) {
      entryStateRegistry.set(
        key,
        scope.run(() => {
          const status = ref<UseQueryStatus>('pending')

          return {
            data: ref(initialData?.()),
            error: ref(null),
            isPending: computed(() => status.value === 'pending'),
            isFetching: ref(false),
            status,
          }
        })!
      )
    }

    // TODO: these needs to be created client side. Should probably be a class for better memory

    if (!entryPropertiesRegistry.has(key)) {
      const propertiesEntry: UseQueryPropertiesEntry<TResult, TError> = {
        pending: null,
        previous: null,
        async refresh(): Promise<TResult> {
          if (!entry.previous || isExpired(entry.previous.when, staleTime)) {
            if (entry.previous) {
              console.log(
                `⬇️ refresh "${String(key)}". expired ${entry.previous
                  ?.when} / ${staleTime}`
              )
            }
            await (entry.pending?.refreshCall ?? entry.refetch())
          }

          return entry.data.value!
        },
        async refetch(): Promise<TResult> {
          console.log('🔄 refetching', key)
          // when if there an ongoing request
          if (!entry.pending) {
            console.log('  -> skipped!')
            entry.isFetching.value = true
            entry.error.value = null
            const nextPrevious = {
              when: 0,
              data: undefined as TResult | undefined,
              error: null as TError | null,
            } satisfies UseQueryPropertiesEntry<TResult, TError>['previous']

            entry.pending = {
              refreshCall: fetcher()
                .then((data) => {
                  nextPrevious.data = data
                  entry.data.value = data
                  entry.status.value = 'success'
                })
                .catch((error) => {
                  nextPrevious.error = error
                  entry.error.value = error
                  entry.status.value = 'error'
                })
                .finally(() => {
                  entry.pending = null
                  nextPrevious.when = Date.now()
                  entry.previous = nextPrevious
                  entry.isFetching.value = false
                }),
              when: Date.now(),
            }
          }

          await entry.pending.refreshCall

          return entry.data.value!
        },
      }
      entryPropertiesRegistry.set(key, propertiesEntry)
    }

    const stateEntry = entryStateRegistry.get(key)! as UseQueryStateEntry<
      TResult,
      TError
    >
    const propertiesEntry = entryPropertiesRegistry.get(
      key
    )! as UseQueryPropertiesEntry<TResult, TError>

    const entry = {
      ...stateEntry,
      ...propertiesEntry,
    }

    return entry
  }

  /**
   * Invalidates a query entry, forcing a refetch of the data if `refetch` is true
   *
   * @param key - the key of the query to invalidate
   * @param refetch - whether to force a refresh of the data
   */
  function invalidateEntry(key: UseQueryKey, refetch = false) {
    if (!entryPropertiesRegistry.has(key)) {
      // TODO: dev only
      console.warn(
        `⚠️ trying to invalidate "${String(key)}" but it's not in the registry`
      )
      return
    }
    const entry = entryPropertiesRegistry.get(key)!

    if (entry.previous) {
      // will force a fetch next time
      entry.previous.when = 0
    }

    if (refetch) {
      // reset any pending request
      entry.pending = null
      // force refresh
      entry.refresh()
    }
  }

  function prefetch(key: UseQueryKey) {
    const entry = entryPropertiesRegistry.get(key)
    if (!entry) {
      console.warn(
        `⚠️ trying to prefetch "${String(key)}" but it's not in the registry`
      )
      return
    }
    entry.refetch()
  }

  return {
    entryStateRegistry,

    ensureEntry,
    invalidateEntry,
  }
})

function isExpired(lastRefresh: number, cacheTime: number): boolean {
  return lastRefresh + cacheTime < Date.now()
}
