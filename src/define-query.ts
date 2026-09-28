import { getCurrentInstance, getCurrentScope, onScopeDispose, toValue, watch } from 'vue'
import type { tErrorSymbol, UseQueryOptions } from './query-options'
import { useQueryCache } from './query-store'
import type { UseQueryEntry } from './query-store'
import type { ErrorDefault } from './types-extension'
import type { UseQueryReturn } from './use-query'
import { useQuery } from './use-query'
import { noop } from './utils'
import type { _RemoveMaybeRef } from './utils'

/**
 * Options to define a query with `defineQuery()`. Similar to
 * {@link UseQueryOptions} but disallows reactive values as `defineQuery()` is
 * used outside of an effect scope.
 */
export type DefineQueryOptions<
  TData = unknown,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
> = _RemoveMaybeRef<
  UseQueryOptions<TData, TError, TDataInitial>,
  typeof tErrorSymbol | 'initialData' | 'placeholderData'
>

/**
 * Define a query with the given options. Similar to `useQuery(options)` but
 * allows you to reuse **all** of the query state in multiple places. It only
 * allow static values in options. If you need dynamic values, use the function
 * version.
 *
 * @param options - the options to define the query
 *
 * @example
 * ```ts
 * const useTodoList = defineQuery({
 *   key: ['todos'],
 *   query: () => fetch('/api/todos', { method: 'GET' }),
 * })
 * ```
 */
export function defineQuery<TData, TError = ErrorDefault>(
  options: DefineQueryOptions<TData, TError>,
): () => UseQueryReturn<TData, TError>

/**
 * Define a query with a setup function. Allows to return arbitrary values from
 * the query function, create contextual refs, rename the returned values, etc.
 * The setup function will be called only once, like stores, and **must be
 * synchronous**.
 *
 * @param setup - a function to setup the query
 *
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
export function defineQuery(optionsOrSetup: DefineQueryOptions | (() => unknown)): () => unknown {
  const setupFn =
    typeof optionsOrSetup === 'function' ? optionsOrSetup : () => useQuery(optionsOrSetup)

  let hasBeenEnsured: boolean | undefined
  // allows pausing the scope when the defined query is no used anymore
  let refCount = 0
  return () => {
    const queryCache = useQueryCache()
    const currentScope = getCurrentInstance() || getCurrentScope()
    const [entries, ret, scope, isPaused] = queryCache.ensureDefinedQuery(setupFn)

    // subsequent calls to the composable returned by useQuery will not trigger the `useQuery()`,
    // this ensures the refetchOnMount option is respected
    if (hasBeenEnsured) {
      entries.forEach(({ value: entry }) => {
        // since defined query can be activated multiple times without executing useQuery,
        // we need to execute it here too
        if (entry.options?.refetchOnMount && toValue(entry.options.enabled)) {
          if (toValue(entry.options.refetchOnMount) === 'always') {
            // we catch the error to avoid unhandled rejections
            queryCache.fetch(entry).catch(noop)
          } else {
            queryCache.refresh(entry).catch(noop)
          }
        }
      })
    }
    hasBeenEnsured = true

    if (currentScope) {
      refCount++
      let trackedEntries: UseQueryEntry[] = []
      // The setup runs once, but each caller needs a watcher in its own scope to follow key changes.
      watch(
        entries,
        (entries) => {
          for (const entry of trackedEntries) {
            // Another query may still use this entry. Untracking it could abort its pending request.
            if (!entries.includes(entry)) queryCache.untrack(entry, currentScope)
          }
          for (const entry of entries) queryCache.track(entry, currentScope)
          trackedEntries = entries
        },
        { immediate: true },
      )
      onScopeDispose(() => {
        // Computeds may point to a new key before this watcher runs.
        // Dispose the entries this caller actually tracked without evaluating a pending key change.
        trackedEntries.forEach((entry) => queryCache.untrack(entry, currentScope))
        if (--refCount < 1) {
          scope.pause()
          isPaused.value = true
        }
      })
    }

    return ret
  }
}
