import { computed, ref, type ComputedRef, shallowRef } from 'vue'
import { UseQueryStatus, useDataFetchingStore } from './data-fetching-store'
import { type UseQueryKey } from './use-query'
import { type _MaybeArray, toArray } from './utils'

type _MutationKeys<TParams extends readonly any[], TResult> =
  | _MaybeArray<UseQueryKey>[]
  | ((result: TResult, ...args: TParams) => _MaybeArray<UseQueryKey>[])

export interface UseMutationOptions<
  TResult = unknown,
  TParams extends readonly unknown[] = readonly [],
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
}

// export const USE_MUTATIONS_DEFAULTS = {} satisfies Partial<UseMutationsOptions>

export interface UseMutationReturn<
  TResult = unknown,
  TParams extends readonly unknown[] = readonly [],
  TError = Error,
> {
  /**
   * The result of the mutation. `undefined` if the mutation has not been called yet.
   */
  data: ComputedRef<TResult | undefined>

  /**
   * The error of the mutation. `null` if the mutation has not been called yet or if it was successful.
   */
  error: ComputedRef<TError | null>

  /**
   * Whether the mutation is currently executing.
   */
  isLoading: ComputedRef<boolean>

  /**
   * The status of the mutation.
   * @see {@link UseQueryStatus}
   */
  status: ComputedRef<UseQueryStatus>

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
  TError = Error,
>(
  options: UseMutationOptions<TResult, TParams>
): UseMutationReturn<TResult, TParams, TError> {
  const store = useDataFetchingStore()

  const status = shallowRef<UseQueryStatus>('pending')
  const data = shallowRef<TResult>()
  const error = shallowRef<TError | null>(null)

  // a pending promise allows us to discard previous ongoing requests
  let pendingPromise: Promise<TResult> | null = null
  function mutate(...args: TParams) {
    status.value = 'loading'

    const promise = (pendingPromise = options
      .mutation(...args)
      .then((_data) => {
        if (pendingPromise === promise) {
          data.value = _data
          error.value = null
          status.value = 'success'
          if (options.keys) {
            const keys = (
              typeof options.keys === 'function'
                ? options.keys(_data, ...args)
                : options.keys
            ).map(toArray)
            for (const key of keys) {
              store.invalidateEntry(key, true)
            }
          }
        }
        return _data
      })
      .catch((_error) => {
        if (pendingPromise === promise) {
          error.value = _error
          status.value = 'error'
        }
        throw _error
      }))

    return promise
  }

  function reset() {
    data.value = undefined
    error.value = null
    status.value = 'pending'
  }

  const mutationReturn = {
    data: computed(() => data.value),
    isLoading: computed(() => status.value === 'loading'),
    status: computed(() => status.value),
    error: computed(() => error.value),
    mutate,
    reset,
  } satisfies UseMutationReturn<TResult, TParams, TError>

  return mutationReturn
}
