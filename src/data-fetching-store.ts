import { defineStore } from 'pinia'
import {
  type Ref,
  shallowReactive,
  getCurrentScope,
  type ShallowRef,
  ref,
  type ComputedRef,
  computed,
  triggerRef,
} from 'vue'
import type { UseQueryOptionsWithDefaults, UseQueryKey } from './use-query'
import { type _MaybeArray, stringifyFlatObject } from './utils'
import { TreeMapNode } from './tree-map'

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
    new TreeMapNode<UseQueryStateEntry>()
  )
  // these are not reactive as they are mostly functions
  const entryPropertiesRegistry = new TreeMapNode<UseQueryPropertiesEntry>()

  // FIXME: start from here: replace properties entry with a QueryEntry that is created when needed and contains all the needed part, included functions

  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  function ensureEntry<TResult = unknown, TError = Error>(
    keyRaw: UseQueryKey[],
    { fetcher, initialData, staleTime }: UseQueryOptionsWithDefaults<TResult>
  ): UseQueryEntry<TResult, TError> {
    const key = keyRaw.map(stringifyFlatObject)
    // ensure the state
    console.log('⚙️ Ensuring entry', key)
    if (!entryStateRegistry.get(key)) {
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

    if (!entryPropertiesRegistry.get(key)) {
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
          if (entry.pending) console.log('  -> skipped!')
          // when if there an ongoing request
          if (!entry.pending) {
            entry.isFetching.value = true
            entry.error.value = null
            const nextPrevious = {
              when: 0,
              data: undefined as TResult | undefined,
              error: null as TError | null,
            } satisfies UseQueryPropertiesEntry<TResult, TError>['previous']

            // we create an object and verify we are the most recent pending request
            // before doing anything
            const pendingEntry = {
              refreshCall: fetcher()
                .then((data) => {
                  if (pendingEntry === entry.pending) {
                    nextPrevious.data = data
                    entry.data.value = data
                    entry.status.value = 'success'
                  }
                })
                .catch((error) => {
                  if (pendingEntry === entry.pending) {
                    nextPrevious.error = error
                    entry.error.value = error
                    entry.status.value = 'error'
                  }
                })
                .finally(() => {
                  if (pendingEntry === entry.pending) {
                    entry.pending = null
                    nextPrevious.when = Date.now()
                    entry.previous = nextPrevious
                    entry.isFetching.value = false
                  }
                }),
              when: Date.now(),
            }
            entry.pending = pendingEntry
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
  function invalidateEntry(key: UseQueryKey[], refetch = false) {
    const entry = entryPropertiesRegistry.get(key.map(stringifyFlatObject))

    // nothing to invalidate
    if (!entry) {
      return
    }

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

  function setEntryData<TResult = unknown>(
    key: UseQueryKey[],
    data: TResult | ((data: Ref<TResult | undefined>) => void)
  ) {
    const entry = entryStateRegistry.get(key.map(stringifyFlatObject)) as
      | UseQueryStateEntry<TResult>
      | undefined
    if (!entry) {
      return
    }

    if (typeof data === 'function') {
      // the remaining type is TResult & Fn, so we need a cast
      ;(data as (data: Ref<TResult | undefined>) => void)(entry.data)
      triggerRef(entry.data)
    } else {
      entry.data.value = data
    }
    // TODO: complete and test
    entry.error.value = null
  }

  function prefetch(key: UseQueryKey[]) {
    const entry = entryPropertiesRegistry.get(key.map(stringifyFlatObject))
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
    setEntryData,
  }
})

function isExpired(lastRefresh: number, cacheTime: number): boolean {
  return lastRefresh + cacheTime < Date.now()
}
