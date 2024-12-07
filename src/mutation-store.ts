import type { ComponentInternalInstance, EffectScope, ShallowRef } from 'vue'
import { reactive, getCurrentScope, shallowReactive, shallowRef } from 'vue'
import type { AsyncStatus, DataState } from './data-state'
import type { EntryNodeKey } from './tree-map'
import { defineStore } from 'pinia'
import { TreeMapNode } from './tree-map'
import type { _EmptyObject } from './utils'
import { isSameArray, stringifyFlatObject, toValueWithArgs } from './utils'
import type {
  _MutationKey,
  _ReduceContext,
  UseMutationOptions,
} from './use-mutation'

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
 * A multi mutation entry in the cache.
 */
export interface UseMultiMutationEntry<
  TResult = unknown,
  TVars = unknown,
  TError = unknown,
  TContext extends Record<any, any> = _EmptyObject,
> {
  key?: EntryNodeKey[]
  recentMutation: UseMutationEntry<TResult, TVars, TError, TContext>
  invocations: Map<EntryNodeKey, UseMutationEntry<TResult, TVars, TError, TContext>>
}

/**
 * Helper to generate a unique key for the entry.
 */
function generateKey<TVars>(
  key: _MutationKey<TVars> | undefined,
  vars: TVars,
): Array<string> | undefined {
  return key ? toValueWithArgs(key, vars).map(stringifyFlatObject) : undefined
}

function createMultiMutationEntryCached<
  TResult = unknown,
  TVars = unknown,
  TError = unknown,
  TContext extends Record<any, any> = _EmptyObject,
>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
  key?: EntryNodeKey[] | undefined,
  cache?: TreeMapNode,
  vars?: TVars,
): UseMultiMutationEntry<TResult, TVars, TError, TContext> {
  const entry = {
    key,
    recentMutation: createMutationEntryCached(options, key, undefined, vars),
    invocations: new Map(),
  }

  if (cache && key) {
    cache.set(key, entry)
  }
  return entry
}

function createMutationEntryCached<
  TResult = unknown,
  TVars = unknown,
  TError = unknown,
  TContext extends Record<any, any> = _EmptyObject,
