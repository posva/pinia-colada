import { defineStore, getActivePinia } from 'pinia'
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
import type {
  UseQueryOptionsWithDefaults,
  UseQueryKey,
  UseQueryOptions,
} from './use-query'
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

// TODO: rename to avoid conflict
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

// export interface UseQueryEntry<TResult = unknown, TError = Error>
//   extends UseQueryStateEntry<TResult, TError>,
//     UseQueryPropertiesEntry<TResult, TError> {}

export class UseQueryEntry<TResult = unknown, TError = any> {
  data: Ref<TResult | undefined>
  error: ShallowRef<TError | null>
  isPending: ComputedRef<boolean> = computed(
    () => this.status.value === 'pending'
  )
  isFetching: ShallowRef<boolean> = shallowRef(false)
  status: ShallowRef<UseQueryStatus>
  when: number
  pending: null | {
    refreshCall: Promise<void>
    when: number
  } = null
  previous: null | UseQueryStateEntryRaw<TResult, TError> = null

  constructor(
    initialData?: TResult,
    error: TError | null = null,
    when: number = Date.now()
  ) {
    this.data = ref(initialData) as Ref<TResult | undefined>
    this.error = shallowRef(error)
    this.when = when
    this.status = shallowRef(
      error ? 'error' : initialData !== undefined ? 'success' : 'pending'
    )
  }

  async refresh(
    options: UseQueryOptionsWithDefaults<TResult>
  ): Promise<TResult> {
    if (
      this.error.value ||
      !this.previous ||
      isExpired(this.previous.when, options.staleTime)
    ) {
      if (this.previous) {
        const { key, staleTime } = options
        console.log(
          `⬇️ refresh "${String(key)}". expired ${this.previous
            ?.when} / ${staleTime}`
        )
      }

      if (this.pending?.refreshCall) console.log('  -> skipped!')

      await (this.pending?.refreshCall ?? this.refetch(options))
    }

    return this.data.value!
  }

  async refetch(
    options: UseQueryOptionsWithDefaults<TResult>
  ): Promise<TResult> {
    console.log('🔄 refetching', options.key)
    this.isFetching.value = true
    // will become this.previous once fetched
    const nextPrevious = {
      when: 0,
      data: undefined as TResult | undefined,
      error: null as TError | null,
    } satisfies UseQueryPropertiesEntry<TResult, TError>['previous']

    // we create an object and verify we are the most recent pending request
    // before doing anything
    const pendingEntry = (this.pending = {
      refreshCall: options
        .fetcher()
        .then((data) => {
          if (pendingEntry === this.pending) {
            nextPrevious.data = data
            this.error.value = null
            this.data.value = data
            this.status.value = 'success'
          }
        })
        .catch((error) => {
          if (pendingEntry === this.pending) {
            nextPrevious.error = error
            this.error.value = error
            this.status.value = 'error'
          }
        })
        .finally(() => {
          if (pendingEntry === this.pending) {
            this.pending = null
            nextPrevious.when = Date.now()
            this.previous = nextPrevious
            this.isFetching.value = false
          }
        }),
      when: Date.now(),
    })

    await this.pending.refreshCall

    return this.data.value!
  }

  // debug only
  toJSON(): _UseQueryEntryNodeValueSerialized<TResult, TError> {
    return [this.data.value, this.error.value, this.when]
  }
  toString() {
    return String(this.toJSON())
  }
}

export const useDataFetchingStore = defineStore('PiniaColada', () => {
  /**
   * Raw data of the entries. Only used to hydrate the store on the server. Not synced with the actual data.
   */
  const entriesRaw = shallowReactive(new TreeMapNode<UseQueryStateEntryRaw>())
  const existingState = getActivePinia()!.state.value.PiniaColada
  const _entriesRaw: UseQueryStateEntryRaw | undefined =
    existingState.entriesRaw
  // free the memory
  delete existingState.entriesRaw
  const entryRegistry = shallowReactive(new TreeMapNode<UseQueryEntry>())
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
    let entry = entryRegistry.get(key) as
      | UseQueryEntry<TResult, TError>
      | undefined
    if (!entry) {
      entryRegistry.set(
        key,
        (entry = scope.run(() => new UseQueryEntry(initialData?.()))!)
      )
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
    const entry = entryRegistry.get(key.map(stringifyFlatObject)) as
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
    entriesRaw,
    entryStateRegistry: entryRegistry,

    ensureEntry,
    invalidateEntry,
    setEntryData,
  }
})

function isExpired(lastRefresh: number, staleTime: number): boolean {
  return Date.now() > lastRefresh + staleTime
}

/**
 * Raw data of a query entry. Can be serialized from the server and used to hydrate the store.
 */
export type _UseQueryEntryNodeValueSerialized<
  TResult = unknown,
  TError = unknown,
> = [
  /**
   * The data returned by the fetcher.
   */
  data: TResult | undefined,

  /**
   * The error thrown by the fetcher.
   */
  error: TError | null,

  /**
   * When was this data fetched the last time in ms
   */
  when?: number,
]

type UseQueryEntryNodeSerialized = [
  key: EntryNodeKey,
  value: undefined | _UseQueryEntryNodeValueSerialized,
  children?: UseQueryEntryNodeSerialized[],
]

export function serialize(
  root: TreeMapNode<UseQueryEntry>
): UseQueryEntryNodeSerialized[] {
  return root.children ? [...root.children.entries()].map(_serialize) : []
}

function _serialize([key, tree]: [
  key: EntryNodeKey,
  tree: TreeMapNode<UseQueryEntry>,
]): UseQueryEntryNodeSerialized {
  return [
    key,
    tree.value?.toJSON(),
    tree.children && [...tree.children.entries()].map(_serialize),
  ]
}

export function createTreeMap(
  raw?: UseQueryEntryNodeSerialized[]
): TreeMapNode<UseQueryEntry> {
  const root = new TreeMapNode<UseQueryEntry>()
  if (!raw) {
    return root
  }

  for (const entry of raw) {
    appendToTree(root, entry)
  }
  return root
}

function appendToTree(
  parent: TreeMapNode<UseQueryEntry>,
  [key, value, children]: UseQueryEntryNodeSerialized
) {
  parent.children ??= new Map()
  const node = new TreeMapNode<UseQueryEntry>(
    [],
    value && new UseQueryEntry(...value)
  )
  parent.children.set(key, node)
  if (children) {
    for (const child of children) {
      appendToTree(node, child)
    }
  }
}
