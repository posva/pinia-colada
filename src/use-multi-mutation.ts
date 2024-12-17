import type { UseMutationOptions } from './use-mutation'
import type { ErrorDefault } from './types-extension'
import type { _EmptyObject } from './utils'
import { noop } from './utils'
import { useMutationCache, type UseMultiMutationEntry } from './mutation-store'
import { shallowRef } from 'vue'
import type { EntryNodeKey } from './tree-map'

/**
 * @example
 * ```ts
 * const { data, isLoading, error, mutate, reset, remove } = useMultiMutation({
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
 * remove('item-2')
 * reset()
 *
 */

export function useMultiMutation<TResult, TVars = void, TError = ErrorDefault, TContext extends Record<any, any> = _EmptyObject>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
) {
  const mutationCache = useMutationCache()
  const entry = shallowRef<UseMultiMutationEntry<TResult, TVars, TError, TContext>>(
    mutationCache.ensureMultiMutation(options),
  )

  function data(invocationKey?: EntryNodeKey) {
    if (!invocationKey) {
      return Array.from(entry.value.invocations.entries())
        .map(([key, entry]) => ({ key, data: entry.state?.value?.data }))
        .filter(({ data }) => data !== undefined)
    }
    return entry.value.invocations.get(invocationKey)?.state?.value?.data
  }

  function isLoading(invocationKey: EntryNodeKey) {
    return entry.value.invocations.get(invocationKey)?.asyncStatus.value === 'loading'
  }

  function error(invocationKey: EntryNodeKey) {
    return entry.value.invocations.get(invocationKey)?.state.value.error
  }

  async function mutateAsync(invocationKey: EntryNodeKey, vars: TVars): Promise<TResult> {
    // Todo: properly throw error in the onError hook.
    if (!vars) {
      const error = new Error('Mutation variables are required for multi-mutation.')

      entry.value.recentMutation.options.onError?.(
        error as TError,
        undefined as TVars,
        {},
      )

      throw error
    }

    const invocationEntry = mutationCache.addInvocation(entry.value, invocationKey, options, vars)
    return mutationCache.mutate(invocationEntry, vars)
  }

  function mutate(invocationKey: EntryNodeKey, vars: TVars) {
    mutateAsync(invocationKey, vars).catch(noop)
  }

  function remove(invocationKey: EntryNodeKey) {
    mutationCache.removeInvocation(entry.value, invocationKey)
  }

  function reset() {
    mutationCache.removeInvocation(entry.value)
  }

  // const variables = computed(() => entry.value.recentMutation.vars)

  return {
    data,
    isLoading,
    error,
    mutate,
    mutateAsync,
    reset,
    remove,
  }
}
