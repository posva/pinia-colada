import { defineStore } from 'pinia'
import {
  type ComponentInternalInstance,
  type EffectScope,
  type ShallowRef,
  getCurrentInstance,
  getCurrentScope,
  markRaw,
  shallowReactive,
  shallowRef,
  toValue,
} from 'vue'
import { stringifyFlatObject, toValueWithArgs } from './utils'
import { type EntryNodeKey, TreeMapNode } from './tree-map'
import type { EntryKey } from './entry-options'
import type { UseQueryOptionsWithDefaults } from './query-options'
import type { ErrorDefault } from './types-extension'
import type { defineQuery } from './define-query'
import type {
  AsyncStatus,
  DataState,
  DataStateStatus,
  DataState_Success,
} from './data-state'

/**
 * NOTE: Entries could be classes but the point of having all functions within the store is to allow plugins to hook
 * into actions.
 */

/**
 * A query entry in the cache.
 */
export interface UseQueryEntry<TResult = unknown, TError = unknown> {
  /**
   * The state of the query. Contains the data, error and status.
   */
  state: ShallowRef<DataState<TResult, TError>>

  /**
   * A placeholder `data` that is initially shown while the query is loading for the first time. This will also show the
   * `status` as `success` until the query finishes loading (no matter the outcome).
   */
  placeholderData: TResult | null | undefined

  /**
   * The status of the query.
   */
  asyncStatus: ShallowRef<AsyncStatus>

  /**
   * When was this data fetched the last time in ms
   */
  when: number

  /**
   * The serialized key associated with this query entry.
   */
  key: EntryNodeKey[]

  /**
   * Components and effects scopes that use this query entry.
   */
  deps: Set<EffectScope | ComponentInternalInstance>

  /**
   * Timeout id that scheduled a garbage collection. It is set here to clear it when the entry is used by a different component
   */
  gcTimeout: ReturnType<typeof setTimeout> | undefined

  pending: null | {
    abortController: AbortController
    refreshCall: Promise<DataState<TResult, TError>>
    when: number
  }

  /**
   * Options used to create the query. They can be undefined during hydration but are needed for fetching. This is why
   * `store.ensure()` sets this property. Note these options might be shared by multiple query entries when the key is
   * dynamic.
   */
  options: UseQueryOptionsWithDefaults<TResult, TError> | null
  // TODO: ideally shouldn't be null, there should be different kind of types

  /**
   * Whether the data is stale or not, requires `options.staleTime` to be set.
   */
  readonly stale: boolean

  /**
   * Whether the query is currently being used by a Component or EffectScope (e.g. a store).
   */
  readonly active: boolean

  /**
   * Component `__hmrId` to track wrong usage of `useQuery` and warn the user.
   * @internal
   */
  __hmr?: {
    id?: string
    deps?: Set<EffectScope | ComponentInternalInstance>
    skip?: boolean
  }
}

/**
 * Filter to get entries from the cache.
 */
export interface UseQueryEntryFilter {
  /**
   * A key to filter the entries.
   */
  key?: EntryKey

  /**
   * If true, it will only return the exact key, not the children.
   */
  exact?: boolean

  /**
   * If true or false, it will only return entries that match the stale status.
   */
  stale?: boolean

  /**
   * If true or false, it will only return entries that match the active status.
   */
  active?: boolean

  /**
   * If defined, it will only return the entries with the given status.
   */
  status?: DataStateStatus
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
    store.remove(entry)
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
  const state = shallowRef<DataState<TResult, TError>>(
    // @ts-expect-error: to make the code shorter we are using one declaration instead of multiple ternaries
    {
      data: initialData,
      error,
      status: error
        ? 'error'
        : initialData !== undefined
          ? 'success'
          : 'pending',
    },
  )
  const asyncStatus = shallowRef<AsyncStatus>('idle')
  // we markRaw to avoid unnecessary vue traversal
  return markRaw<UseQueryEntry<TResult, TError>>({
    key,
    state,
    placeholderData: null,
    when,
    asyncStatus,
    pending: null,
    // this set can contain components and effects and worsen the performance
    // and create weird warnings
    deps: markRaw(new Set()),
    gcTimeout: undefined,
    options: null,
    get stale() {
      return Date.now() > this.when + this.options!.staleTime
    },
    get active() {
      return this.deps.size > 0
    },
  })
}

/**
 * UseQueryEntry method to serialize the entry to JSON.
 *
 * @param entry - entry to serialize
 * @param entry.when - when the data was fetched the last time
 * @param entry.state - data state of the entry
 * @param entry.state.value - value of the data state
 * @returns Serialized version of the entry
 */
export const queryEntry_toJSON: <TResult, TError>(
  entry: UseQueryEntry<TResult, TError>,
) => _UseQueryEntryNodeValueSerialized<TResult, TError> = ({
  state: { value },
  when,
}) => [value.data, value.error, when]

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

/**
 * A query entry that is defined with {@link defineQuery}.
 * @internal
 */
