import { defineStore, getActivePinia, skipHydrate } from 'pinia'
import {
  customRef,
  effectScope,
  getCurrentInstance,
  getCurrentScope,
  hasInjectionContext,
  markRaw,
  shallowRef,
  toValue,
} from 'vue'
import type { App, ComponentInternalInstance, EffectScope, ShallowRef } from 'vue'
import type { AsyncStatus, DataState } from './data-state'
import type { EntryKeyTagged, EntryKey } from './entry-keys'
import { useQueryOptions } from './query-options'
import type { UseQueryOptions, UseQueryOptionsWithDefaults } from './query-options'
import type { EntryFilter } from './entry-filter'
import { find, toCacheKey } from './entry-keys'
import type { ErrorDefault } from './types-extension'
import { noop, toValueWithArgs, warnOnce } from './utils'

/**
 * Allows defining extensions to the query entry that are returned by `useQuery()`.
 */

export interface UseQueryEntryExtensions<
  TData,
  /* eslint-disable-next-line unused-imports/no-unused-vars */
  TError,
  /* eslint-disable-next-line unused-imports/no-unused-vars */
  TDataInitial extends TData | undefined = undefined,
> {}

/**
 * NOTE: Entries could be classes but the point of having all functions within the store is to allow plugins to hook
 * into actions.
 */

/**
 * A query entry in the cache.
 */
export interface UseQueryEntry<
  TData = unknown,
  TError = unknown,
  // allows for UseQueryEntry to have unknown everywhere (generic version)
  TDataInitial extends TData | undefined = unknown extends TData ? unknown : undefined,
> {
  /**
   * The state of the query. Contains the data, error and status.
   */
  state: ShallowRef<DataState<TData, TError, TDataInitial>>

  /**
   * A placeholder `data` that is initially shown while the query is loading for the first time. This will also show the
   * `status` as `success` until the query finishes loading (no matter the outcome).
   */
  placeholderData: TDataInitial | TData | null | undefined

  /**
   * The status of the query.
   */
  asyncStatus: ShallowRef<AsyncStatus>

  /**
   * When was this data set in the entry for the last time in ms. It can also
   * be 0 if the entry has been invalidated.
   */
  when: number

  /**
   * The serialized key associated with this query entry.
   */
  key: EntryKey

  /**
   * Seriaized version of the key. Used to retrieve the entry from the cache.
   */
  keyHash: string

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
    refreshCall: Promise<DataState<TData, TError, TDataInitial>>
    /**
     * When was this `pending` object created.
     */
    when: number
  }

  /**
   * Options used to create the query. They can be `null` during hydration but are needed for fetching. This is why
   * `store.ensure()` sets this property. Note these options might be shared by multiple query entries when the key is
   * dynamic and that's why some methods like {@link fetch} receive the options as an argument.
   */
  options: UseQueryOptionsWithDefaults<TData, TError, TDataInitial> | null

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
  ext: UseQueryEntryExtensions<TData, TError, TDataInitial>

  /**
   * Internal property to store the HMR ids of the components that are using
   * this query and force refetching.
   *
   * @internal
   */
  __hmr?: {
    /**
     * Reference count of the components using this query.
     */
    ids: Map<string, number>
  }
}

/**
 * Keep track of the entry being defined so we can add the queries in ensure
 * this allows us to refresh the entry when a defined query is used again
 * and refetchOnMount is true
 *
 * @internal
 */
export let currentDefineQueryEntry: DefineQueryEntry | undefined | null

/**
 * Returns whether the entry is using a placeholder data.
 *
 * @template TDataInitial - Initial data type
 * @param entry - entry to check
 */
export function isEntryUsingPlaceholderData<TDataInitial>(
  entry: UseQueryEntry<unknown, unknown, TDataInitial> | undefined | null,
): entry is UseQueryEntry<unknown, unknown, TDataInitial> & { placeholderData: TDataInitial } {
  return entry?.placeholderData != null && entry.state.value.status === 'pending'
}

/**
 * Filter object to get entries from the query cache.
 *
 * @see {@link QueryCache.getEntries}
 * @see {@link QueryCache.cancelQueries}
 * @see {@link QueryCache#invalidateQueries}
 */
