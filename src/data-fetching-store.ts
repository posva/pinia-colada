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
  shallowRef,
} from 'vue'
import type { UseQueryOptionsWithDefaults, UseQueryKey } from './use-query'
import { type _MaybeArray, stringifyFlatObject, _JSONPrimitive } from './utils'
import { EntryNodeKey, TreeMapNode } from './tree-map'

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
  isFetching: ShallowRef<boolean>

  /**
   * The status of the request. `pending` indicates that no request has been made yet and there is no cached data to
   * display (`data.value = undefined`). `error` indicates that the last request failed. `success` indicates that the
   * last request succeeded.
   */
  status: ShallowRef<UseQueryStatus>
}

/**
 * Raw data of a query entry. Can be serialized from the server and used to hydrate the store.
 */
export interface UseQueryStateEntryRaw<TResult = unknown, TError = unknown> {
  /**
   * The data returned by the fetcher.
   */
  data: TResult | undefined

  /**
   * The error thrown by the fetcher.
   */
  error: TError | null

  /**
   * When was this data fetched the last time in ms
   */
  when: number
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

  previous: null | UseQueryStateEntryRaw<TResult, TError>
}

export interface UseQueryEntry<TResult = unknown, TError = Error>
  extends UseQueryStateEntry<TResult, TError>,
    UseQueryPropertiesEntry<TResult, TError> {}

export const useDataFetchingStore = defineStore('PiniaColada', () => {
  const entryStateRegistry = shallowReactive(
    new TreeMapNode<UseQueryStateEntry>()
  )
  // these are not reactive as they are mostly functions and should not be serialized as part of the state
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
          const status = shallowRef<UseQueryStatus>('pending')

          return {
            data: ref(initialData?.()),
            error: shallowRef(null),
            isPending: computed(() => status.value === 'pending'),
            isFetching: shallowRef(false),
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

            if (entry.pending?.refreshCall) console.log('  -> skipped!')

            await (entry.pending?.refreshCall ?? entry.refetch())
          }

          return entry.data.value!
        },
        async refetch(): Promise<TResult> {
          console.log('🔄 refetching', key)
          entry.isFetching.value = true
          entry.error.value = null
          const nextPrevious = {
            when: 0,
            data: undefined as TResult | undefined,
            error: null as TError | null,
          } satisfies UseQueryPropertiesEntry<TResult, TError>['previous']

          // we create an object and verify we are the most recent pending request
          // before doing anything
          const pendingEntry = (entry.pending = {
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
          })

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
      // FIXME: spread properties that are overridden later on
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
      entry.refetch()
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

function isExpired(lastRefresh: number, staleTime: number): boolean {
  return Date.now() > lastRefresh + staleTime
}

type UseQueryEntryNodeSerialized = [
  value: undefined | [data: unknown, error: unknown],
  children?: Record<string, UseQueryEntryNodeSerialized>,
]

export function serialize(
  tree: TreeMapNode<UseQueryEntry>
): UseQueryEntryNodeSerialized {
  return [
    // undefined becomes null within an array when converted to JSON
    tree.value && [tree.value.data.value, tree.value.error.value],
    tree.children &&
      [...tree.children.entries()].reduce<
        Record<string, UseQueryEntryNodeSerialized>
      >((acc, [key, child]) => {
        acc[String(key)] = serialize(child)
        return acc
      }, {}),
  ]
}
