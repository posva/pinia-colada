import { computed, shallowRef } from 'vue'
import type { ComputedRef, ShallowRef } from 'vue'
import { type UseQueryStatus, useQueryCache } from './query-store'
import type { UseQueryKey } from './query-options'
import type { ErrorDefault } from './types-extension'
import { type _Awaitable, noop } from './utils'

type _MutationKeys<TVars, TResult> =
  | UseQueryKey[]
  | ((data: TResult, vars: TVars) => UseQueryKey[])

export interface _EmptyObject {}

export type _ReduceContext<TContext> = TContext extends void | null | undefined
  ? _EmptyObject
  : TContext

export interface UseMutationOptions<
  TResult = unknown,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> | void | null = void,
> {
  /**
   * The key of the mutation. If the mutation is successful, it will invalidate the query with the same key and refetch it
   */
  mutation: (vars: TVars) => Promise<TResult>

  // TODO: move this to a plugin that calls invalidateEntry()
  /**
   * Keys to invalidate if the mutation succeeds so that `useQuery()` refetch if used.
   */
  keys?: _MutationKeys<TVars, TResult>

  /**
   * Hook to execute a callback when the mutation is triggered
   */
  onMutate?: (vars: TVars) => _Awaitable<TContext>

  /**
   * Hook to execute a callback in case of error
   */
  onError?: (
    context: { error: TError, vars: TVars } & _ReduceContext<TContext>,
  ) => unknown
  // onError?: (context: { error: TError, vars: TParams } & TContext) => Promise<TContext | void> | TContext | void

  /**
   * Hook to execute a callback in case of error
   */
  onSuccess?: (
    context: { data: TResult, vars: TVars } & _ReduceContext<TContext>,
  ) => unknown

  /**
   * Hook to execute a callback in case of error
   */
  onSettled?: (
    context: {
      data: TResult | undefined
      error: TError | undefined
      vars: TVars
    } & _ReduceContext<TContext>,
  ) => unknown

  // TODO: invalidate options exact, refetch, etc
}

// export const USE_MUTATIONS_DEFAULTS = {} satisfies Partial<UseMutationsOptions>

export interface UseMutationReturn<TResult, TVars, TError> {
  /**
   * The result of the mutation. `undefined` if the mutation has not been called yet.
   */
  data: ShallowRef<TResult | undefined>

  /**
   * The error of the mutation. `null` if the mutation has not been called yet or if it was successful.
   */
  error: ShallowRef<TError | null>

  /**
   * Whether the mutation is currently executing.
   */
  isLoading: ComputedRef<boolean>

  /**
   * The status of the mutation.
   * @see {@link UseQueryStatus}
   */
  status: ShallowRef<UseQueryStatus>

  /**
   * Calls the mutation and returns a promise with the result.
   *
   * @param args - parameters to pass to the mutation
   */
  mutateAsync: unknown | void extends TVars
    ? () => Promise<TResult>
    : (vars: TVars) => Promise<TResult>

  /**
   * Calls the mutation without returning a promise to avoid unhandled promise rejections.
   *
   * @param args - parameters to pass to the mutation
   */
  mutate: (...args: unknown | void extends TVars ? [] : [vars: TVars]) => void

  /**
   * Resets the state of the mutation to its initial state.
   */
  reset: () => void
}

// TODO: it might be worth having multiple UseMutationReturnState:
// type UseMutationReturn<TResult, TVars, TError> = UseMutationReturnSuccess | UseMutationReturnError | UseMutationReturnLoading

export function useMutation<
  TResult,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> | void | null = void,
>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
): UseMutationReturn<TResult, TVars, TError> {
  const store = useQueryCache()

  // TODO: there could be a mutation store that stores the state based on an optional key (if passed). This would allow to retrieve the state of a mutation with useMutationState(key)
  const status = shallowRef<UseQueryStatus>('pending')
  const data = shallowRef<TResult>()
  const error = shallowRef<TError | null>(null)

  // a pending promise allows us to discard previous ongoing requests
  // let pendingPromise: Promise<TResult> | null = null

  let pendingCall: symbol | undefined
  async function mutateAsync(vars: TVars): Promise<TResult> {
    status.value = 'loading'

    // TODO: AbortSignal that is aborted when the mutation is called again so we can throw in pending
    let currentData: TResult | undefined
    let currentError: TError | undefined
    let context!: _ReduceContext<TContext>

    const currentCall = (pendingCall = Symbol())
    try {
      // NOTE: the cast makes it easier to write without extra code. It's safe because { ...null, ...undefined } works and TContext must be a Record<any, any>
      context = (await options.onMutate?.(vars)) as _ReduceContext<TContext>

      const newData = (currentData = await options.mutation(vars))

      await options.onSuccess?.({ data: newData, vars, ...context })

      if (pendingCall === currentCall) {
        data.value = newData
        error.value = null
        status.value = 'success'

        // TODO: move to plugin
        if (options.keys) {
          const keys
            = typeof options.keys === 'function'
              ? options.keys(newData, vars)
              : options.keys
          for (const key of keys) {
            // TODO: find a way to pass a source of the invalidation, could be a symbol associated with the mutation, the parameters
            store.invalidateEntry(key)
          }
        }
      }
    } catch (newError: any) {
      currentError = newError
      await options.onError?.({ error: newError, vars, ...context })
      if (pendingCall === currentCall) {
        error.value = newError
        status.value = 'error'
      }
      throw newError
    } finally {
      await options.onSettled?.({
        data: currentData,
        error: currentError,
        vars,
        ...context,
      })
    }

    return currentData
  }

  function mutate(vars: TVars) {
    mutateAsync(vars).catch(noop)
  }

  function reset() {
    data.value = undefined
    error.value = null
    status.value = 'pending'
  }

  return {
    data,
    isLoading: computed(() => status.value === 'loading'),
    status,
    error,
    // @ts-expect-error: it would be nice to find a type-only refactor that works
    mutate,
    // @ts-expect-error: it would be nice to find a type-only refactor that works
    mutateAsync,
    reset,
  }
}
