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

/**
 * The status of the request.
 * - `pending`: initial state
 * - `loading`: anytime a request is being made
 * - `error`: when the last request failed
 * - `success`: when the last request succeeded
 */
export type UseQueryStatus = 'pending' | 'loading' | 'error' | 'success'

/**
 * Raw data of a query entry. Can be serialized from the server and used to hydrate the store.
 */
export interface UseQueryStateEntryRaw<TResult = unknown, TError = unknown> {
  /**
   * The data returned by the query.
   */
  data: TResult | undefined

  /**
   * The error thrown by the query.
   */
  error: TError | null

  /**
   * When was this data fetched the last time in ms
   */
  when: number
}

export class UseQueryEntry<TResult = unknown, TError = any> {
  data: Ref<TResult | undefined>
  error: ShallowRef<TError | null>
  isPending: ComputedRef<boolean> = computed(
    () => this.data.value === undefined
  )
  isFetching = computed(() => this.status.value === 'loading')
  status: ShallowRef<UseQueryStatus>
  when: number
  pending: null | {
    refreshCall: Promise<void>
    when: number
  } = null
  previous: null | UseQueryStateEntryRaw<TResult, TError> = null
  /**
   * Options used to create the query. They can be undefined during hydration but are needed for fetching. This is why `store.ensureEntry()` sets this property.
   */
  options?: UseQueryOptionsWithDefaults<TResult>

  constructor(
    initialData?: TResult,
    error: TError | null = null,
    when: number = 0 // stale by default
  ) {
    this.data = ref(initialData) as Ref<TResult | undefined>
    this.error = shallowRef(error)
    this.when = when
    this.status = shallowRef(
      error ? 'error' : initialData !== undefined ? 'success' : 'pending'
    )
  }

  /**
   * Ensures the current data is fresh. If the data is stale, refetch, if not return as is. Can only be called if the
   * entry has options.
   */
  async refresh(): Promise<TResult> {
    if (process.env.NODE_ENV !== 'production' && !this.options) {
      throw new Error(
        `"entry.refech()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`
      )
    }
    const { key, staleTime } = this.options!

    if (this.error.value || isExpired(this.when, staleTime)) {
      console.log(
        `⬇️ refresh "${String(key)}". expired ${this.when} / ${staleTime}`
      )

      if (this.pending?.refreshCall) console.log('  -> skipped!')

      await (this.pending?.refreshCall ?? this.refetch())
    }

    return this.data.value!
  }

  /**
   * Ignores fresh data and triggers a new fetch. Can only be called if the entry has options.
   */
  async refetch(): Promise<TResult> {
    if (process.env.NODE_ENV !== 'production' && !this.options) {
      throw new Error(
        `"entry.refech()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`
      )
    }

    console.log('🔄 refetching', this.options!.key)
    this.status.value = 'loading'

    // we create an object and verify we are the most recent pending request
    // before doing anything
    const pendingEntry = (this.pending = {
      refreshCall: this.options!.query()
        .then((data) => {
          if (pendingEntry === this.pending) {
            this.error.value = null
            this.data.value = data
            this.status.value = 'success'
          }
        })
        .catch((error) => {
          if (pendingEntry === this.pending) {
            this.error.value = error
            this.status.value = 'error'
          }
        })
        .finally(() => {
          if (pendingEntry === this.pending) {
            this.pending = null
            this.when = Date.now()
            this.previous = {
              data: this.data.value,
              error: this.error.value,
              when: this.when,
            }
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
  const _entriesRaw: UseQueryEntryNodeSerialized[] | undefined =
    existingState.entriesRaw
  // free the memory
  delete existingState.entriesRaw
  const entryRegistry = shallowReactive(createTreeMap(_entriesRaw))

  // FIXME: start from here: replace properties entry with a QueryEntry that is created when needed and contains all the needed part, included functions

  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  function ensureEntry<TResult = unknown, TError = Error>(
    keyRaw: UseQueryKey[],
    options: UseQueryOptionsWithDefaults<TResult>
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
        (entry = scope.run(() => new UseQueryEntry(options.initialData?.()))!)
      )
    }

    if (!entry.options) {
      entry.options = options
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
    const entryNode = entryRegistry.find(key.map(stringifyFlatObject))

    // nothing to invalidate
    if (!entryNode) {
      return
    }

    for (const entry of entryNode) {
      // will force a fetch next time
      entry.when = 0

      // TODO: if active only
      if (refetch) {
        // reset any pending request
        entry.pending = null
        // force refresh
        entry.refetch()
      }
    }
  }

  function setEntryData<TResult = unknown>(
    key: UseQueryKey[],
    data: TResult | ((data: Ref<TResult | undefined>) => void)
  ) {
    const entry = entryRegistry.get(key.map(stringifyFlatObject)) as
      | UseQueryEntry<TResult>
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

  // TODO: find a way to make it possible to prefetch. Right now we need the actual options of the query
  function prefetch(key: UseQueryKey[]) {
    const entry = entryRegistry.get(key.map(stringifyFlatObject))
    if (!entry) {
      console.warn(
        `⚠️ trying to prefetch "${String(key)}" but it's not in the registry`
      )
      return
    }
    entry.refetch()
  }

  return {
    // TODO: remove
    entriesRaw,
    entryRegistry,

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
   * The data returned by the query.
   */
  data: TResult | undefined,

  /**
   * The error thrown by the query.
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
  raw: UseQueryEntryNodeSerialized[] = []
): TreeMapNode<UseQueryEntry> {
  const root = new TreeMapNode<UseQueryEntry>()

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
