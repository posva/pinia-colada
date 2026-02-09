import type { ShallowRef } from 'vue'
import type { AsyncStatus, DataState } from './data-state'
import { defineStore, skipHydrate } from 'pinia'
import { customRef, getCurrentScope, hasInjectionContext, markRaw, shallowRef } from 'vue'
import { find, START_EXT } from './entry-keys'
import type { EntryFilter } from './entry-filter'
import type { _EmptyObject } from './utils'
import { noop, toValueWithArgs, warnOnce } from './utils'
import type { _ReduceContext } from './use-mutation'
import { useMutationOptions } from './mutation-options'
import type { UseMutationOptions, UseMutationOptionsWithDefaults } from './mutation-options'
import type { EntryKey } from './entry-keys'

/**
 * Allows defining extensions to the mutation entry that are returned by `useMutation()`.
 */
export interface UseMutationEntryExtensions<
  // oxlint-disable-next-line no-unused-vars
  TData,
  // oxlint-disable-next-line no-unused-vars
  TVars,
  // oxlint-disable-next-line no-unused-vars
  TError,
  // oxlint-disable-next-line no-unused-vars
  TContext extends Record<any, any> = _EmptyObject,
> {}

/**
 * A mutation entry in the cache.
 */
export interface UseMutationEntry<
  TData = unknown,
  TVars = unknown,
  TError = unknown,
  TContext extends Record<any, any> = _EmptyObject,
> {
  /**
   * Unique id of the mutation entry. 0 if the entry is not yet in the cache.
   */
  id: number

  /**
   * The state of the mutation. Contains the data, error and status.
   */
  state: ShallowRef<DataState<TData, TError>>

  /**
   * The async status of the mutation.
   */
  asyncStatus: ShallowRef<AsyncStatus>

  /**
   * When was this data fetched the last time in ms
   */
  when: number

  /**
   * The key associated with this mutation entry.
   * Can be `undefined` if the entry has no key.
   */
  key: EntryKey | undefined

  /**
   * The variables used to call the mutation.
   */
  vars: TVars | undefined

  /**
   * Options used to create the mutation.
   */
  options: UseMutationOptionsWithDefaults<TData, TVars, TError, TContext>

  /**
   * Timeout id that scheduled a garbage collection. It is set here to clear it when the entry is used by a different component.
   */
  gcTimeout: ReturnType<typeof setTimeout> | undefined

  /**
   * Extensions to the mutation entry added by plugins. You should only add
   * properties to the object, not replace it.
   */
  readonly ext: UseMutationEntryExtensions<TData, TVars, TError, TContext>
}

/**
 * Filter to get entries from the mutation cache.
 */
export type UseMutationEntryFilter = EntryFilter<UseMutationEntry>

/**
 * The id of the store used for mutations.
 * @internal
 */
export const MUTATION_STORE_ID = '_pc_mutation'

/**
 * Composable to get the cache of the mutations. As any other composable, it
 * can be used inside the `setup` function of a component, within another
 * composable, or in injectable contexts like stores and navigation guards.
 */
