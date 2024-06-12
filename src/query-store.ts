import { defineStore } from 'pinia'
import {
  type ComponentInternalInstance,
  type ComputedRef,
  type EffectScope,
  type Ref,
  type ShallowRef,
  computed,
  getCurrentScope,
  shallowReactive,
  shallowRef,
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

  /**
   * The key associated with this query entry.
   */
  key: EntryNodeKey[]

  /**
   * Components and effects scopes that use this query entry.
   */
  deps: Set<unknown>

  /**
   * Timeout id that scheduled a garbage collection. It is set here to clear it when the entry is used by a different component
   */
  gcTimeout: ReturnType<typeof setTimeout> | undefined

  pending: null | {
    abortController: AbortController
    refreshCall: Promise<void>
    when: number
  }

  /**
   * Options used to create the query. They can be undefined during hydration but are needed for fetching. This is why `store.ensureEntry()` sets this property.
   */
  options: UseQueryOptionsWithDefaults<TResult, TError> | null
  // TODO: ideally shouldn't be null, there should be different kind of types

  /**
   * Whether the data is stale or not, requires `options.staleTime` to be set.
   */
  readonly stale: boolean
}

export function queryEntry_addDep(
  entry: UseQueryEntry,
  effect: EffectScope | ComponentInternalInstance | null | undefined,
) {
  if (!effect) return
  entry.deps.add(effect)
  clearTimeout(entry.gcTimeout)
}

export function queryEntry_removeDep(
  entry: UseQueryEntry,
  effect: EffectScope | ComponentInternalInstance | undefined | null,
  store: ReturnType<typeof useQueryCache>,
) {
  if (!effect) return

  entry.deps.delete(effect)
  if (entry.deps.size > 0 || !entry.options) return
  clearTimeout(entry.gcTimeout)
  entry.gcTimeout = setTimeout(() => {
    store.deleteQueryData(entry.key)
  }, entry.options.gcTime)
}

/**
 * Creates a new query entry.
 *
 * @internal
 * @param key - key of the entry
 * @param initialData - initial data to set
 * @param error - initial error to set
 * @param when - when the data was fetched the last time. defaults to 0, meaning it's stale
 */
export function createQueryEntry<TResult = unknown, TError = ErrorDefault>(
  key: EntryNodeKey[],
  initialData?: TResult,
  error: TError | null = null,
  when: number = 0, // stale by default
): UseQueryEntry<TResult, TError> {
  const data = shallowRef(initialData)
  const status = shallowRef<QueryStatus>(
    error ? 'error' : initialData !== undefined ? 'success' : 'pending',
  )
  return {
    key,
    data,
    error: shallowRef(error),
    when,
    status,
    isPending: computed(() => data.value === undefined),
    isFetching: computed(() => status.value === 'loading'),
    pending: null,
    deps: new Set(),
    gcTimeout: undefined,
    options: null,
    get stale() {
      return Date.now() > this.when + this.options!.staleTime
    },
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

  type DefineQueryEntry = [entries: UseQueryEntry[], returnValue: unknown]
  // keep track of the entry being defined so we can add the queries in ensureEntry
  // this allows us to refresh the entry when a defined query is used again
  // and refetchOnMount is true
  let currentDefineQueryEntry: DefineQueryEntry | undefined | null
  const defineQueryMap = new WeakMap<() => unknown, DefineQueryEntry>()
  function ensureDefinedQuery<T>(fn: () => T) {
    let defineQueryEntry = defineQueryMap.get(fn)
    if (!defineQueryEntry) {
      // create the entry first
      currentDefineQueryEntry = defineQueryEntry = [[], null]
      // then run it s oit can add the queries to the entry
      defineQueryEntry[1] = scope.run(fn)
      currentDefineQueryEntry = null
      defineQueryMap.set(fn, defineQueryEntry)
    } else {
      // if the entry already exists, we know the queries inside
      for (const queryEntry of defineQueryEntry[0]) {
        // TODO: refactor this to be a method of the store so it can be used in useQuery too
        // and not be called during hydration
        if (queryEntry.options?.refetchOnMount) {
          if (queryEntry.options.refetchOnMount === 'always') {
            refetch(queryEntry)
          } else {
            // console.log('refreshing')
            refresh(queryEntry)
          }
        }
      }
    }

    return defineQueryEntry
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
        (entry = scope.run(() =>
          createQueryEntry(key, options.initialData?.()),
        )!),
      )
    }

    // add the options to the entry the first time only
    entry.options ??= options

    // if this query was defined within a defineQuery call, add it to the list
    currentDefineQueryEntry?.[0].push(entry)

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

    if (entry.error.value || entry.stale) {
      // console.log(`⬇️ refresh "${entry.key}". expired ${entry.when} / ${staleTime}`)

      // if (entry.pending?.refreshCall) console.log('  -> skipped!')

      await (entry.pending?.refreshCall ?? refetch(entry))
    }

    // console.log(`${entry.key}  ->`, entry.data.value, entry.error.value)

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

    // console.log('🔄 refetching', entry.key)
    entry.status.value = 'loading'

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

  // TODO: tests
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

  function getQueryData<TResult = unknown>(key: EntryKey): TResult | undefined {
    const entry = caches.get(key.map(stringifyFlatObject)) as
      | UseQueryEntry<TResult>
      | undefined
    return entry?.data.value
  }

  function deleteQueryData(key: EntryKey) {
    // console.log('🗑 data', key, Date.now())
    caches.delete(key.map(stringifyFlatObject))
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
    deleteQueryData,

    refetch,
    refresh,
  }
})

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
  parentKey: EntryNodeKey[] = [],
) {
  parent.children ??= new Map()
  const node = new TreeMapNode<UseQueryEntry>(
    [],
    value && createQueryEntry([...parentKey, key], ...value),
  )
  parent.children.set(key, node)
  if (children) {
    for (const child of children) {
      appendToTree(node, child)
    }
  }
}
