import { defineStore, skipHydrate } from 'pinia'
import {
  type ComponentInternalInstance,
  type EffectScope,
  type ShallowRef,
  getCurrentInstance,
  getCurrentScope,
  hasInjectionContext,
  markRaw,
  shallowReactive,
  shallowRef,
  toValue,
} from 'vue'
import { stringifyFlatObject, toValueWithArgs, warnOnce } from './utils'
import type { _UseQueryEntryNodeValueSerialized, UseQueryEntryNodeSerialized, EntryNodeKey } from './tree-map'
import { appendSerializedNodeToTree, TreeMapNode } from './tree-map'
import type { EntryKey } from './entry-options'
import { useQueryOptions, type UseQueryOptions, type UseQueryOptionsWithDefaults } from './query-options'
import type { ErrorDefault } from './types-extension'
import type {
  AsyncStatus,
  DataState,
  DataStateStatus,
  DataState_Success,
} from './data-state'

/**
 * Allows defining extensions to the query entry that are returned by `useQuery()`.
 */
// eslint-disable-next-line unused-imports/no-unused-vars
export interface UseQueryEntryExtensions<TResult, TError> {
}

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

  /**
   * The current pending request.
   */
  pending: null | {
    /**
     * The abort controller used to cancel the request and which `signal` is passed to the query function.
     */
    abortController: AbortController
    /**
     * The promise created by `queryCache.fetch` that is currently pending.
     */
    refreshCall: Promise<DataState<TResult, TError>>
    /**
     * When was this `pending` object created.
     */
    when: number
  }

  /**
   * Options used to create the query. They can be `null` during hydration but are needed for fetching. This is why
   * `store.ensure()` sets this property. Note these options might be shared by multiple query entries when the key is
   * dynamic.
   */
  options: UseQueryOptionsWithDefaults<TResult, TError> | null

  /**
   * Whether the data is stale or not, requires `options.staleTime` to be set.
   */
  readonly stale: boolean

  /**
   * Whether the query is currently being used by a Component or EffectScope (e.g. a store).
   */
  readonly active: boolean

  /**
   * Extensions to the query entry added by plugins.
   */
  ext: UseQueryEntryExtensions<TResult, TError>

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
   * If true, it will only match the exact key, not the children.
   *
   * @example
   * ```ts
   * { key: ['a'], exact: true }
   *  // will match ['a'] but not ['a', 'b'], while
   * { key: ['a'] }
   * // will match both
   * ```
   */
  exact?: boolean

  /**
   * If true or false, it will only return entries that match the stale status. Requires `entry.options` to be set.
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

  /**
   * Pass a predicate to filter the entries. This will be executed for each entry matching the other filters.
   * @param entry - entry to filter
   */
  predicate?: (entry: UseQueryEntry) => boolean
}

/**
 * Empty starting object for extensions that allows to detect when to update.
 * @internal
 */
export const START_EXT = {}

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
// TODO: errors are not serializable by default. We should provide a way to serialize custom errors and, by default provide one that serializes the name and message

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

/**
 * Composable to get the cache of the queries. As any other composable, it can be used inside the `setup` function of a
 * component, within another composable, or in injectable contexts like stores and navigation guards.
 */
