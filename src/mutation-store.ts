import type { ComponentInternalInstance, EffectScope, ShallowRef } from 'vue'
import type { AsyncStatus, DataState } from './data-state'
import type { EntryNodeKey } from './tree-map'
import { defineStore } from 'pinia'
import { getCurrentScope, shallowReactive, shallowRef } from 'vue'
import { TreeMapNode } from './tree-map'
import type { _EmptyObject } from './utils'
import { isSameArray, stringifyFlatObject, toValueWithArgs } from './utils'
import type {
  _ReduceContext,
  UseMutationGlobalContext,
  UseMutationOptions,
} from './use-mutation'
import { useQueryCache } from './query-store'

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

export const useMutationCache = /* @__PURE__ */ defineStore(
  '_pc_mutation',
  ({ action }) => {
    // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
    // inside computed properties
    const cachesRaw = new TreeMapNode<
      UseMutationEntry<unknown, any, unknown, any>
    >()
    const caches = shallowReactive(cachesRaw)

    const queryCache = useQueryCache()

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
      const key
        = vars && toValueWithArgs(options.key, vars)?.map(stringifyFlatObject)

      if (!entry) {
        entry = createMutationEntry(options, key)
        if (key) {
          caches.set(
            key,
            // @ts-expect-error: function types with generics are incompatible
            entry,
          )
        }
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
          caches.set(
            key,
            // @ts-expect-error: function types with generics are incompatible
            entry,
          )
        }
      }

      return entry
    }
    //
    // this allows use to attach reactive effects to the scope later on
    const scope = getCurrentScope()!

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

      let context: OnMutateContext | OnErrorContext | OnSuccessContext = {
        queryCache,
      }

      const currentCall = (currentEntry.pending = Symbol())
      try {
        // TODO:
        let globalOnMutateContext: UseMutationGlobalContext | undefined
        // globalOnMutateContext = await globalOptions.onMutate?.(vars)

        const onMutateContext = (await options.onMutate?.(
          vars,
          context,
          // NOTE: the cast makes it easier to write without extra code. It's safe because { ...null, ...undefined } works and TContext must be a Record<any, any>
        )) as _ReduceContext<TContext>

        const newData = (currentData = await options.mutation(
          vars,
          onMutateContext,
        ))

        // we set the context here so it can be used by other hooks
        context = {
          ...globalOnMutateContext!,
          queryCache,
          ...onMutateContext,
          // NOTE: needed for onSuccess cast
        } satisfies OnSuccessContext

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

    return { ensure, ensureDefinedMutation, caches, mutate }
  },
)
