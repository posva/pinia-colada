import { computed, shallowRef } from 'vue'
import type { ComputedRef, ShallowRef } from 'vue'
import { type UseQueryStatus, useQueryCache } from './query-store'
import type { UseQueryKey } from './query-options'
import type { ErrorDefault } from './types-extension'
import type { _Awaitable } from './utils'

type _MutationKeys<TParams extends readonly any[], TResult> =
  | UseQueryKey[]
  | ((result: TResult, ...args: TParams) => UseQueryKey[])

export interface UseMutationOptions<
  TResult = unknown,
  TParams extends readonly unknown[] = readonly [],
  TError = ErrorDefault,
  TContext extends Record<any, any> | void | null = void,
> {
  /**
   * The key of the mutation. If the mutation is successful, it will invalidate the query with the same key and refetch it
   */
  mutation: (...args: TParams) => Promise<TResult>

  // TODO: move this to a plugin that calls invalidateEntry()
  /**
   * Keys to invalidate if the mutation succeeds so that `useQuery()` refetch if used.
   */
  keys?: _MutationKeys<TParams, TResult>

  /**
   * Hook to execute a callback when the mutation is triggered
   */
  onMutate?: (...args: TParams) => _Awaitable<TContext>

  /**
   * Hook to execute a callback in case of error
   */
  onError?: (context: { error: TError, args: TParams, context: TContext }) => unknown
  // onError?: (context: { error: TError, args: TParams } & TContext) => Promise<TContext | void> | TContext | void

  /**
   * Hook to execute a callback in case of error
   */
  onSuccess?: (context: { data: TResult, args: TParams, context: TContext }) => unknown

  /**
   * Hook to execute a callback in case of error
   */
  onSettled?: (context: { data: TResult | undefined, error: TError | null, args: TParams, context: TContext }) => unknown

  // TODO: invalidate options exact, refetch, etc
}

// export const USE_MUTATIONS_DEFAULTS = {} satisfies Partial<UseMutationsOptions>

export interface UseMutationReturn<
  TResult = unknown,
  TParams extends readonly unknown[] = readonly [],
  TError = ErrorDefault,
> {
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
   * @param params - parameters to pass to the mutation
   */
  mutate: (...params: TParams) => Promise<TResult>

  /**
   * Resets the state of the mutation to its initial state.
   */
  reset: () => void
}

export function useMutation<
  TResult,
  TParams extends readonly unknown[] = readonly [],
  TError = ErrorDefault,
  TContext extends Record<any, any> | void | null = void,
>(
  options: UseMutationOptions<TResult, TParams, TError, TContext>,
): UseMutationReturn<TResult, TParams, TError> {
  const store = useQueryCache()

  const status = shallowRef<UseQueryStatus>('pending')
  const data = shallowRef<TResult>()
  const error = shallowRef<TError | null>(null)

  // a pending promise allows us to discard previous ongoing requests
  let pendingPromise: Promise<TResult> | null = null

  async function mutate(...args: TParams) {
    status.value = 'loading'

    // TODO: should this context be passed to mutation() and ...args transformed into one object?
    const context = (await options.onMutate?.(...args)) as TContext

    // TODO: AbortSignal that is aborted when the mutation is called again so we can throw in pending
    const promise = (pendingPromise = options
      .mutation(...args)
      .then(async (newData) => {
        await options.onSuccess?.({ data: newData, args, context })

        if (pendingPromise === promise) {
          data.value = newData
          error.value = null
          status.value = 'success'
          if (options.keys) {
            const keys
              = typeof options.keys === 'function'
                ? options.keys(newData, ...args)
                : options.keys
            for (const key of keys) {
              // TODO: find a way to pass a source of the invalidation, could be a symbol associated with the mutation, the parameters
              store.invalidateEntry(key)
            }
          }
        }
        return newData
      })
      .catch(async (newError) => {
        if (pendingPromise === promise) {
          error.value = newError
          status.value = 'error'
        }
        await options.onError?.({ error: newError, args, context })
        throw newError
      })
      .finally(async () => {
        await options.onSettled?.({ data: data.value, error: error.value, args, context })
      }))

    return promise
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
    mutate,
    reset,
  }
}
