import type { ComponentInternalInstance, EffectScope, ShallowRef } from 'vue'
import type { AsyncStatus, DataState, DataStateStatus } from './data-state'
import type { EntryNodeKey } from './tree-map'
import { defineStore, skipHydrate } from 'pinia'
import { customRef, getCurrentScope, shallowRef } from 'vue'
import { TreeMapNode } from './tree-map'
import type { _EmptyObject } from './utils'
import { isSameArray, noop, stringifyFlatObject, toCacheKey, toValueWithArgs } from './utils'
import type { _ReduceContext, UseMutationOptions } from './use-mutation'
import type { EntryKey } from './entry-options'

/**
 * A mutation entry in the cache.
 */
export interface UseMutationEntry<
  TResult = unknown,
  TVars = unknown,
  TError = unknown,
  TContext extends Record<any, any> = _EmptyObject,
> {
  /**
   * The state of the mutation. Contains the data, error and status.
   */
  state: ShallowRef<DataState<TResult, TError>>

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
  key: EntryNodeKey[] | undefined

  /**
   * The variables used to call the mutation.
   */
  vars: ShallowRef<TVars | undefined>

  options: UseMutationOptions<TResult, TVars, TError, TContext>

  pending: symbol | null

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
 * Filter to get mutation entries from the cache.
 */
export interface UseMutationEntryFilter {
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
   * If defined, it will only return the entries with the given status.
   */
  status?: DataStateStatus

  /**
   * Pass a predicate to filter the entries. This will be executed for each entry matching the other filters.
   * @param entry - entry to filter
   */
  predicate?: (entry: UseMutationEntry) => boolean
}

function createMutationEntry<
  TResult = unknown,
  TVars = unknown,
  TError = unknown,
  TContext extends Record<any, any> = _EmptyObject,
>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
  key: EntryNodeKey[] | undefined,
  vars?: TVars,
): UseMutationEntry<TResult, TVars, TError, TContext> {
  return {
    state: shallowRef<DataState<TResult, TError>>({
      status: 'pending',
      data: undefined,
      error: null,
    }),
    asyncStatus: shallowRef<AsyncStatus>('idle'),
    when: 0,
    vars: shallowRef(vars),
    key,
    options,
    pending: null,
  }
}