export const useQueryCache = /* @__PURE__ */ defineStore(QUERY_STORE_ID, ({ action }) => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new TreeMapNode<UseQueryEntry<unknown, unknown>>()
  const caches = skipHydrate(shallowReactive(cachesRaw))

  // this version of the cache cannot be hydrated because it would miss all of the actions
  // and plugins won't be able to hook into entry creation and fetching
  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  if (process.env.NODE_ENV !== 'production') {
    if (!hasInjectionContext()) {
      warnOnce(
        `useQueryCache() was called outside of an injection context (component setup, store, navigation guard) You will get a warning about "inject" being used incorrectly from Vue. Make sure to use it only in allowed places.\n`
        + `See https://vuejs.org/guide/reusability/composables.html#usage-restrictions`,
      )
    }
  }

  const optionDefaults = useQueryOptions()

  const create = action(
    <TResult, TError>(
      key: EntryNodeKey[],
      options: UseQueryOptionsWithDefaults<TResult, TError> | null = null,
      initialData?: TResult,
      error: TError | null = null,
      when: number = 0,
    ): UseQueryEntry<TResult, TError> =>
      scope.run(() => {
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
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-ignore: some plugins are adding properties to the entry type
          ext: START_EXT,
          options,
          get stale() {
            const staleTime = this.options!.staleTime
            if (staleTime === Infinity) {
              return this.when === 0
            }
            return Date.now() >= this.when + staleTime
          },
          get active() {
            return this.deps.size > 0
          },
        })
      })!
    ,
  )

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
      // we should consider as if they are activated again
      for (const queryEntry of defineQueryEntry[0]) {
        if (queryEntry.options?.refetchOnMount) {
          if (toValue(queryEntry.options.refetchOnMount) === 'always') {
            fetch(queryEntry)
          } else {
            refresh(queryEntry)
          }
        }
      }
    }

    return defineQueryEntry
  })

  function track(entry: UseQueryEntry, effect: EffectScope | ComponentInternalInstance | null | undefined) {
    if (!effect) return
    entry.deps.add(effect)
    clearTimeout(entry.gcTimeout)
  }

  function untrack(
    entry: UseQueryEntry,
    effect: EffectScope | ComponentInternalInstance | undefined | null,
    store: ReturnType<typeof useQueryCache>,
  ) {
    if (!effect) return

    entry.deps.delete(effect)
    if (entry.deps.size > 0 || !entry.options) return
    clearTimeout(entry.gcTimeout)
    // avoid setting a timeout with false, Infinity or NaN
    if ((Number.isFinite as (val: unknown) => val is number)(entry.options.gcTime)) {
      entry.gcTimeout = setTimeout(() => {
        store.remove(entry)
      }, entry.options.gcTime)
    }
  }

  /**
   * Invalidates and refetches (in parallel) all active queries in the cache that match the filters.
   */
  const invalidateQueries = action(
    (filters?: UseQueryEntryFilter): Promise<unknown> => {
      return Promise.all(
        getEntries(filters).map((entry) => {
          invalidate(entry)
          return entry.active && fetch(entry)
        }),
      )
    },
  )

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

      return (
        filters.exact ? (node.value ? [node.value] : []) : [...node]
      ).filter((entry) => {
        if (filters.stale != null) return entry.stale === filters.stale
        if (filters.active != null) return entry.active === filters.active
        if (filters.status) {
          return entry.state.value.status === filters.status
        }
        if (filters.predicate) return filters.predicate(entry)

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
      opts: UseQueryOptions<TResult, TError>,
    ): UseQueryEntry<TResult, TError> => {
      const options: UseQueryOptionsWithDefaults<TResult, TError> = {
        ...optionDefaults,
        ...opts,
      }
      const key = toValue(options.key).map(stringifyFlatObject)

      if (process.env.NODE_ENV !== 'production' && key.length === 0) {
        throw new Error(
          `useQuery() was called with an empty array as the key. It must have at least one element.`,
        )
      }

      // ensure the state
      let entry = cachesRaw.get(key) as UseQueryEntry<TResult, TError> | undefined
      if (!entry) {
        cachesRaw.set(key, (entry = create(key, options, options.initialData?.())))
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
          if (
            entry.__hmr.id == null
            && process.env.NODE_ENV !== 'test'
            && typeof document !== 'undefined'
          ) {
            warnOnce(
              `Found a nullish hmr id. This is probably a bug. Please report it to pinia-colada with a boiled down reproduction. Thank you!`,
            )
          }
        }
      }

      // technically we don't need to set this every time but it's shorter than entry.options ??= options and the check
      // in useQuery already catches possible problems
      entry.options = options

      // extend the entry with plugins the first time only
      if (entry.ext === START_EXT) {
        entry.ext = {} as UseQueryEntryExtensions<TResult, TError>
        extend(entry)
      }

      // if this query was defined within a defineQuery call, add it to the list
      currentDefineQueryEntry?.[0].push(entry)

      return entry
    },
  )

  /**
   * Action called when an entry is ensured for the first time to allow plugins to extend it.
   */
  const extend = action(
    <TResult = unknown, TError = ErrorDefault>(_entry: UseQueryEntry<TResult, TError>) => {},
  )

  /**
   * Invalidates a query entry
   * @param entry - the entry of the query to invalidate
   */
  const invalidate = action((entry: UseQueryEntry) => {
    // will force a fetch next time
    entry.when = 0
    // ignores the pending query
    cancel(entry)
  })

  /**
   * Ensures the current data is fresh. If the data is stale or if the status is 'error', calls {@link fetch}, if not
   * return the current data. Can only be called if the entry has been initialized with `useQuery()` and has options.
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
      // Abort any ongoing request
      entry.pending?.abortController.abort()

      const pendingCall = (entry.pending = {
        abortController,
        // wrapping with async allows us to catch synchronous errors too
        refreshCall: (async () => entry.options!.query({ signal }))()
          .then((data) => {
            if (pendingCall === entry.pending) {
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
            }

            // always propagate up the error
            throw error
            // NOTE: other options included returning an ongoing request if the error was a cancellation but it seems not worth it
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
   * Cancels an entry's query if it's currently pending. This will effectively abort the `AbortSignal` of the query and any
   * pending request will be ignored.
   */
  const cancel = action((entry: UseQueryEntry, reason?: unknown) => {
    entry.pending?.abortController.abort(reason)
    // eagerly set the status to idle because the abort signal might not
    // be consumed by the user's query
    entry.asyncStatus.value = 'idle'
    entry.pending = null
  })

  /**
   * Cancels queries if they are currently pending. This will effectively abort the `AbortSignal` of the query and any
   * pending request will be ignored.
   */
  const cancelQueries = action(
    (filters?: UseQueryEntryFilter, reason?: unknown) => {
      getEntries(filters).forEach((entry) => cancel(entry, reason))
    },
  )

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

  /**
   * Set the data of a query entry in the cache. It assumes an already successfully fetched entry.
   */
  const setQueryData = action(
    <TResult = unknown>(
      key: EntryKey,
      data: TResult | ((oldData: TResult | undefined) => TResult),
    ) => {
        const cacheKey = key.map(stringifyFlatObject)
      let entry = caches.get(cacheKey) as
        | UseQueryEntry<TResult>
        | undefined

      // if the entry doesn't exist, we create it to set the data
      // it cannot be refreshed or fetched since the options
      // will be missing
      if (!entry) {
        caches.set(
          cacheKey,
          (entry = create<TResult, any>(cacheKey)),
        )
      }

      setEntryState(entry, {
        // if we don't cast, this is not technically correct
        // the user is responsible for setting the data
        ...(entry.state.value as DataState_Success<TResult>),
        data: toValueWithArgs(data, entry.state.value.data),
      })
    },
  )

  /**
   * Gets the data of a query entry in the cache based on the key of the query.
   * @param key - the key of the query
   */
  function getQueryData<TResult = unknown>(key: EntryKey): TResult | undefined {
    return caches.get(key.map(stringifyFlatObject))?.state.value.data as TResult | undefined
  }

  const remove = action(
    /**
     * Removes a query entry from the cache.
     */
    (entry: UseQueryEntry) => caches.delete(entry.key),
  )

  return {
    caches,

    ensureDefinedQuery,
    /**
     * Scope to track effects and components that use the query cache.
     * @internal
     */
    _s: markRaw(scope),
    setQueryData,
    getQueryData,

    invalidateQueries,
    cancelQueries,

    // Actions for entries
    invalidate,
    fetch,
    refresh,
    ensure,
    extend,
    track,
    untrack,
    cancel,
    create,
    remove,
    setEntryState,
    getEntries,
  }
})

