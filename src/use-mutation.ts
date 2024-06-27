import { computed, shallowRef } from 'vue'
import type { ComputedRef, ShallowRef } from 'vue'
import { useQueryCache } from './query-store'
import type { ErrorDefault } from './types-extension'
import { noop } from './utils'
import type { MutationStatus, UseMutationOptions, _ReduceContext } from './mutation-options'
import { useMutationOptions } from './mutation-options'

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
   * @see {@link MutationStatus}
   */
  status: ShallowRef<MutationStatus>

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

/**
 * Setups a mutation.
 *
 * @param options - Options to create the mutation
 * @example
 * ```ts
 * const { mutate, status, error } = useMutation({
 *   mutation: (id: number) => fetch(`/api/todos/${id}`),
 *   onSuccess({ queryClient }) {
 *     queryClient.invalidateQueries('todos')
 *   },
 * })
 * ```
 */
export function useMutation<
  TResult,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> | void | null = void,
>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
): UseMutationReturn<TResult, TVars, TError> {
  const store = useQueryCache()
  const MUTATION_PLUGIN_OPTIONS = useMutationOptions()

  // TODO: there could be a mutation store that stores the state based on an optional key (if passed). This would allow to retrieve the state of a mutation with useMutationState(key)
  const status = shallowRef<MutationStatus>('pending')
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
      if (MUTATION_PLUGIN_OPTIONS.onMutate) {
        context = {
          ...(await MUTATION_PLUGIN_OPTIONS.onMutate(vars)) as _ReduceContext<TContext>,
          ...context,
        }
      }

      const newData = (currentData = await options.mutation(
        vars,
        context as TContext,
      ))

      const onSuccessArgs = { data: newData, vars, ...context }
      await options.onSuccess?.(onSuccessArgs)
      await MUTATION_PLUGIN_OPTIONS.onSuccess?.(onSuccessArgs)

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
      const onErrorArgs = { error: newError, vars, ...context }
      await options.onError?.(onErrorArgs)
      await MUTATION_PLUGIN_OPTIONS.onError?.(onErrorArgs)
      if (pendingCall === currentCall) {
        error.value = newError
        status.value = 'error'
      }
      throw newError
    } finally {
      const onSettledArgs = {
        data: currentData,
        error: currentError,
        vars,
        ...context,
      }
      await options.onSettled?.(onSettledArgs)
      await MUTATION_PLUGIN_OPTIONS.onSettled?.(onSettledArgs)
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

  const mutationReturn: UseMutationReturn<TResult, TVars, TError> = {
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

  MUTATION_PLUGIN_OPTIONS.setup?.({
    ...mutationReturn,
    options,
  })

  return mutationReturn
}
