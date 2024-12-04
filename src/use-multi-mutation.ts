import { useMutation, type UseMutationOptions, type UseMutationReturn } from './use-mutation'
import type { ErrorDefault } from './types-extension'
import type { _EmptyObject } from './utils'
import { noop } from './utils'
import type { ShallowRef } from 'vue'
import type { DataState } from './data-state'
import { useMutationCache, type UseMultiMutationEntry } from './mutation-store'
import { shallowRef } from 'vue'

/**
 * @example
 * ```ts
 * const { data, isLoading, error, mutate, reset, clearKey } = useMultiMutation({
 *   mutation: async (id: number) => {
 *     return await api.deleteItem(id)
 *   },
 *   onSuccess: () => {
 *     console.log('Mutation succeeded')
 *   },
 *   onError: () => {
 *     console.log('Mutation failed')
 *   },
 * })
 *
 * mutate('item-1', 123)
 *
 * if (isLoading('item-1')) {
 *   console.log('Loading...')
 * }
 *
 * console.log(data('item-1'))
 * console.log(error('item-1'))
 *
 * reset('item-1')
 * clearKey('item-1')
 */

export function useMultiMutation<TResult, TVars = void, TError = ErrorDefault, TContext extends Record<any, any> = _EmptyObject>(
  options: Omit<UseMutationOptions<TResult, TVars, TError>, 'key'>,
) {
  const mutationCache = useMutationCache()
  const entry = shallowRef<UseMultiMutationEntry<TResult, TVars, TError, TContext>>(
    mutationCache.ensureMultiMutation(options),
  )

  function forget(invocationKey: string) {
    entry.value.invocations.delete(invocationKey)
  }

  function data(invocationKey: string) {
    return entry.value.invocations.get(invocationKey)?.state.value.data
  }

  function isLoading(invocationKey: string) {
    return entry.value.invocations.get(invocationKey)?.asyncStatus.value === 'loading'
  }

  function error(invocationKey: string) {
    return entry.value.invocations.get(invocationKey)?.state.value.error
  }

  async function mutateAsync(invocationKey: string, vars: TVars): Promise<TResult> {
    if (!vars) {
      throw new Error('Mutation variables are required for multi-mutation.')
    }

    const invocationEntry = mutationCache.ensure(
      entry.value.mutationOptions,
      entry.value.invocations.get(invocationKey),
      vars,
    )

    entry.value.invocations.set(invocationKey, invocationEntry)
    return mutationCache.mutate(invocationEntry, vars)
  }

  function mutate(invocationKey: string, vars: TVars) {
    mutateAsync(invocationKey, vars).catch(noop)
  }

  function reset(invocationKey?: string) {
    if (invocationKey) {
      const invocationEntry = entry.value.invocations.get(invocationKey)
      if (invocationEntry) {
        invocationEntry.state.value = {
          status: 'pending',
          data: undefined,
          error: null,
        }
        invocationEntry.asyncStatus.value = 'idle'
      }
    } else {
      entry.value.invocations.forEach((invocationEntry) => {
        invocationEntry.state.value = {
          status: 'pending',
          data: undefined,
          error: null,
        }
        invocationEntry.asyncStatus.value = 'idle'
      })
    }
  }

  return {
    data,
    isLoading,
    error,
    mutate,
    mutateAsync,
    reset,
    forget,
  }
}