/**
 * The cache of the queries. It's the store returned by {@link useQueryCache}.
 */
export type QueryCache = ReturnType<typeof useQueryCache>

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

// TODO: remove in next release
/**
 * Creates a {@link TreeMapNode} from a serialized array.
 *
 * @param raw - array af values created with {@link serializeTreeMap}
 * @deprecated Not needed anymore the query cache handles reviving the map, only the serialization is needed.
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

/**
 * @deprecated
 */
function appendToTree(
  parent: TreeMapNode<UseQueryEntry>,
  [key, value, children]: UseQueryEntryNodeSerialized,
  parentKey: EntryNodeKey[] = [],
) {
  parent.children ??= new Map()
  const node = new TreeMapNode<UseQueryEntry>(
    [],
    // NOTE: this could happen outside of an effect scope but since it's only for client side hydration, it should be
    // fine to have global shallowRefs as they can still be cleared when needed
    value && createQueryEntry([...parentKey, key], ...value),
  )
  parent.children.set(key, node)
  if (children) {
    for (const child of children) {
      appendToTree(node, child)
    }
  }
}

/**
 * Creates a new query entry.
 *
 * @internal
 * @deprecated
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
  options: UseQueryOptionsWithDefaults<TResult, TError> | null = null,
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
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore: some plugins are adding properties to the entry type
    ext: START_EXT,
    options,
    get stale() {
      const staleTime = this.options!.staleTime
      if (staleTime === Infinity) {
        return this.when === 0
      }
      return Date.now() >= this.when + staleTime
    },
    get active() {
      return this.deps.size > 0
    },
  })
}

/**
 * Hydrates the query cache with the serialized cache. Used during SSR.
 * @param queryCache - query cache
 * @param serializedCache - serialized cache
 */
export function hydrateQueryCache(
  queryCache: QueryCache,
  serializedCache: UseQueryEntryNodeSerialized[],
) {
  for (const entryData of serializedCache) {
    appendSerializedNodeToTree(queryCache.caches, entryData, queryCache.create)
  }
}

/**
 * Serializes the query cache to a compressed array. Used during SSR.
 * @param queryCache - query cache
 */
export function serializeQueryCache(queryCache: QueryCache): UseQueryEntryNodeSerialized[] {
  return serializeTreeMap(queryCache.caches)
}