export type UseQueryEntryFilter = EntryFilter<UseQueryEntry>

/**
 * Empty starting object for extensions that allows to detect when to update.
 *
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
export const queryEntry_toJSON: <TData, TError>(
  entry: UseQueryEntry<TData, TError>,
) => _UseQueryEntryNodeValueSerialized<TData, TError> = ({ state: { value }, when }) => [
  value.data,
  value.error,
  // because of time zones, we create a relative time
  when ? Date.now() - when : -1,
]
// TODO: errors are not serializable by default. We should provide a way to serialize custom errors and, by default provide one that serializes the name and message

/**
 * UseQueryEntry method to serialize the entry to a string.
 *
 * @internal
 * @param entry - entry to serialize
 * @returns Stringified version of the entry
 */
export const queryEntry_toString: <TData, TError>(entry: UseQueryEntry<TData, TError>) => string = (
  entry,
) => String(queryEntry_toJSON(entry))

/**
 * The id of the store used for queries.
 * @internal
 */
export const QUERY_STORE_ID = '_pc_query'

/**
 * A query entry that is defined with {@link defineQuery}.
 * @internal
 */
type DefineQueryEntry = [
  lastEnsuredEntries: UseQueryEntry[],
  returnValue: unknown,
  effect: EffectScope,
  paused: ShallowRef<boolean>,
]

/**
 * Type definition for the query cache store interface
 */
interface QueryCacheStore {
  caches: any
  ensureDefinedQuery: any
  _s: any
  setQueryData: any
  setQueriesData: any
  getQueryData: any
  invalidateQueries: any
  cancelQueries: any
  invalidate: any
  fetch: any
  refresh: any
  ensure: any
  extend: any
  track: any
  untrack: any
  cancel: any
  create: any
  remove: any
  get: any
  setEntryState: any
  getEntries: any
}

/**
 * Composable to get the cache of the queries. As any other composable, it can be used inside the `setup` function of a
 * component, within another composable, or in injectable contexts like stores and navigation guards.
 */
