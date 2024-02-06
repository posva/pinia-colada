import { StateTree, StoreGeneric, defineStore, getActivePinia } from 'pinia'
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
import {
  type _MaybeArray,
  stringifyFlatObject,
  type _JSONPrimitive,
} from './utils'
import { type EntryNodeKey, TreeMapNode } from './tree-map'
import {
  type UseQueryOptionsWithDefaults,
  type UseQueryKey,
} from './query-options'

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

export interface UseQueryEntry<TResult = unknown, TError = any> {
  data: ShallowRef<TResult | undefined>
  error: ShallowRef<TError | null>
  status: ShallowRef<UseQueryStatus>
  isPending: ComputedRef<boolean>
  isFetching: ComputedRef<boolean>
  when: number
  pending: null | {
    refreshCall: Promise<void>
    when: number
  }
  /**
   * Options used to create the query. They can be undefined during hydration but are needed for fetching. This is why `store.ensureEntry()` sets this property.
   */
  options?: UseQueryOptionsWithDefaults<TResult>
}

function createQueryEntry<TResult = unknown, TError = unknown>(
  initialData?: TResult,
  error: TError | null = null,
  when: number = 0 // stale by default
): UseQueryEntry<TResult, TError> {
  const data = shallowRef(initialData)
  const status = shallowRef<UseQueryStatus>(
    error ? 'error' : initialData !== undefined ? 'success' : 'pending'
  )
  return {
    data,
    error: shallowRef(error),
    when,
    status,
    isPending: computed(() => initialData === undefined),
    isFetching: computed(() => status.value === 'loading'),
    pending: null,
  }
}

// debug only
export const queryEntry_toJSON = <TResult, TError>(
  entry: UseQueryEntry<TResult, TError>
): _UseQueryEntryNodeValueSerialized<TResult, TError> => [
  entry.data.value,
  entry.error.value,
  entry.when,
]

export const queryEntry_toString = <TResult, TError>(
  entry: UseQueryEntry<TResult, TError>
) => String(queryEntry_toJSON(entry))

/**
 * The id of the store used for queries.
 * @internal
 */
export const QUERY_STORE_ID = '_pc_query'

export const useDataFetchingStore = defineStore(QUERY_STORE_ID, () => {
  /**
   * Raw data of the entries. Only used to hydrate the store on the server. Not synced with the actual data.
   */
  const entriesRaw = shallowReactive(new TreeMapNode<UseQueryStateEntryRaw>())
  const existingState: StateTree | undefined =
    getActivePinia()!.state.value[QUERY_STORE_ID]
  const _entriesRaw: UseQueryEntryNodeSerialized[] | undefined =
    existingState?.entriesRaw
  // free the memory
  if (existingState) {
    delete existingState.entriesRaw
  }
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
        (entry = scope.run(() => createQueryEntry(options.initialData?.()))!)
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
   * @param shouldRefetch - whether to force a refresh of the data
   */
  function invalidateEntry(key: UseQueryKey[], shouldRefetch = false) {
    const entryNode = entryRegistry.find(key.map(stringifyFlatObject))

    // nothing to invalidate
    if (!entryNode) {
      return
    }

    for (const entry of entryNode) {
      // will force a fetch next time
      entry.when = 0

      // TODO: if active only
      if (shouldRefetch) {
        // reset any pending request
        entry.pending = null
        // force refresh
        refetch(entry)
      }
    }
  }

  /**
   * Ensures the current data is fresh. If the data is stale, refetch, if not return as is. Can only be called if the
   * entry has options.
   */
  async function refresh<TResult, TError>(
    entry: UseQueryEntry<TResult, TError>
  ): Promise<TResult> {
    if (process.env.NODE_ENV !== 'production' && !entry.options) {
      throw new Error(
        `"entry.refech()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`
      )
    }
    const { key, staleTime } = entry.options!

    if (entry.error.value || isExpired(entry.when, staleTime)) {
      console.log(
        `⬇️ refresh "${String(key)}". expired ${entry.when} / ${staleTime}`
      )

      if (entry.pending?.refreshCall) console.log('  -> skipped!')

      await (entry.pending?.refreshCall ?? refetch(entry))
    }

    return entry.data.value!
  }

  /**
   * Ignores fresh data and triggers a new fetch. Can only be called if the entry has options.
   */
  async function refetch<TResult, TError>(
    entry: UseQueryEntry<TResult, TError>
  ): Promise<TResult> {
    if (process.env.NODE_ENV !== 'production' && !entry.options) {
      throw new Error(
        `"entry.refech()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`
      )
    }

    console.log('🔄 refetching', entry.options!.key)
    entry.status.value = 'loading'

    // we create an object and verify we are the most recent pending request
    // before doing anything
    const pendingCall = (entry.pending = {
      refreshCall: entry
        .options!.query()
        .then((data) => {
          if (pendingCall === entry.pending) {
            entry.error.value = null
            entry.data.value = data
            entry.status.value = 'success'
          }
        })
        .catch((error) => {
          if (pendingCall === entry.pending) {
            entry.error.value = error
            entry.status.value = 'error'
          }
        })
        .finally(() => {
          if (pendingCall === entry.pending) {
            entry.pending = null
            entry.when = Date.now()
          }
        }),
      when: Date.now(),
    })

    await entry.pending.refreshCall

    return entry.data.value!
  }

  // TODO: tests
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
    return refetch(entry)
  }

  return {
    // TODO: remove
    entriesRaw,
    entryRegistry,

    ensureEntry,
    invalidateEntry,
    setEntryData,

    refetch,
    refresh,
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
    tree.value && queryEntry_toJSON(tree.value),
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
    value && createQueryEntry(...value)
  )
  parent.children.set(key, node)
  if (children) {
    for (const child of children) {
      appendToTree(node, child)
    }
  }
}
