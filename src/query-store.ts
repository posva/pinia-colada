import { defineStore } from 'pinia'
import {
  type ComputedRef,
  type Ref,
  type ShallowRef,
  computed,
  getCurrentScope,
  shallowReactive,
  shallowRef,
  toValue,
  triggerRef,
} from 'vue'
import { stringifyFlatObject } from './utils'
import { type EntryNodeKey, TreeMapNode } from './tree-map'
import type { EntryKey } from './entry-options'
import type { UseQueryOptionsWithDefaults } from './query-options'
import type { ErrorDefault } from './types-extension'
import type { defineQuery } from './define-query'

/**
 * The status of the request.
 * - `pending`: initial state
 * - `loading`: request is being made
 * - `error`: when the last request failed
 * - `success`: when the last request succeeded
 */
export type QueryStatus = 'pending' | 'loading' | 'error' | 'success'

/**
 * Properties of a query entry that will be exposed to the user. Split to keep the documented properties in one place.
 * @internal
 */
export interface _UseQueryEntry_State<TResult, TError> {
  /**
   * The last successful data resolved by the query.
   */
  data: ShallowRef<TResult | undefined>

  /**
   * The error rejected by the query.
   */
  error: ShallowRef<TError | null>

  /**
   * The status of the query.
   * @see {@link QueryStatus}
   */
  status: ShallowRef<QueryStatus>
  /**
   * Returns whether the request is still pending its first call. Alias for `status.value === 'pending'`
   */
  isPending: ComputedRef<boolean>

  /**
   * Returns whether the request is currently fetching data.
   */
  isFetching: ShallowRef<boolean>
}

export interface UseQueryEntry<TResult = unknown, TError = unknown>
  extends _UseQueryEntry_State<TResult, TError> {
  /**
   * When was this data fetched the last time in ms
   */
  when: number

  pending: null | {
    abortController: AbortController
    refreshCall: Promise<void>
    when: number
  }

  /**
   * Options used to create the query. They can be undefined during hydration but are needed for fetching. This is why `store.ensureEntry()` sets this property.
   */
  options?: UseQueryOptionsWithDefaults<TResult, TError>
}

/**
 * Creates a new query entry.
 *
 * @internal
 * @param initialData - initial data to set
 * @param error - initial error to set
 * @param when - when the data was fetched the last time. defaults to 0, meaning it's stale
 */
export function createQueryEntry<TResult = unknown, TError = ErrorDefault>(
  initialData?: TResult,
  error: TError | null = null,
  when: number = 0, // stale by default
): UseQueryEntry<TResult, TError> {
  const data = shallowRef(initialData)
  const status = shallowRef<QueryStatus>(
    error ? 'error' : initialData !== undefined ? 'success' : 'pending',
  )
  return {
    data,
    error: shallowRef(error),
    when,
    status,
    isPending: computed(() => data.value === undefined),
    isFetching: computed(() => status.value === 'loading'),
    pending: null,
  }
}

/**
 * UseQueryEntry method to serialize the entry to JSON.
 *
 * @param entry - entry to serialize
 * @returns Serialized version of the entry
 */
export const queryEntry_toJSON: <TResult, TError>(
  entry: UseQueryEntry<TResult, TError>,
) => _UseQueryEntryNodeValueSerialized<TResult, TError> = (entry) => [
  entry.data.value,
  entry.error.value,
  entry.when,
]

/**
 * UseQueryEntry method to serialize the entry to a string.
 *
 * @internal
 * @param entry - entry to serialize
 * @returns Stringified version of the entry
 */
export const queryEntry_toString: <TResult, TError>(
  entry: UseQueryEntry<TResult, TError>,
) => string = (entry) => String(queryEntry_toJSON(entry))

/**
 * The id of the store used for queries.
 * @internal
 */
export const QUERY_STORE_ID = '_pc_query'

