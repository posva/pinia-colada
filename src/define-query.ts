import type { UseQueryOptions } from './query-options'
import type { ErrorDefault } from './types-extension'
import type { UseQueryReturn } from './use-query'
import {
  type EffectScope,
  getCurrentInstance,
  getCurrentScope,
  onScopeDispose,
} from 'vue'
import {
  queryEntry_addDep,
  queryEntry_removeDep,
  useQueryCache,
} from './query-store'
import { useQuery } from './use-query'

/**
 * The current effect scope where the function returned by `defineQuery` is being called. This allows `useQuery()` to know if it should be attached to an effect scope or not
 */
let currentDefineQueryEffect: undefined | EffectScope

// NOTE: no setter because it cannot be set outside of defineQuery()

/**
 * Gets the current defineQuery effect scope. This is used internally by `useQuery` to attach the effect to the query
 * entry dependency list.
 * @internal
 */
export function getCurrentDefineQueryEffect() {
  return currentDefineQueryEffect
}

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
    const store = useQueryCache()
    // preserve any current effect to account for nested usage of these functions
    const previousEffect = currentDefineQueryEffect
    const currentScope
      = getCurrentInstance() || (currentDefineQueryEffect = getCurrentScope())

    const [entries, ret] = store.ensureDefinedQuery(setupFn)
    // NOTE: most of the time this should be set, so maybe we should show a dev warning
    // if it's not set instead
    if (currentScope) {
      entries.forEach((entry) => {
        queryEntry_addDep(entry, currentScope)
        if (process.env.NODE_ENV !== 'production') {
          entry.__hmr ??= {}
          entry.__hmr.skip = true
        }
      })
      onScopeDispose(() => {
        entries.forEach((entry) => {
          queryEntry_removeDep(entry, currentScope, store)
        })
      })
    }

    // reset the previous effect
    currentDefineQueryEffect = previousEffect

    return ret
  }
}
