import { computed, ref, type ComputedRef, shallowRef } from 'vue'
import { useDataFetchingStore } from './data-fetching-store'

type _MutatorKeys<TParams extends readonly any[], TResult> = readonly (
  | string
  | ((context: { variables: TParams; result: TResult }) => string)
)[]

export interface UseMutationsOptions<
  TResult = unknown,
  TParams extends readonly unknown[] = readonly [],
> {
  /**
   * The key of the mutation. If the mutation is successful, it will invalidate the query with the same key and refetch it
   */
  mutator: (...args: TParams) => Promise<TResult>
  keys?: _MutatorKeys<TParams, TResult>
}
// export const USE_MUTATIONS_DEFAULTS = {} satisfies Partial<UseMutationsOptions>

export interface UseMutationReturn<
  TResult = unknown,
  TParams extends readonly unknown[] = readonly [],
  TError = Error,
> {
  data: ComputedRef<TResult | undefined>
  error: ComputedRef<TError | null>
  isPending: ComputedRef<boolean>

  mutate: (...params: TParams) => Promise<TResult>
  reset: () => void
}

export function useMutation<
  TResult,
  TParams extends readonly unknown[],
  TError = Error,
>(
  options: UseMutationsOptions<TResult, TParams>
): UseMutationReturn<TResult, TParams, TError> {
  console.log(options)
  const store = useDataFetchingStore()

  const isPending = ref(false)
  const data = shallowRef<TResult>()
  const error = shallowRef<TError | null>(null)

  // a pending promise allows us to discard previous ongoing requests
  let pendingPromise: Promise<TResult> | null = null
  function mutate(...args: TParams) {
    isPending.value = true
    error.value = null

    const promise = (pendingPromise = options
      .mutator(...args)
      .then((_data) => {
        if (pendingPromise === promise) {
          data.value = _data
          if (options.keys) {
            for (const key of options.keys) {
              store.invalidateEntry(
                typeof key === 'string'
                  ? key
                  : key({ variables: args, result: _data }),
                true
              )
            }
          }
        }
        return _data
      })
      .catch((_error) => {
        if (pendingPromise === promise) {
          error.value = _error
        }
        throw _error
      })
      .finally(() => {
        if (pendingPromise === promise) {
          isPending.value = false
        }
      }))

    return promise
  }

  function reset() {
    data.value = undefined
    error.value = null
  }

  const mutationReturn = {
    data: computed(() => data.value),
    isPending: computed(() => isPending.value),
    error: computed(() => error.value),
    mutate,
    reset,
  } satisfies UseMutationReturn<TResult, TParams, TError>

  return mutationReturn
}

// useMutation({
//   async mutator(one: string, other?: number) {
//     return { one, other: other || 0 }
//   },
//   keys: ['register', ({ variables: [one], result }) => `register:${one}` + result.one],
// })