export const useQueryCache = defineStore(QUERY_STORE_ID, () => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new TreeMapNode<UseQueryEntry<unknown, unknown>>()
  const caches = shallowReactive(cachesRaw)

  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  const defineQueryMap = new WeakMap<() => unknown, any>()
  function ensureDefinedQuery<T>(fn: () => T): T {
    if (!defineQueryMap.has(fn)) {
      defineQueryMap.set(fn, scope.run(fn)!)
    }
    return defineQueryMap.get(fn)!
  }

  function ensureEntry<TResult = unknown, TError = ErrorDefault>(
    keyRaw: EntryKey,
    options: UseQueryOptionsWithDefaults<TResult, TError>,
  ): UseQueryEntry<TResult, TError> {
    if (process.env.NODE_ENV !== 'production' && keyRaw.length === 0) {
      throw new Error(
        `useQuery() was called with an empty array as the key. It must have at least one element.`,
      )
    }
    const key = keyRaw.map(stringifyFlatObject)
    // ensure the state
    // console.log('⚙️ Ensuring entry', key)
    let entry = cachesRaw.get(key) as UseQueryEntry<TResult, TError> | undefined
    if (!entry) {
      cachesRaw.set(
        key,
        (entry = scope.run(() => createQueryEntry(options.initialData?.()))!),
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
   * @param options - options to invalidate the query
   * @param options.exact - if true, it will only invalidate the exact query, not the children
   * @param options.refetch - if true, it will refetch the data
   */
  function invalidateEntry(
    key: EntryKey,
    {
      refetch: shouldRefetch = true,
      exact = false,
    }: {
      refetch?: boolean
      exact?: boolean
    } = {},
  ) {
    const entryNode = cachesRaw.find(key.map(stringifyFlatObject))

    // nothing to invalidate
    if (!entryNode) return

    const list = exact
      ? entryNode.value != null
        ? [entryNode.value]
        : []
      : [...entryNode]
    for (const entry of list) {
      // will force a fetch next time
      entry.when = 0

      // TODO: if active only
      if (shouldRefetch) {
        // reset any pending request
        entry.pending = null
        // force refresh
        // TODO: test that it returns a promise that resolves when the refresh is done
        return refetch(entry)
      }
    }
  }

  /**
   * Ensures the current data is fresh. If the data is stale, refetch, if not return as is. Can only be called if the
   * entry has options.
   */
  async function refresh<TResult, TError>(
    entry: UseQueryEntry<TResult, TError>,
  ): Promise<TResult> {
    if (process.env.NODE_ENV !== 'production' && !entry.options) {
      throw new Error(
        `"entry.refresh()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`,
      )
    }
    const { staleTime } = entry.options!
    const _key = toValue(entry.options!.key).map(stringifyFlatObject)

    if (entry.error.value || isExpired(entry.when, staleTime)) {
      // console.log(`⬇️ refresh "${key}". expired ${entry.when} / ${staleTime}`)

      // if (entry.pending?.refreshCall) console.log('  -> skipped!')

      await (entry.pending?.refreshCall ?? refetch(entry))
    }

    // console.log(`${key}  ->`, entry.data.value, entry.error.value)

    return entry.data.value!
  }

  /**
   * Ignores fresh data and triggers a new fetch. Can only be called if the entry has options.
   */
  async function refetch<TResult, TError>(
    entry: UseQueryEntry<TResult, TError>,
  ): Promise<TResult> {
    if (process.env.NODE_ENV !== 'production' && !entry.options) {
      throw new Error(
        `"entry.refetch()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`,
      )
    }

    const _key = toValue(entry.options!.key).map(stringifyFlatObject)

    // console.log('🔄 refetching', key)
    entry.status.value = 'loading'

    // we create an object and verify we are the most recent pending request
    // before doing anything
    const abortController = new AbortController()
    const { signal } = abortController
    // abort any ongoing request
    // TODO: test
    entry.pending?.abortController.abort()

    const pendingCall = (entry.pending = {
      abortController,
      refreshCall: entry
        .options!.query({ signal })
        .then((data) => {
          if (pendingCall === entry.pending && !signal.aborted) {
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

    await pendingCall.refreshCall

    // console.log('🔄 refetched', key)
    // console.log('  ->', entry.data.value, entry.error.value)

    return entry.data.value!
  }

  // TODO: tests, remove function version
  function setQueryData<TResult = unknown>(
    key: EntryKey,
    data: TResult | ((data: Ref<TResult | undefined>) => void),
  ) {
    const entry = caches.get(key.map(stringifyFlatObject)) as
      | UseQueryEntry<TResult>
      | undefined
    // TODO: Should it create the entry?
    if (!entry) return

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

  function getQueryData<TResult = unknown>(
    key: EntryKey,
  ): TResult | undefined {
    const entry = caches.get(key.map(stringifyFlatObject)) as
      | UseQueryEntry<TResult>
      | undefined
    return entry?.data.value
  }

  // TODO: find a way to make it possible to prefetch. Right now we need the actual options of the query
  function _preload(_useQueryFn: ReturnType<typeof defineQuery>) {}

  return {
    caches,
    // TODO: figure out if worth or eslint is enough
    // used to warn the user against wrong usage and redirect them to the docs
    // to use `defineQuery()` instead
    // warnChecksMap:
    //   process.env.NODE_ENV !== 'production'
    //     ? new WeakMap<object, boolean>()
    //     : undefined,

    ensureEntry,
    ensureDefinedQuery,
    invalidateEntry,
    setQueryData,
    getQueryData,

    refetch,
    refresh,
  }
})

function isExpired(lastRefresh: number, staleTime: number): boolean {
  return Date.now() > lastRefresh + staleTime
}

/**
 * Raw data of a query entry. Can be serialized from the server and used to hydrate the store.
 * @internal
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

/**
 * Serialized version of a query entry node.
 * @internal
 */
export type UseQueryEntryNodeSerialized = [
  key: EntryNodeKey,
  value: undefined | _UseQueryEntryNodeValueSerialized,
  children?: UseQueryEntryNodeSerialized[],
]

/**
 * Transform a tree into a compressed array.
 * @param root - root node of the tree
 * @returns Array representation of the tree
 */
export function serialize(
  root: TreeMapNode<UseQueryEntry>,
): UseQueryEntryNodeSerialized[] {
  return root.children ? [...root.children.entries()].map(_serialize) : []
}

/**
 * Internal function to recursively transform the tree into a compressed array.
 * @internal
 */
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

// TODO: rename to revive or similar to better convey the idea of hydrating

export function createTreeMap(
  raw: UseQueryEntryNodeSerialized[] = [],
): TreeMapNode<UseQueryEntry> {
  const root = new TreeMapNode<UseQueryEntry>()

  for (const entry of raw) {
    appendToTree(root, entry)
  }
  return root
}

function appendToTree(
  parent: TreeMapNode<UseQueryEntry>,
  [key, value, children]: UseQueryEntryNodeSerialized,
) {
  parent.children ??= new Map()
  const node = new TreeMapNode<UseQueryEntry>(
    [],
    value && createQueryEntry(...value),
  )
  parent.children.set(key, node)
  if (children) {
    for (const child of children) {
      appendToTree(node, child)
    }
  }
}