export const useMutationCache = /* @__PURE__ */ defineStore(MUTATION_STORE_ID, ({ action }) => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new Map<number, UseMutationEntry<unknown, any, unknown, any>>()
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
                    `[@pinia/colada]: The mutation cache instance cannot be set directly, it must be modified. This will fail in production.`,
                  )
                }
              : noop,
        },
    ),
  )

  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  if (process.env.NODE_ENV !== 'production') {
    if (!hasInjectionContext()) {
      warnOnce(
        `useMutationCache() was called outside of an injection context (component setup, store, navigation guard) You will get a warning about "inject" being used incorrectly from Vue. Make sure to use it only in allowed places.\n` +
          `See https://vuejs.org/guide/reusability/composables.html#usage-restrictions`,
      )
    }
  }

  const globalOptions = useMutationOptions()
  const defineMutationMap = new WeakMap<() => unknown, unknown>()

  let nextMutationId = 1

  /**
   * Action called when an entry is created for the first time to allow plugins to extend it.
   *
   * @param _entry - the entry of the mutation to extend
   */
  const extend = action(
    <
      TData = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = _EmptyObject,
    >(
      _entry: UseMutationEntry<TData, TVars, TError, TContext>,
    ) => {},
  )

  /**
   * Creates a mutation entry and its state without adding it to the cache.
   * This allows for the state to exist in `useMutation()` before the mutation
   * is actually called. The mutation must be _ensured_ with {@link ensure}
   * before being called.
   *
   * @param options - options to create the mutation
   */
  const create = action(
    <
      TData = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = _EmptyObject,
    >(
      options: UseMutationOptionsWithDefaults<TData, TVars, TError, TContext>,
      key?: EntryKey | undefined,
      vars?: TVars,
    ): UseMutationEntry<TData, TVars, TError, TContext> => {
      const entry = scope.run(() =>
        markRaw<UseMutationEntry<TData, TVars, TError, TContext>>({
          // only ids > 0 are real ids
          id: 0,
          state: shallowRef<DataState<TData, TError>>({
            status: 'pending',
            data: undefined,
            error: null,
          }),
          gcTimeout: undefined,
          asyncStatus: shallowRef<AsyncStatus>('idle'),
          when: 0,
          vars,
          key,
          options,
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-ignore: some plugins are adding properties to the entry type
          ext: START_EXT,
        } satisfies UseMutationEntry<TData, TVars, TError, TContext>),
      )!

      // extend the entry with plugins immediately so `useMutation()` can expose extensions
      // right away (same ergonomics as `useQuery()`).
      if (entry.ext === START_EXT) {
        ;(entry as { ext: object }).ext = {}
        extend(entry)
      }

      return entry
    },
  )

  /**
   * Ensures a mutation entry in the cache by assigning it an `id` and a `key` based on `vars`. Usually, a mutation is ensured twice
   *
   * @param entry - entry to ensure
   * @param vars - variables to call the mutation with
   */
  function ensure<
    TData = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(
    entry: UseMutationEntry<TData, TVars, TError, TContext>,
    vars: NoInfer<TVars>,
  ): UseMutationEntry<TData, TVars, TError, TContext> {
    const options = entry.options
    const id = nextMutationId++
    const key: EntryKey | undefined = options.key && toValueWithArgs(options.key, vars)

    // override the existing entry and untrack it if it was already created
    entry = entry.id ? (untrack(entry), create(options, key, vars)) : entry
    entry.id = id
    entry.key = key
    entry.vars = vars

    // store the entry with the mutation ID as the map key
    cachesRaw.set(id, entry as unknown as UseMutationEntry)
    triggerCache()

    // extend the entry with plugins the first time only
    if (entry.ext === START_EXT) {
      ;(entry as { ext: object }).ext = {}
      extend(entry)
    }

    return entry
  }

  /**
   * Ensures a query created with {@link defineMutation} is present in the cache. If it's not, it creates a new one.
   * @param fn - function that defines the query
   */
  const ensureDefinedMutation = action(<T>(fn: () => T) => {
    let defineMutationResult = defineMutationMap.get(fn)
    if (!defineMutationResult) {
      defineMutationMap.set(fn, (defineMutationResult = scope.run(fn)))
    }

    return defineMutationResult
  })

  /**
   * Gets a single mutation entry from the cache based on the ID of the mutation.
   *
   * @param id - the ID of the mutation
   */
  function get<
    TData = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(id: number): UseMutationEntry<TData, TVars, TError, TContext> | undefined {
    return caches.value.get(id) as UseMutationEntry<TData, TVars, TError, TContext> | undefined
  }

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
    <
      TData = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = _EmptyObject,
    >(
      entry: UseMutationEntry<TData, TVars, TError, TContext>,
      // NOTE: NoInfer ensures correct inference of TData and TError
      state: DataState<NoInfer<TData>, NoInfer<TError>>,
    ) => {
      entry.state.value = state
      entry.when = Date.now()
    },
  )

  /**
   * Removes a mutation entry from the cache if it has an id. If it doesn't then it does nothing.
   *
   * @param entry - the entry of the mutation to remove
   */
  const remove = action(
    <
      TData = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = _EmptyObject,
    >(
      entry: UseMutationEntry<TData, TVars, TError, TContext>,
    ) => {
      cachesRaw.delete(entry.id)
      triggerCache()
    },
  )

  /**
   * Returns all the entries in the cache that match the filters.
   * Note that you can have multiple entries with the exact same key if they
   * were called multiple times.
   *
   * @param filters - filters to apply to the entries
   */
  const getEntries = action((filters: UseMutationEntryFilter = {}): UseMutationEntry[] => {
    return [...find(caches.value, filters.key)].filter(
      (entry) =>
        (filters.status == null || entry.state.value.status === filters.status) &&
        (!filters.predicate || filters.predicate(entry)),
    )
  })

  /**
   * Untracks a mutation entry, scheduling garbage collection.
   *
   * @param entry - the entry of the mutation to untrack
   */
  const untrack = action(
    <
      TData = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = _EmptyObject,
    >(
      entry: UseMutationEntry<TData, TVars, TError, TContext>,
    ) => {
      // schedule a garbage collection if the entry is not active
      if (entry.gcTimeout) return

      // avoid setting a timeout with false, Infinity or NaN
      if ((Number.isFinite as (val: unknown) => val is number)(entry.options.gcTime)) {
        entry.gcTimeout = setTimeout(() => {
          remove(entry)
        }, entry.options.gcTime)
      }
    },
  )

  /**
   * Mutate a previously ensured mutation entry.
   *
   * @param entry - the entry to mutate
   */
  async function mutate<
    TData = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(
    entry: UseMutationEntry<TData, TVars, TError, TContext>,
  ): Promise<TData> {
    // the vars is set when the entry is ensured, we warn against it below
    const { vars, options } = entry as typeof entry & { vars: TVars }

    // DEV warnings
    if (process.env.NODE_ENV !== 'production') {
      const key = entry.key?.join('/')
      const keyMessage = key ? `with key "${key}"` : 'without a key'
      if (entry.id === 0) {
        console.error(
          `[@pinia/colada] A mutation entry ${keyMessage} was mutated before being ensured. If you are manually calling the "mutationCache.mutate()", you should always ensure the entry first If not, this is probably a bug. Please, open an issue on GitHub with a boiled down reproduction.`,
        )
      }
      if (
        // the entry has already an ongoing request
        entry.state.value.status !== 'pending' ||
        entry.asyncStatus.value === 'loading'
      ) {
        console.error(
          `[@pinia/colada] A mutation entry ${keyMessage} was reused. If you are manually calling the "mutationCache.mutate()", you should always ensure the entry first: "mutationCache.mutate(mutationCache.ensure(entry, vars))". If not this is probably a bug. Please, open an issue on GitHub with a boiled down reproduction.`,
        )
      }
    }

    entry.asyncStatus.value = 'loading'

    // TODO: AbortSignal that is aborted when the mutation is called again so we can throw in pending
    let currentData: TData | undefined
    let currentError: TError | undefined
    type OnMutateContext = Parameters<
      Required<UseMutationOptions<TData, TVars, TError, TContext>>['onMutate']
    >['1']
    type OnSuccessContext = Parameters<
      Required<UseMutationOptions<TData, TVars, TError, TContext>>['onSuccess']
    >['2']
    type OnErrorContext = Parameters<
      Required<UseMutationOptions<TData, TVars, TError, TContext>>['onError']
    >['2']

    let context: OnMutateContext | OnErrorContext | OnSuccessContext = {}

    try {
      const globalOnMutateContext = globalOptions.onMutate?.(vars)

      context =
        (globalOnMutateContext instanceof Promise
          ? await globalOnMutateContext
          : globalOnMutateContext) || {}

      const onMutateContext = (await options.onMutate?.(
        vars,
        context,
        // NOTE: the cast makes it easier to write without extra code. It's safe because { ...null, ...undefined } works and TContext must be a Record<any, any>
      )) as _ReduceContext<TContext>

      // we set the context here so it can be used by other hooks
      context = {
        ...context,
        ...onMutateContext,
        // NOTE: needed for onSuccess cast
      } satisfies OnSuccessContext

      const newData = (currentData = await options.mutation(vars, context as OnSuccessContext))

      await globalOptions.onSuccess?.(newData, vars, context as OnSuccessContext)
      await options.onSuccess?.(
        newData,
        vars,
        // NOTE: cast is safe because of the satisfies above
        // using a spread also works
        context as OnSuccessContext,
      )

      setEntryState(entry, {
        status: 'success',
        data: newData,
        error: null,
      })
    } catch (newError: unknown) {
      currentError = newError as TError
      await globalOptions.onError?.(currentError, vars, context)
      await options.onError?.(currentError, vars, context)
      setEntryState(entry, {
        status: 'error',
        data: entry.state.value.data,
        error: currentError,
      })
      throw newError
    } finally {
      // TODO: should we catch and log it?
      await globalOptions.onSettled?.(currentData, currentError, vars, context)
      await options.onSettled?.(currentData, currentError, vars, context)
      entry.asyncStatus.value = 'idle'
    }

    return currentData
  }

  return {
    caches,

    create,
    ensure,
    ensureDefinedMutation,
    mutate,
    remove,
    extend,
    get,

    setEntryState,
    getEntries,
    untrack,

    /**
     * Scope to track effects and components that use the mutation cache.
     * @internal
     */
    _s: scope,
  }
})

/**
 * The cache of the mutations. It's the store returned by {@link useMutationCache}.
 */
export type MutationCache = ReturnType<typeof useMutationCache>

/**
 * Checks if the given object is a mutation cache. Used in SSR to apply custom serialization.
 *
 * @param cache - the object to check
 *
 * @see {@link MutationCache}
 */
export function isMutationCache(cache: unknown): cache is MutationCache {
  return (
    typeof cache === 'object' &&
    !!cache &&
    (cache as Record<string, unknown>).$id === MUTATION_STORE_ID
  )
}
