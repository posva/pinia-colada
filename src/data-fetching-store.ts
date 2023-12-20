import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import type {
  UseQueryOptionsWithDefaults,
  UseDataFetchingQueryEntry,
  UseQueryKey,
} from './use-query'

export const useDataFetchingStore = defineStore('PiniaColada', () => {
  /**
   * - These are reactive because they are needed for SSR
   * - They are split into multiple stores to better handle reactivity
   * - With `shallowReactive()` we only observe the first level of the object, which is enough here as the user only
   *   gets read-only access to the data
   */
  const dataRegistry = shallowReactive(new Map<UseQueryKey, unknown>())
  const errorRegistry = shallowReactive(new Map<UseQueryKey, any>())
  const isFetchingRegistry = shallowReactive(new Map<UseQueryKey, boolean>())

  // no reactive on this one as it's only used internally and is not needed for hydration
  const queryEntriesRegistry = new Map<
    UseQueryKey,
    UseDataFetchingQueryEntry<unknown, unknown>
  >()

  function ensureEntry<TResult = unknown, TError = Error>(
    key: UseQueryKey,
    {
      fetcher,
      initialData: initialValue,
      staleTime: cacheTime,
    }: UseQueryOptionsWithDefaults<TResult>
  ): UseDataFetchingQueryEntry<TResult, TError> {
    // ensure the data
    console.log('⚙️ Ensuring entry', key)
    if (!dataRegistry.has(key)) {
      dataRegistry.set(key, initialValue?.() ?? undefined)
      errorRegistry.set(key, null)
      isFetchingRegistry.set(key, false)
    }

    // we need to repopulate the entry registry separately from data and errors
    if (!queryEntriesRegistry.has(key)) {
      const entry: UseDataFetchingQueryEntry<TResult, TError> = {
        data: () => dataRegistry.get(key) as TResult,
        error: () => errorRegistry.get(key) as TError,
        // FIXME: not reactive
        isPending: () => !entry.previous,
        isFetching: () => isFetchingRegistry.get(key)!,
        pending: null,
        previous: null,
        async fetch(): Promise<TResult> {
          if (!entry.previous || isExpired(entry.previous.when, cacheTime)) {
            if (entry.previous) {
              console.log(
                `⬇️ fetching "${String(key)}". expired ${entry.previous
                  ?.when} / ${cacheTime}`
              )
            }
            await (entry.pending?.refreshCall ?? entry.refresh())
          }

          return entry.data()!
        },
        async refresh() {
          console.log('🔄 refreshing', key)
          // when if there an ongoing request
          if (entry.pending) {
            console.log('  -> skipped!')
            return entry.pending.refreshCall
          }
          isFetchingRegistry.set(key, true)
          errorRegistry.set(key, null)
          const nextPrevious = {
            when: 0,
            data: undefined as TResult | undefined,
            error: null as TError | null,
          } satisfies UseDataFetchingQueryEntry['previous']

          entry.pending = {
            refreshCall: fetcher()
              .then((data) => {
                nextPrevious.data = data
                dataRegistry.set(key, data)
              })
              .catch((error) => {
                nextPrevious.error = error
                errorRegistry.set(key, error)
                throw error
              })
              .finally(() => {
                entry.pending = null
                nextPrevious.when = Date.now()
                entry.previous = nextPrevious
                isFetchingRegistry.set(key, false)
              }),
            when: Date.now(),
          }

          return entry.pending.refreshCall
        },
      }
      queryEntriesRegistry.set(key, entry)
    }

    const entry = queryEntriesRegistry.get(key)!
    // automatically try to refresh the data if it's expired
    entry.fetch()

    return entry as UseDataFetchingQueryEntry<TResult, TError>
  }

  /**
   * Invalidates a query entry, forcing a refetch of the data if `refresh` is true
   *
   * @param key - the key of the query to invalidate
   * @param refresh - whether to force a refresh of the data
   */
  function invalidateEntry(key: UseQueryKey, refresh = false) {
    if (!queryEntriesRegistry.has(key)) {
      console.warn(
        `⚠️ trying to invalidate "${String(key)}" but it's not in the registry`
      )
      return
    }
    const entry = queryEntriesRegistry.get(key)!

    if (entry.previous) {
      // will force a fetch next time
      entry.previous.when = 0
    }

    if (refresh) {
      // reset any pending request
      entry.pending = null
      // force refresh
      entry.refresh()
    }
  }

  return {
    dataRegistry,
    errorRegistry,
    isFetchingRegistry,

    ensureEntry,
    invalidateEntry,
  }
})

function isExpired(lastRefresh: number, cacheTime: number): boolean {
  return lastRefresh + cacheTime < Date.now()
}
