import type { ShallowRef } from 'vue'
import type { AsyncStatus, DataState } from './data-state'
import { defineStore, skipHydrate } from 'pinia'
import { customRef, getCurrentScope, shallowRef } from 'vue'
import { find, toCacheKey } from './entry-keys'
import type { EntryFilter } from './entry-filter'
import type { _EmptyObject } from './utils'
import { noop, toValueWithArgs } from './utils'
import type { _ReduceContext } from './use-mutation'
import { useMutationOptions } from './mutation-options'
import type { UseMutationOptions } from './mutation-options'
import type { EntryKey } from './entry-keys'

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
   * Unique id of the mutation entry. Empty string if the entry is not yet in the cache.
   */
  id: string

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
   * The serialized key associated with this mutation entry.
   */
  key: EntryKey | undefined

  /**
   * Seriaized version of the key. Used to retrieve the entry from the cache.
   * Can be `undefined` if the entry has no key.
   */
  keyHash: string | undefined

  /**
   * The variables used to call the mutation.
   */
  vars: TVars | undefined

  /**
   * Options used to create the mutation.
   */
  options: UseMutationOptions<TData, TVars, TError, TContext>

  /**
   * Timeout id that scheduled a garbage collection. It is set here to clear it when the entry is used by a different component.
   */
  gcTimeout: ReturnType<typeof setTimeout> | undefined
}

/**
 * Filter to get entries from the mutation cache.
 */
export type UseMutationEntryFilter = EntryFilter<UseMutationEntry>

export const MUTATION_STORE_ID = '_pc_mutation'

/**
 * Type definition for the mutation cache store interface
 */
interface MutationCacheStore {
  caches: any
  create: any
  ensure: any
  ensureDefinedMutation: any
  mutate: any
  remove: any
  setEntryState: any
  getEntries: any
  untrack: any
}

/**
 * Composable to get the cache of the mutations. As any other composable, it
 * can be used inside the `setup` function of a component, within another
 * composable, or in injectable contexts like stores and navigation guards.
 */
export const useMutationCache: any = /* @__PURE__ */ defineStore(MUTATION_STORE_ID, ({ action }): MutationCacheStore => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new Map<string, UseMutationEntry<unknown, any, unknown, any>>()
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

  const globalOptions = useMutationOptions()
  const defineMutationMap = new WeakMap<() => unknown, unknown>()

  let nextMutationId = 0
  const generateMutationId = () => `$${nextMutationId++}`

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
      options: UseMutationOptions<TData, TVars, TError, TContext>,
      key?: EntryKey | undefined,
      vars?: TVars,
    ): UseMutationEntry<TData, TVars, TError, TContext> =>
      scope.run(
        () =>
          ({
            id: '', // not a real id yet, indicates that the entry is not in the cache
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
            keyHash: toCacheKey(key),
            options,
          }) satisfies UseMutationEntry<TData, TVars, TError, TContext>,
      )!,
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
    const id = generateMutationId()
    const key: EntryKey = [...toValueWithArgs(options.key || [], vars), id]
    const keyHash = toCacheKey(key)

    if (process.env.NODE_ENV !== 'production') {
      const badKey = key
        ?.slice(0, -1) // the last part is the id
        .find(
          (k) =>
            typeof k === 'string' && k.startsWith('$') && String(Number(k.slice(1))) === k.slice(1),
        )
      if (badKey) {
        console.warn(
          `[@pinia/colada] A mutation entry was created with a reserved key part "${badKey}". Do not name keys with "$<number>" as these are reserved in mutations.`,
        )
      }
    }

    entry = entry.id ? (untrack(entry), create(options, key, vars)) : entry
    entry.id = id
    entry.key = key
    entry.keyHash = keyHash
    entry.vars = vars

    // store the entry with a generated key
    cachesRaw.set(keyHash, entry as unknown as UseMutationEntry)
    triggerCache()

    return entry
  }

  /**
   * Ensures a query created with {@link defineMutation} is present in the cache. If it's not, it creates a new one.
   * @param fn - function that defines the query
   */
  const ensureDefinedMutation = action(<T>(fn: () => T): T => {
    let defineMutationResult = defineMutationMap.get(fn)
    if (!defineMutationResult) {
      defineMutationMap.set(fn, (defineMutationResult = scope.run(fn)!))
    }

    return defineMutationResult as T
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
    <
      TData = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = _EmptyObject,
    >(
      entry: UseMutationEntry<TData, TVars, TError, TContext>,
      // NOTE: NoInfer ensures correct inference of TData and TError
      state: DataState<NoInfer<TData>, NoInfer<TError>>,
    ): void => {
      entry.state.value = state
      entry.when = Date.now()
    },
  )

  /**
   * Removes a query entry from the cache if it has a key. If it doesn't then it does nothing.
   *
   * @param entry - the entry of the query to remove
   */
  const remove = action(
    <
      TData = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = _EmptyObject,
    >(
      entry: UseMutationEntry<TData, TVars, TError, TContext>,
    ): void => {
      if (entry.keyHash) {
        cachesRaw.delete(entry.keyHash)
        triggerCache()
      }
    },
  )

  /**
   * Returns all the entries in the cache that match the filters.
   *
   * @param filters - filters to apply to the entries
   */
  const getEntries = action((filters: UseMutationEntryFilter = {}): UseMutationEntry[] => {
    return filters.exact
      ? filters.key
        ? [caches.value.get(toCacheKey(filters.key))].filter((v) => !!v)
        : [] // no key, no exact entry
      : [...find(caches.value, filters.key)].filter(
          (entry) =>
            (filters.status == null || entry.state.value.status === filters.status) &&
            (!filters.predicate || filters.predicate(entry)),
        )
  })

  /**
   * Untracks an effect or component that uses a mutation.
   *
   * @param entry - the entry of the mutation
   * @param effect - the effect or component to untrack
   *
   * @see {@link track}
   */
  const untrack = action(
    <
      TData = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = _EmptyObject,
    >(
      entry: UseMutationEntry<TData, TVars, TError, TContext>,
    ): void => {
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
  >(entry: UseMutationEntry<TData, TVars, TError, TContext>): Promise<TData> {
    // the vars is set when the entry is ensured, we warn against it below
    const { vars, options } = entry as typeof entry & { vars: TVars }

    // DEV warnings
    if (process.env.NODE_ENV !== 'production') {
      const key = entry.key?.join('/')
      const keyMessage = key ? `with key "${key}"` : 'without a key'
      if (!entry.id) {
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

    setEntryState,
    getEntries,
    untrack,
  }
})
