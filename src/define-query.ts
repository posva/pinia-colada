import { getCurrentInstance, getCurrentScope, onMounted, onUnmounted } from 'vue'
import type { UseQueryOptions } from './query-options'
import { useQueryCache } from './query-store'
import type { ErrorDefault } from './types-extension'
import type { UseQueryReturn } from './use-query'
import { useQuery } from './use-query'

/**
 * Define a query with the given options. Similar to `useQuery(options)` but allows you to reuse the query in multiple
 * places.
 *
 * @param options - the options to define the query
 * @example
 * ```ts
 * const useTodoList = defineQuery({
 *   key: ['todos'],
 *   query: () => fetch('/api/todos', { method: 'GET' }),
 * })
 * ```
 */
export function defineQuery<TResult, TError = ErrorDefault>(
  options: UseQueryOptions<TResult, TError>,
): () => UseQueryReturn<TResult, TError>

/**
 * Define a query with a setup function. Allows to return arbitrary values from the query function, create contextual
 * refs, rename the returned values, etc. The setup function will be called only once, like stores, and **must be
 * synchronous**.
 *
 * @param setup - a function to setup the query
 * @example
 * ```ts
 * const useFilteredTodos = defineQuery(() => {
 *   const todoFilter = ref<'all' | 'finished' | 'unfinished'>('all')
 *   const { data, ...rest } = useQuery({
 *    key: ['todos', { filter: todoFilter.value }],
 *     query: () =>
 *       fetch(`/api/todos?filter=${todoFilter.value}`, { method: 'GET' }),
 *   })
 *   // expose the todoFilter ref and rename data for convenience
 *   return { ...rest, todoList: data, todoFilter }
 * })
 * ```
 */
export function defineQuery<T>(setup: () => T): () => T
export function defineQuery(
  optionsOrSetup: UseQueryOptions | (() => unknown),
): () => unknown {
  const setupFn
    = typeof optionsOrSetup === 'function'
      ? optionsOrSetup
      : () => useQuery(optionsOrSetup)
  return () => {
    const defineQueryEntry = useQueryCache().ensureDefinedQuery(setupFn)
    if (getCurrentInstance()) {
      onMounted(() => {
        defineQueryEntry[3].add(getCurrentScope()!)
      })
      onUnmounted(() => {
        defineQueryEntry[3].delete(getCurrentScope()!)
        if (defineQueryEntry[3].size === 0) {
          defineQueryEntry[2].stop()
          useQueryCache().removeFromDefineQueryMap(setupFn)
        }
      })
    }
    return defineQueryEntry[1]
  }
}