>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
  key?: EntryNodeKey[] | undefined,
  cache?: TreeMapNode,
  vars?: TVars,
): UseMutationEntry<TResult, TVars, TError, TContext> {
  const entry = {
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

  if (cache && key) {
    cache.set(key, entry)
  }

  return entry
}

export const useMutationCache = /* @__PURE__ */ defineStore(
  '_pc_mutation',
  ({ action }) => {
    // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
    // inside computed properties
    const cachesRaw = new TreeMapNode<
      UseMutationEntry<unknown, any, unknown, any>
    >()
    const caches = shallowReactive(cachesRaw)

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
      const key = generateKey(options.key, vars as TVars)

      // If no key is defined, reuse the current entry or create one without caching.
      if (!key) {
        return entry || createMutationEntryCached(options)
      }

      // Initialize entry.
      if (!entry) {
        const entry = createMutationEntryCached(options, key, caches, vars)
        if (key) {
          caches.set(
            key,
            // @ts-expect-error: function types with generics are incompatible
            entry,
          )
        }
        return entry
      } else {
        // Edge cases protection.
        // Assign the key to the entry if it was undefined previously and cache this entry.
        if (!entry.key) {
          entry.key = key
          caches.set(
            key,
            // @ts-expect-error: function types with generics are incompatible
            entry,
          )
        } else if (!isSameArray(entry.key, key)) {
          // If the key is different, create and cache a new entry. TODO: previous mutations is stale.
          entry = createMutationEntryCached(options, key, multiMutationCaches, vars)
          if (key) {
            caches.set(
              key,
              // @ts-expect-error: function types with generics are incompatible
              entry,
            )
          }
        }
      }

      // Reuse the existing entry by default.
      return entry
    }

    // this allows use to attach reactive effects to the scope later on
    const scope = getCurrentScope()!

    // const globalOptions = inject()

    const defineMutationMap = new WeakMap<() => unknown, unknown>()

    /**
     * Ensures a query created with {@link defineMutation} is present in the cache. If it's not, it creates a new one.
     * @param fn - function that defines the query
     */
    const ensureDefinedMutation = action(<T>(fn: () => T) => {
      let defineMutationResult = defineMutationMap.get(fn)
      if (!defineMutationResult) {
        defineMutationMap.set(fn, defineMutationResult = scope.run(fn))
      }

      return defineMutationResult
    })

    const multiMutationCachesRaw = new TreeMapNode<UseMultiMutationEntry>()
    const multiMutationCaches = shallowReactive(multiMutationCachesRaw)

    /**
     * Ensures a query created with {@link useMultiMutation} is present in the cache. If it's not, it creates a new one.
     * @param options
     * @param entry
     * @param vars
     */
    function ensureMultiMutation<
      TResult = unknown,
      TVars = unknown,
      TError = unknown,
      TContext extends Record<any, any> = Record<any, any>,
    >(
      options: UseMutationOptions<TResult, TVars, TError, TContext>,
      entry?: UseMultiMutationEntry<TResult, TVars, TError, TContext>,
      vars?: TVars,
    ): UseMultiMutationEntry<TResult, TVars, TError, TContext> {
      const key = generateKey(options.key, vars as TVars)

      // If no key is defined, reuse the current entry or create one without caching.
      if (!key) {
        return entry || createMultiMutationEntryCached(options)
      }

      // Given entry prevails given key.
      if (entry) {
        // Edge case protection.
        // If the key is different, recreate the entry.
        if (!entry.key || !isSameArray(entry.key, key)) {
          entry = createMultiMutationEntryCached(options, key)
          // TODO: Entry with the old key is stale.
        }
      } else {
        entry = createMultiMutationEntryCached(options, key)
      }

      return entry
    }

    function addInvocation<TResult, TVars, TError, TContext extends Record<any, any> = _EmptyObject>(
      entry: UseMultiMutationEntry<TResult, TVars, TError, TContext>,
      invocationKey: EntryNodeKey,
      options: UseMutationOptions<TResult, TVars, TError, TContext>,
      vars: TVars,
    ): UseMutationEntry<TResult, TVars, TError, TContext> {
      const invocationEntry = createMutationEntryCached(
        options,
        [invocationKey],
        undefined,
        vars,
      )
      // Override invocation if same key is given.
      entry.invocations.set(invocationKey, invocationEntry)
      // Update recentMutation for tracking
      entry.recentMutation = invocationEntry

      return invocationEntry
    }

    function removeInvocation<TResult, TVars, TError, TContext extends Record<any, any> = _EmptyObject>(
      entry: UseMultiMutationEntry<TResult, TVars, TError, TContext>,
      invocationKey?: string,
    ): void {
      if (invocationKey) {
        entry.invocations.delete(invocationKey)
      } else {
        entry.invocations.clear()
      }
    }

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
        Required<
          UseMutationOptions<TResult, TVars, TError, TContext>
        >['onMutate']
      >['1']
      type OnSuccessContext = Parameters<
        Required<
          UseMutationOptions<TResult, TVars, TError, TContext>
        >['onSuccess']
      >['2']
      type OnErrorContext = Parameters<
        Required<
          UseMutationOptions<TResult, TVars, TError, TContext>
        >['onError']
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

        const newData = (currentData = await options.mutation(
          vars,
          context as OnSuccessContext,
        ))

        await options.onSuccess?.(
          newData,
          vars,
          // NOTE: cast is safe because of the satisfies above
          // using a spread also works
          context as OnSuccessContext,
        )

        if (currentEntry.pending === currentCall) {
          currentEntry.state.value = {
            status: 'success',
            data: newData,
            error: null,
          }
        }
      } catch (newError: any) {
        currentError = newError
        await options.onError?.(newError, vars, context)
        if (currentEntry.pending === currentCall) {
          currentEntry.state.value = {
            status: 'error',
            data: currentEntry.state.value.data,
            error: newError,
          }
        }
        throw newError
      } finally {
        await options.onSettled?.(currentData, currentError, vars, context)
        currentEntry.asyncStatus.value = 'idle'
      }

      return currentData
    }

    return { ensure, ensureDefinedMutation, ensureMultiMutation, caches, removeInvocation, addInvocation, mutate }
  },
)