export const useQueryCache: any = /* @__PURE__ */ defineStore(QUERY_STORE_ID, ({ action }): QueryCacheStore => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new Map<string, UseQueryEntry<unknown, unknown, unknown>>()
  let triggerCache!: () => void
  const caches = skipHydrate(
    customRef(
      (track, trigger) =>
        (triggerCache = trigger) && {
          // eslint-disable-next-line no-sequences
          get: () => (track(), cachesRaw),
          set:
            process.env.NODE_ENV !== 'production'
              ? () => {
                  console.error(
                    `[@pinia/colada]: The query cache instance cannot be set directly, it must be modified. This will fail in production.`,
                  )
                }
              : noop,
        },
    ),
  )

  // this version of the cache cannot be hydrated because it would miss all of the actions
  // and plugins won't be able to hook into entry creation and fetching
  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!
  const app: App<unknown> =
    // @ts-expect-error: internal
    getActivePinia()!._a

  if (process.env.NODE_ENV !== 'production') {
    if (!hasInjectionContext()) {
      warnOnce(
        `useQueryCache() was called outside of an injection context (component setup, store, navigation guard) You will get a warning about "inject" being used incorrectly from Vue. Make sure to use it only in allowed places.\n` +
          `See https://vuejs.org/guide/reusability/composables.html#usage-restrictions`,
      )
    }
  }

  const optionDefaults = useQueryOptions()

  /**
   * Creates a new query entry in the cache. Shouldn't be called directly.
   *
   * @param key - Serialized key of the query
   * @param [options] - options attached to the query
   * @param [initialData] - initial data of the query if any
   * @param [error] - initial error of the query if any
   * @param [when] - relative when was the data or error fetched (will be added to Date.now())
   */
  const create = action(
    <TData, TError, TDataInitial extends TData | undefined>(
      key: EntryKey,
      options: UseQueryOptionsWithDefaults<TData, TError, TDataInitial> | null = null,
      initialData?: TDataInitial,
      error: TError | null = null,
      when: number = 0,
      // when: number = initialData === undefined ? 0 : Date.now(),
    ): UseQueryEntry<TData, TError, TDataInitial> =>
      scope.run(() => {
        const state = shallowRef<DataState<TData, TError, TDataInitial>>(
          // @ts-expect-error: to make the code shorter we are using one declaration instead of multiple ternaries
          {
            // NOTE: we could move the `initialData` parameter before `options` and make it required
            // but that would force `create` call in `setQueryData` to pass an extra `undefined` argument
            data: initialData as TDataInitial,
            error,
            status: error ? 'error' : initialData !== undefined ? 'success' : 'pending',
          },
        )
        const asyncStatus = shallowRef<AsyncStatus>('idle')
        // we markRaw to avoid unnecessary vue traversal
        return markRaw<UseQueryEntry<TData, TError, TDataInitial>>({
          key,
          keyHash: toCacheKey(key),
          state,
          placeholderData: null,
          when: initialData === undefined ? 0 : Date.now() - when,
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
            return !this.options || !this.when || Date.now() >= this.when + (this.options?.staleTime ?? 0)
          },
          get active() {
            return this.deps.size > 0
          },
        } satisfies UseQueryEntry<TData, TError, TDataInitial>)
      })!,
  )

  const defineQueryMap = new WeakMap<() => unknown, DefineQueryEntry>()

  /**
   * Ensures a query created with {@link defineQuery} is present in the cache. If it's not, it creates a new one.
   * @param fn - function that defines the query
   */
  const ensureDefinedQuery = action(<T>(fn: () => T) => {
    let defineQueryEntry = defineQueryMap.get(fn)
    if (!defineQueryEntry) {
      // create the entry first
      currentDefineQueryEntry = defineQueryEntry = scope.run(() => [
        [],
        null,
        effectScope(),
        shallowRef(false),
      ])!

      // then run it so it can add the queries to the entry
      // we use the app context for injections and the scope for effects
      defineQueryEntry[1] = app.runWithContext(() => defineQueryEntry![2].run(fn)!)
      currentDefineQueryEntry = null
      defineQueryMap.set(fn, defineQueryEntry)
    } else {
      // ensure the scope is active so effects computing inside `useQuery()` run (e.g. the entry computed)
      defineQueryEntry[2].resume()
      defineQueryEntry[3].value = false
      // if the entry already exists, we know the queries inside
      // we should consider as if they are activated again
      defineQueryEntry[0] = defineQueryEntry[0].map((oldEntry) =>
        // the entries' key might have changed (e.g. Nuxt navigation)
        // so we need to ensure them again
        oldEntry.options ? ensure(oldEntry.options, oldEntry) : oldEntry,
      )
    }

    return defineQueryEntry
  })

  /**
   * Tracks an effect or component that uses a query.
   *
   * @param entry - the entry of the query
   * @param effect - the effect or component to untrack
   *
   * @see {@link untrack}
   */
  function track(
    entry: UseQueryEntry,
    effect: EffectScope | ComponentInternalInstance | null | undefined,
  ) {
    if (!effect) return
    entry.deps.add(effect)
    // clearTimeout ignores anything that isn't a timerId
    clearTimeout(entry.gcTimeout)
    entry.gcTimeout = undefined
    triggerCache()
  }

  /**
   * Untracks an effect or component that uses a query.
   *
   * @param entry - the entry of the query
   * @param effect - the effect or component to untrack
   *
   * @see {@link track}
   */
  function untrack(
    entry: UseQueryEntry,
    effect: EffectScope | ComponentInternalInstance | undefined | null,
  ) {
    // avoid clearing an existing timeout
    if (!effect || !entry.deps.has(effect)) return

    // clear any HMR to avoid letting the set grow
    if (process.env.NODE_ENV !== 'production') {
      if ('type' in effect && '__hmrId' in effect.type && entry.__hmr) {
        const count = (entry.__hmr.ids.get(effect.type.__hmrId) ?? 1) - 1
        if (count > 0) {
          entry.__hmr.ids.set(effect.type.__hmrId, count)
        } else {
          entry.__hmr.ids.delete(effect.type.__hmrId)
        }
      }
    }

    entry.deps.delete(effect)
    triggerCache()

    scheduleGarbageCollection(entry)
  }

  function scheduleGarbageCollection(entry: UseQueryEntry) {
    // schedule a garbage collection if the entry is not active
    // and we know its gcTime value
    if (entry.deps.size > 0 || !entry.options) return
    clearTimeout(entry.gcTimeout)
    // avoid setting a timeout with false, Infinity or NaN
    if ((Number.isFinite as (val: unknown) => val is number)(entry.options.gcTime)) {
      entry.gcTimeout = setTimeout(() => {
        remove(entry)
      }, entry.options.gcTime)
    }
  }

  /**
   * Invalidates and cancel matched queries, and then refetches (in parallel)
   * all active ones. If you need to further control which queries are
   * invalidated, canceled, and/or refetched, you can use the filters, you
   * can direcly call {@link invalidate} on {@link getEntries}:
   *
   * ```ts
   * // instead of doing
   * await queryCache.invalidateQueries(filters)
   * await Promise.all(queryCache.getEntries(filters).map(entry => {
   *   queryCache.invalidate(entry)
   *   // this is the default behavior of invalidateQueries
   *   // return entry.active && queryCache.fetch(entry)
   *   // here to refetch everything, even non active queries
   *   return queryCache.fetch(entry)
   * })
   * ```
   *
   * @param filters - filters to apply to the entries
   * @param refetchActive - whether to refetch active queries or not. Set
   * to `'all'` to refetch all queries
   *
   * @see {@link invalidate}
   * @see {@link cancel}
   */
  const invalidateQueries = action(
    (filters?: UseQueryEntryFilter, refetchActive: boolean | 'all' = true): Promise<unknown> => {
      return Promise.all(
        getEntries(filters).map((entry) => {
          invalidate(entry)
          return (
            (refetchActive === 'all' || (entry.active && refetchActive)) &&
            toValue(entry.options?.enabled) &&
            fetch(entry)
          )
        }),
      )
    },
  )

  /**
   * Returns all the entries in the cache that match the filters.
   *
   * @param filters - filters to apply to the entries
   */
  const getEntries = action((filters: UseQueryEntryFilter = {}): UseQueryEntry[] => {
    // TODO: Iterator.from(node) in 2028 once widely available? or maybe not worth it
    return (
      filters.exact
        ? filters.key
          ? [caches.value.get(toCacheKey(filters.key))].filter((v) => !!v)
          : [] // exact with no key can't match anything
        : [...find(caches.value, filters.key)]
    ).filter(
      (entry) =>
        (filters.stale == null || entry.stale === filters.stale) &&
        (filters.active == null || entry.active === filters.active) &&
        (!filters.status || entry.state.value.status === filters.status) &&
        (!filters.predicate || filters.predicate(entry)),
    )
  })

  /**
   * Ensures a query entry is present in the cache. If it's not, it creates a new one. The resulting entry is required
   * to call other methods like {@link fetch}, {@link refresh}, or {@link invalidate}.
   *
   * @param opts - options to create the query
   * @param previousEntry - the previous entry that was associated with the same options
   */
  const ensure = action(
    <TData = unknown, TError = ErrorDefault, TDataInitial extends TData | undefined = undefined>(
      opts: UseQueryOptions<TData, TError, TDataInitial>,
      previousEntry?: UseQueryEntry<TData, TError, TDataInitial>,
    ): UseQueryEntry<TData, TError, TDataInitial> => {
      const options: UseQueryOptionsWithDefaults<TData, TError, TDataInitial> = {
        ...optionDefaults,
        ...opts,
      }
      const key = toValue(options.key)
      const keyHash = toCacheKey(key)

      if (process.env.NODE_ENV !== 'production' && keyHash === '[]') {
        throw new Error(
          `useQuery() was called with an empty array as the key. It must have at least one element.`,
        )
      }

      // do not reinitialize the entry
      // because of the immediate watcher in useQuery, the `ensure()` action is called twice on mount
      // we return early to avoid pushing to currentDefineQueryEntry
      if (previousEntry && keyHash === previousEntry.keyHash) {
        return previousEntry
      }

      // Since ensure() is called within a computed, we cannot let Vue track cache, so we use the raw version instead
      let entry = cachesRaw.get(keyHash) as UseQueryEntry<TData, TError, TDataInitial> | undefined
      // ensure the state
      if (!entry) {
        cachesRaw.set(keyHash, (entry = create(key, options, options.initialData?.())))
        // the placeholderData is only used if the entry is initially loading
        if (options.placeholderData && entry.state.value.status === 'pending') {
          entry.placeholderData = toValueWithArgs(
            options.placeholderData,
            // pass the previous entry placeholder data if it was in placeholder state
            isEntryUsingPlaceholderData(previousEntry)
              ? previousEntry.placeholderData
              : previousEntry?.state.value.data,
          )
        }
        triggerCache()
      }

      // during HMR, staleTime could be long and if we change the query function, the query won't trigger a refetch
      // so we need to detect and trigger just in case
      if (process.env.NODE_ENV !== 'production') {
        const currentInstance = getCurrentInstance()
        if (currentInstance) {
          entry.__hmr ??= { ids: new Map() }

          const id =
            // @ts-expect-error: internal property
            currentInstance.type?.__hmrId

          // FIXME: if the user mounts the same component multiple times, I think it makes sense to fix this
          // because we could have the same component mounted multiple times with different props but inside of the same
          // they use the same query (cache, centralized). This sholdn't invalidate the query
          // we can fix it by storing the currentInstance.type.render (we need to copy the values because the
          // type object gets reused and replaced in place). It's not clear if this will work with Vapor
          if (id) {
            if (entry.__hmr.ids.has(id)) {
              invalidate(entry)
            }
            const count = (entry.__hmr.ids.get(id) ?? 0) + 1
            entry.__hmr.ids.set(id, count)
          }
        }
      }

      // we set it every time to ensure we are using up to date key getters and others options
      entry.options = options

      // extend the entry with plugins the first time only
      if (entry.ext === START_EXT) {
        entry.ext = {} as UseQueryEntryExtensions<TData, TError>
        extend(entry)
      }

      // if this query was defined within a defineQuery call, add it to the list
      currentDefineQueryEntry?.[0].push(entry)

      return entry
    },
  )

  /**
   * Action called when an entry is ensured for the first time to allow plugins to extend it.
   *
   * @param _entry - the entry of the query to extend
   */
  const extend = action(
    <TData = unknown, TError = ErrorDefault, TDataInitial extends TData | undefined = undefined>(
      _entry: UseQueryEntry<TData, TError, TDataInitial>,
    ) => {},
  )

  /**
   * Invalidates and cancels a query entry. It effectively sets the `when`
   * property to `0` and {@link cancel | cancels} the pending request.
   *
   * @param entry - the entry of the query to invalidate
   *
   * @see {@link cancel}
   */
  const invalidate = action((entry: UseQueryEntry) => {
    // will force a fetch next time
    entry.when = 0
    // ignores the pending query
    cancel(entry)
  })

  /**
   * Ensures the current data is fresh. If the data is stale or if the status
   * is 'error', calls {@link fetch}, if not return the current data. Can only
   * be called if the entry has been initialized with `useQuery()` and has
   * options.
   *
   * @param entry - the entry of the query to refresh
   * @param options - the options to use for the fetch
   *
   * @see {@link fetch}
   */
  const refresh = action(
    async <TData, TError, TDataInitial extends TData | undefined>(
      entry: UseQueryEntry<TData, TError, TDataInitial>,
      options = entry.options,
    ): Promise<DataState<TData, TError, TDataInitial>> => {
      if (process.env.NODE_ENV !== 'production' && !options) {
        throw new Error(
          `"entry.refresh()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`,
        )
      }

      if (entry.state.value.error || entry.stale) {
        return entry.pending?.refreshCall ?? fetch(entry, options)
      }

      return entry.state.value
    },
  )

  /**
   * Fetch an entry. Ignores fresh data and triggers a new fetch. Can only be called if the entry has options.
   *
   * @param entry - the entry of the query to fetch
   * @param options - the options to use for the fetch
   */
  const fetch = action(
    async <TData, TError, TDataInitial extends TData | undefined>(
      entry: UseQueryEntry<TData, TError, TDataInitial>,
      options = entry.options,
    ): Promise<DataState<TData, TError, TDataInitial>> => {
      if (process.env.NODE_ENV !== 'production' && !options) {
        throw new Error(
          `"entry.fetch()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`,
        )
      }

      entry.asyncStatus.value = 'loading'

      const abortController = new AbortController()
      const { signal } = abortController
      // Abort any ongoing request without a reason to keep `AbortError` even with
      // signal.throwIfAborted() in the query function
      entry.pending?.abortController.abort()

      const pendingCall = (entry.pending = {
        abortController,
        // wrapping with async allows us to catch synchronous errors too
        refreshCall: (async () => options!.query({ signal }))()
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
              pendingCall === entry.pending &&
              // when the error is an abort error, it means the request was cancelled
              // we should just ignore the result of the query but not error
              error?.name !== 'AbortError'
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
              // update the time amounts based on the current request
              // NOTE: Normally these should be the same everywhere but the
              // same query could be instantiated with different options
              // entry.gcTime = options!.gcTime
              // entry.staleTime = options!.staleTime
              entry.pending = null
              // there are cases when the result is ignored, in that case, we still
              // do not have a real result so we keep the placeholder data
              if (entry.state.value.status !== 'pending') {
                // reset the placeholder data to free up memory
                entry.placeholderData = null
                // if the status is pending, the result was ignored, therefore
                // we didn't update the cache and `when` must not be updated
                entry.when = Date.now()
              }
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
   *
   * @param entry - the entry of the query to cancel
   * @param reason - the reason passed to the abort controller
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
   *
   * @param filters - filters to apply to the entries
   * @param reason - the reason passed to the abort controller
   *
   * @see {@link cancel}
   */
  const cancelQueries = action((filters?: UseQueryEntryFilter, reason?: unknown) => {
    getEntries(filters).forEach((entry) => cancel(entry, reason))
  })

  /**
   * Sets the state of a query entry in the cache and updates the
   * {@link UseQueryEntry['pending']['when'] | `when` property}. This action is
   * called every time the cache state changes and can be used by plugins to
   * detect changes.
   *
   * @param entry - the entry of the query to set the state
   * @param state - the new state of the entry
   */
  const setEntryState = action(
    <TData, TError, TDataInitial extends TData | undefined = TData | undefined>(
      entry: UseQueryEntry<TData, TError, TDataInitial>,
      // NOTE: NoInfer ensures correct inference of TData and TError
      state: DataState<NoInfer<TData>, NoInfer<TError>, NoInfer<TDataInitial>>,
    ) => {
      entry.state.value = state
      entry.when = Date.now()
      // if we need to, we could schedule a garbage collection here but I don't
      // see why would one create entries that are not used (not tracked immediately after)
    },
  )

  /**
   * Gets a single query entry from the cache based on the key of the query.
   *
   * @param key - the key of the query
   */
  function get<
    TData = unknown,
    TError = ErrorDefault,
    TDataInitial extends TData | undefined = undefined,
  >(
    key: EntryKeyTagged<TData, TError, TDataInitial> | EntryKey,
  ): UseQueryEntry<TData, TError, TDataInitial> | undefined {
    return caches.value.get(toCacheKey(key)) as
      | UseQueryEntry<TData, TError, TDataInitial>
      | undefined
  }

  /**
   * Set the data of a query entry in the cache. It also sets the `status` to `success`.
   *
   * @param key - the key of the query
   * @param data - the new data to set
   *
   * @see {@link setEntryState}
   */
  const setQueryData = action(
    <TData = unknown, TError = ErrorDefault, TDataInitial extends TData | undefined = undefined>(
      key: EntryKeyTagged<TData, TError, TDataInitial> | EntryKey,
      data:
        | NoInfer<TData>
        // a success query cannot have undefined data
        | Exclude<NoInfer<TDataInitial>, undefined>
        // but could not be there and therefore have undefined here
        | ((oldData: TData | TDataInitial | undefined) => TData | Exclude<TDataInitial, undefined>),
    ) => {
      const keyHash = toCacheKey(key)
      let entry = cachesRaw.get(keyHash) as UseQueryEntry<TData, unknown, TDataInitial> | undefined

      // if the entry doesn't exist, we create it to set the data
      // it cannot be refreshed or fetched since the options
      // will be missing
      if (!entry) {
        cachesRaw.set(keyHash, (entry = create<TData, unknown, TDataInitial>(key)))
      }

      setEntryState(entry, {
        // we assume the data accounts for a successful state
        error: null,
        status: 'success',
        data: toValueWithArgs(data, entry.state.value.data),
      })
      scheduleGarbageCollection(entry)
      triggerCache()
    },
  )

  /**
   * Sets the data of all queries in the cache that are children of a key. It
   * also sets the `status` to `success`. Differently from {@link
   * setQueryData}, this method recursively sets the data for all queries. This
   * is why it requires a function to set the data.
   *
   * @param filters - filters used to get the entries
   * @param updater - the function to set the data
   *
   * @example
   * ```ts
   * // let's suppose we want to optimistically update all contacts in the cache
   * setQueriesData(['contacts', 'list'], (contactList: Contact[]) => {
   *   const contactToReplaceIndex = contactList.findIndex(c => c.id === updatedContact.id)
   *   return contactList.toSpliced(contactToReplaceIndex, 1, updatedContact)
   * })
   * ```
   *
   * @see {@link setQueryData}
   */
  function setQueriesData<TData = unknown>(
    filters: UseQueryEntryFilter,
    updater: (previous: TData | undefined) => TData,
  ): void {
    for (const entry of getEntries(filters)) {
      setEntryState(entry, {
        error: null,
        status: 'success',
        data: updater(entry.state.value.data as TData | undefined),
      })
      scheduleGarbageCollection(entry)
    }
    triggerCache()
  }

  /**
   * Gets the data of a query entry in the cache based on the key of the query.
   *
   * @param key - the key of the query
   */
  function getQueryData<
    TData = unknown,
    TError = ErrorDefault,
    TDataInitial extends TData | undefined = undefined,
  >(key: EntryKeyTagged<TData, TError, TDataInitial> | EntryKey): TData | TDataInitial | undefined {
    return caches.value.get(toCacheKey(key))?.state.value.data as TData | TDataInitial | undefined
  }

  /**
   * Removes a query entry from the cache.
   *
   * @param entry - the entry of the query to remove
   */
  const remove = action((entry: UseQueryEntry) => {
    // setting without a value is like setting it to undefined
    cachesRaw.delete(entry.keyHash)
    triggerCache()
  })

  return {
    caches,

    ensureDefinedQuery,
    /**
     * Scope to track effects and components that use the query cache.
     * @internal
     */
    _s: markRaw(scope),
    setQueryData,
    setQueriesData,
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
    get,
    setEntryState,
    getEntries,
  }
})

/**
 * The cache of the queries. It's the store returned by {@link useQueryCache}.
 */
export type QueryCache = ReturnType<typeof useQueryCache>

/**
 * Checks if the given object is a query cache. Used in SSR to apply custom serialization.
 *
 * @param cache - the object to check
 *
 * @see {@link QueryCache}
 * @see {@link serializeQueryCache}
 */
export function isQueryCache(cache: unknown): cache is QueryCache {
  return (
    typeof cache === 'object' &&
    !!cache &&
    (cache as Record<string, unknown>).$id === QUERY_STORE_ID
  )
}

/**
 * Raw data of a query entry. Can be serialized from the server and used to
 * hydrate the store.
 *
 * @internal
 */
export type _UseQueryEntryNodeValueSerialized<TData = unknown, TError = unknown> = [
  /**
   * The data returned by the query.
   */
  data: TData | undefined,

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
 * Hydrates the query cache with the serialized cache. Used during SSR.
 * @param queryCache - query cache
 * @param serializedCache - serialized cache
 */
export function hydrateQueryCache(
  queryCache: QueryCache,
  serializedCache: Record<string, _UseQueryEntryNodeValueSerialized>,
): void {
  for (const keyHash in serializedCache) {
    queryCache.caches.set(
      keyHash,
      queryCache.create(JSON.parse(keyHash), undefined, ...(serializedCache[keyHash] ?? [])),
    )
  }
}

/**
 * Serializes the query cache to a compressed version. Used during SSR.
 *
 * @param queryCache - query cache
 */
export function serializeQueryCache(
  queryCache: QueryCache,
): Record<string, _UseQueryEntryNodeValueSerialized> {
  return Object.fromEntries(
    // TODO: 2028: directly use .map on the iterator
    [...queryCache.caches.entries()].map(([keyHash, entry]) => [keyHash, queryEntry_toJSON(entry)]),
  )
}