type DefineQueryEntry = [entries: UseQueryEntry[], returnValue: unknown]

export const useQueryCache = defineStore(QUERY_STORE_ID, ({ action }) => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new TreeMapNode<UseQueryEntry<unknown, unknown>>()
  const caches = shallowReactive(cachesRaw)

  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  // keep track of the entry being defined so we can add the queries in ensure
  // this allows us to refresh the entry when a defined query is used again
  // and refetchOnMount is true
  let currentDefineQueryEntry: DefineQueryEntry | undefined | null
  const defineQueryMap = new WeakMap<() => unknown, DefineQueryEntry>()

  /**
   * Ensures a query created with {@link defineQuery} is present in the cache. If it's not, it creates a new one.
   * @param fn - function that defines the query
   */
  const ensureDefinedQuery = action(<T>(fn: () => T) => {
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
            fetch(queryEntry)
          } else {
            // console.log('refreshing')
            refresh(queryEntry)
          }
        }
      }
    }

    return defineQueryEntry
  })

  /**
   * Invalidates and refetches (in parallel) all the queries in the cache that match the filters.
   */
  const invalidateQueries = action((filters?: UseQueryEntryFilter) => {
    return Promise.all(
      getEntries(filters).map((entry) => {
        invalidate(entry)
        return fetch(entry)
      }),
    )
  })

  /**
   * Returns all the entries in the cache that match the filters.
   * @param filters - filters to apply to the entries
   */
  const getEntries = action(
    (filters: UseQueryEntryFilter = {}): UseQueryEntry[] => {
      const node = filters.key
        ? cachesRaw.find(filters.key.map(stringifyFlatObject))
        : cachesRaw

      if (!node) return []

      if (filters.exact) {
        return node.value ? [node.value] : []
      }

      return [...node].filter((entry) => {
        if (filters.stale != null) return entry.stale === filters.stale
        if (filters.active != null) return entry.active === filters.active
        if (filters.status) {
          return entry.state.value.status === filters.status
        }

        return true
      })
    },
  )

  /**
   * Ensures a query entry is present in the cache. If it's not, it creates a new one. The resulting entry is required
   * to call other methods like {@link fetch}, {@link refresh}, or {@link invalidate}.
   *
   * @param key - the key of the query
   */
  const ensure = action(
    <TResult = unknown, TError = ErrorDefault>(
      options: UseQueryOptionsWithDefaults<TResult, TError>,
    ): UseQueryEntry<TResult, TError> => {
      const key = toValue(options.key).map(stringifyFlatObject)

      if (process.env.NODE_ENV !== 'production' && key.length === 0) {
        throw new Error(
          `useQuery() was called with an empty array as the key. It must have at least one element.`,
        )
      }

      // ensure the state
      // console.log('⚙️ Ensuring entry', key)
      let entry = cachesRaw.get(key) as
        | UseQueryEntry<TResult, TError>
        | undefined
      if (!entry) {
        cachesRaw.set(
          key,
          (entry = scope.run(() =>
            createQueryEntry(key, options.initialData?.()),
          )!),
        )
      }

      // warn against using the same key for different functions
      // this only applies outside of HMR since during HMR, the `useQuery()` will be called
      // when remounting the component and it's essential to update the options.
      // in other scenarios, it's a mistake
      if (process.env.NODE_ENV !== 'production') {
        const currentInstance = getCurrentInstance()
        if (currentInstance) {
          entry.__hmr ??= {}

          entry.__hmr.deps ??= new Set()
          entry.__hmr.id
            // @ts-expect-error: internal property
            = currentInstance.type.__hmrId
        }
      }

      // technically we don't need to set this every time but it's shorter than entry.options ??= options and the check
      // in useQuery already catches possible problems
      entry.options = options

      // if this query was defined within a defineQuery call, add it to the list
      currentDefineQueryEntry?.[0].push(entry)

      return entry
    },
  )

  /**
   * Invalidates a query entry
   * @param entry - the entry of the query to invalidate
   */
  const invalidate = action((entry: UseQueryEntry) => {
    // will force a fetch next time
    entry.when = 0
    // ignores the pending query
    cancelQuery(entry)
  })

  /**
   * Ensures the current data is fresh. If the data is stale, calls {@link fetch}, if not return the current data. Can only be called if the
   * entry has options.
   */
  const refresh = action(
    async <TResult, TError>(
      entry: UseQueryEntry<TResult, TError>,
    ): Promise<DataState<TResult, TError>> => {
      if (process.env.NODE_ENV !== 'production' && !entry.options) {
        throw new Error(
          `"entry.refresh()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`,
        )
      }

      if (entry.state.value.error || entry.stale) {
        return entry.pending?.refreshCall ?? fetch(entry)
      }

      return entry.state.value
    },
  )

  /**
   * Fetch an entry. Ignores fresh data and triggers a new fetch. Can only be called if the entry has options.
   */
  const fetch = action(
    async <TResult, TError>(
      entry: UseQueryEntry<TResult, TError>,
    ): Promise<DataState<TResult, TError>> => {
      if (process.env.NODE_ENV !== 'production' && !entry.options) {
        throw new Error(
          `"entry.fetch()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`,
        )
      }

      entry.asyncStatus.value = 'loading'

      const abortController = new AbortController()
      const { signal } = abortController
      // abort any ongoing request
      // TODO: test
      // TODO: The abort should only happen when the query is out of date, becomes inactive or is manually cancelled
      // entry.pending?.abortController.abort()

      const pendingCall = (entry.pending = {
        abortController,
        // wrapping with async allows us to catch synchronous errors too
        refreshCall: (async () => entry.options!.query({ signal }))()
          .then((data) => {
            if (pendingCall === entry.pending && !signal.aborted) {
              setEntryState(entry, {
                data,
                error: null,
                status: 'success',
              })
            }
            return entry.state.value
          })
          .catch((error) => {
            if (
              pendingCall === entry.pending
              && error
              && (error.name !== 'AbortError' || error === signal.reason)
            ) {
              setEntryState(entry, {
                status: 'error',
                data: entry.state.value.data,
                error,
              })
              throw error
            }
            // TODO: would it make more sense to not resolve here?
            return entry.state.value
          })
          .finally(() => {
            entry.asyncStatus.value = 'idle'
            if (pendingCall === entry.pending) {
              entry.pending = null
              // reset the placeholder data to free up memory
              entry.placeholderData = null
              entry.when = Date.now()
            }
          }),
        when: Date.now(),
      })

      return pendingCall.refreshCall
    },
  )

  /**
   * Cancels a query if it's currently pending. This will effectively abort the `AbortSignal` of the query and any
   * pending request will be ignored.
   */
  const cancelQuery = action((entry: UseQueryEntry, reason?: unknown) => {
    entry.pending?.abortController.abort(reason)
    entry.pending = null
  })

  /**
   * Sets the state of a query entry in the cache. This action is called every time the cache state changes and can be
   * used by plugins to detect changes.
   */
  const setEntryState = action(
    <TResult, TError>(
      entry: UseQueryEntry<TResult, TError>,
      // NOTE: NoInfer ensures correct inference of TResult and TError
      state: DataState<NoInfer<TResult>, NoInfer<TError>>,
    ) => {
      entry.state.value = state
      entry.when = Date.now()
    },
  )

  // TODO: tests
  /**
   * Set the data of a query entry in the cache. Note this doesn't change the status of the query.
   */
  const setQueryData = action(
    <TResult = unknown>(
      key: EntryKey,
      data: TResult | ((oldData: TResult | undefined) => TResult),
    ) => {
      const entry = caches.get(key.map(stringifyFlatObject)) as
        | UseQueryEntry<TResult>
        | undefined
      // FIXME: it should create the entry if it doesn't exist
      if (!entry) return

      setEntryState(entry, {
        // if we don't cast, this is not technically correct
        // the user is responsible for setting the data
        ...(entry.state.value as DataState_Success<TResult>),
        data: toValueWithArgs(data, entry.state.value.data),
      })
    },
  )

  const getQueryData = action(
    <TResult = unknown>(key: EntryKey): TResult | undefined => {
      const entry = caches.get(key.map(stringifyFlatObject)) as
        | UseQueryEntry<TResult>
        | undefined
      return entry?.state.value.data
    },
  )

  const remove = action(
    /**
     * Removes a query entry from the cache.
     */
    (entry: UseQueryEntry) => caches.delete(entry.key),
  )

  // TODO: find a way to make it possible to prefetch. Right now we need the actual options of the query
  const _preload = action((_useQueryFn: ReturnType<typeof defineQuery>) => {})

  // TODO: implement
  // activate? untrack? these actions should help plugins to augment pinia colada

  return {
    caches,
    // TODO: figure out if worth or eslint is enough
    // used to warn the user against wrong usage and redirect them to the docs
    // to use `defineQuery()` instead
    // warnChecksMap:
    //   process.env.NODE_ENV !== 'production'
    //     ? new WeakMap<object, boolean>()
    //     : undefined,

    ensureDefinedQuery,
    setQueryData,
    getQueryData,
    cancelQuery,

    invalidateQueries,

    // Actions for entries
    invalidate,
    fetch,
    refresh,
    ensure,
    remove,
    setEntryState,
    getEntries,
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
export function serializeTreeMap(
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

/**
 * @deprecated Use {@link serializeTreeMap} instead.
 */
export const serialize = serializeTreeMap

/**
 * Creates a {@link TreeMapNode} from a serialized array.
 *
 * @param raw - array af values created with {@link serializeTreeMap}
 */
export function reviveTreeMap(
  raw: UseQueryEntryNodeSerialized[] = [],
): TreeMapNode<UseQueryEntry> {
  const root = new TreeMapNode<UseQueryEntry>()

  for (const entry of raw) {
    appendToTree(root, entry)
  }
  // NOTE: limitation of pinia: properties are added to `pinia.state.value` which is a `ref` so the class gets deeply checked
  return markRaw(root)
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