export const useMutationCache = /* @__PURE__ */ defineStore('_pc_mutation', ({ action }) => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new TreeMapNode<UseMutationEntry<unknown, any, unknown, any>>()
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

  // const globalOptions = inject()
  const defineMutationMap = new WeakMap<() => unknown, unknown>()

  function ensure<
    TResult = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(
    options: UseMutationOptions<TResult, TVars, TError, TContext>,
  ): UseMutationEntry<TResult, TVars, TError, TContext>
  function ensure<
    TResult = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(
    options: UseMutationOptions<TResult, TVars, TError, TContext>,
    entry: UseMutationEntry<TResult, TVars, TError, TContext>,
    vars: NoInfer<TVars>,
  ): UseMutationEntry<TResult, TVars, TError, TContext>

  function ensure<
    TResult = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(
    options: UseMutationOptions<TResult, TVars, TError, TContext>,
    entry?: UseMutationEntry<TResult, TVars, TError, TContext>,
    vars?: NoInfer<TVars>,
  ): UseMutationEntry<TResult, TVars, TError, TContext> {
    const key = vars && toValueWithArgs(options.key, vars)?.map(stringifyFlatObject)

    if (!entry) {
      entry = createMutationEntry(options, key)
      if (key) {
        cachesRaw.set(
          key,
          // @ts-expect-error: function types with generics are incompatible
          entry,
        )
      }
      triggerCache()
      return createMutationEntry(options, key)
    }
    // reuse the entry when no key is provided
    if (key) {
      // update key
      if (!entry.key) {
        entry.key = key
      } else if (!isSameArray(entry.key, key)) {
        entry = createMutationEntry(
          options,
          key,
          // the type NonNullable<TVars> is not assignable to TVars
          vars as TVars,
        )
        cachesRaw.set(
          key,
          // @ts-expect-error: function types with generics are incompatible
          entry,
        )
        triggerCache()
      }
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
      TResult = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = _EmptyObject,
    >(
      entry: UseMutationEntry<TResult, TVars, TError, TContext>,
      // NOTE: NoInfer ensures correct inference of TResult and TError
      state: DataState<NoInfer<TResult>, NoInfer<TError>>,
    ) => {
      entry.state.value = state
      entry.when = Date.now()
    },
  )

  /**
   * Removes a query entry from the cache if it has a key. If it doesn't then it does nothing.
   *
   * @param entry - the entry of the query to remove
   */
  const remove = action((entry: UseMutationEntry) => {
    if (entry.key != null) {
      cachesRaw.delete(entry.key)
      triggerCache()
    }
  })

  /**
   * Returns all the entries in the cache that match the filters.
   *
   * @param filters - filters to apply to the entries
   */
  const getEntries = action((filters: UseMutationEntryFilter = {}): UseMutationEntry[] => {
    const node = filters.key ? caches.value.find(toCacheKey(filters.key)) : caches.value

    if (!node) return []

    return (filters.exact ? (node.value ? [node.value] : []) : [...node]).filter(
      (entry) =>
        (filters.status == null || entry.state.value.status === filters.status)
        && (!filters.predicate || filters.predicate(entry)),
    )
  })

  async function mutate<
    TResult = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(
    currentEntry: UseMutationEntry<TResult, TVars, TError, TContext>,
    vars: NoInfer<TVars>,
  ): Promise<TResult> {
    currentEntry.asyncStatus.value = 'loading'
    currentEntry.vars.value = vars

    // TODO: AbortSignal that is aborted when the mutation is called again so we can throw in pending
    let currentData: TResult | undefined
    let currentError: TError | undefined
    type OnMutateContext = Parameters<
      Required<UseMutationOptions<TResult, TVars, TError, TContext>>['onMutate']
    >['1']
    type OnSuccessContext = Parameters<
      Required<UseMutationOptions<TResult, TVars, TError, TContext>>['onSuccess']
    >['2']
    type OnErrorContext = Parameters<
      Required<UseMutationOptions<TResult, TVars, TError, TContext>>['onError']
    >['2']
    const { options } = currentEntry

    let context: OnMutateContext | OnErrorContext | OnSuccessContext = {}

    const currentCall = (currentEntry.pending = Symbol())
    try {
      // TODO: implement
      // let globalOnMutateContext: UseMutationGlobalContext | undefined
      // let globalOnMutateContext = await globalOptions.onMutate?.(vars)

      const onMutateContext = (await options.onMutate?.(
        vars,
        context,
        // NOTE: the cast makes it easier to write without extra code. It's safe because { ...null, ...undefined } works and TContext must be a Record<any, any>
      )) as _ReduceContext<TContext>

      // we set the context here so it can be used by other hooks
      context = {
        // ...globalOnMutateContext!,
        ...onMutateContext,
        // NOTE: needed for onSuccess cast
      } satisfies OnSuccessContext

      const newData = (currentData = await options.mutation(vars, context as OnSuccessContext))

      await options.onSuccess?.(
        newData,
        vars,
        // NOTE: cast is safe because of the satisfies above
        // using a spread also works
        context as OnSuccessContext,
      )

      if (currentEntry.pending === currentCall) {
        setEntryState(currentEntry, {
          status: 'success',
          data: newData,
          error: null,
        })
      }
    } catch (newError: unknown) {
      currentError = newError as TError
      await options.onError?.(currentError, vars, context)
      if (currentEntry.pending === currentCall) {
        setEntryState(currentEntry, {
          status: 'error',
          data: currentEntry.state.value.data,
          error: currentError,
        })
      }
      throw newError
    } finally {
      // TODO: should we catch and log it?
      await options.onSettled?.(currentData, currentError, vars, context)
      if (currentEntry.pending === currentCall) {
        currentEntry.asyncStatus.value = 'idle'
      }
    }

    return currentData
  }

  return {
    caches,
    ensure,
    ensureDefinedMutation,
    mutate,
    remove,

    setEntryState,
    getEntries,
  }
})
