import { getCurrentInstance, getCurrentScope, onScopeDispose, toValue } from 'vue'
import type { EffectScope } from 'vue'
import type { UseQueryOptions } from './query-options'
import { useQueryCache } from './query-store'
import type { ErrorDefault } from './types-extension'
import type { UseQueryReturn } from './use-query'
import { useQuery } from './use-query'
import type { _RemoveMaybeRef } from './utils'

/**
 * The current effect scope where the function returned by `defineQuery` is being called. This allows `useQuery()` to know if it should be attached to an effect scope or not
 */
let currentDefineQueryEffect: undefined | EffectScope

/**
 * Options to define a query with `defineQuery()`. Similar to {@link UseQueryOptions} but disallows reactive values as
 * `defineQuery()` is used outside of an effect scope.
 */
export interface DefineQueryOptions<TResult = unknown, TError = ErrorDefault>
  extends _RemoveMaybeRef<UseQueryOptions<TResult, TError>> {}

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
 * places. It only allow static values in options. If you need dynamic values, use the function version.
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
  options: DefineQueryOptions<TResult, TError>,
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
export function defineQuery(optionsOrSetup: DefineQueryOptions | (() => unknown)): () => unknown {
  const setupFn
    = typeof optionsOrSetup === 'function' ? optionsOrSetup : () => useQuery(optionsOrSetup)

  let hasBeenEnsured: boolean | undefined
  return () => {
    const queryCache = useQueryCache()
    // preserve any current effect to account for nested usage of these functions
    const previousEffect = currentDefineQueryEffect
    const currentScope = getCurrentInstance() || (currentDefineQueryEffect = getCurrentScope())

    const [entries, ret, scope] = queryCache.ensureDefinedQuery(setupFn)

    // subsequent calls to the composable returned by useQuery will not trigger the `useQuery()`,
    // this ensures the refetchOnMount option is respected
    if (hasBeenEnsured) {
      entries.forEach((entry) => {
        // TODO: should happen in useQuery and defineQuery
        if (entry.options?.refetchOnMount && toValue(entry.options.enabled)) {
          if (toValue(entry.options.refetchOnMount) === 'always') {
            queryCache.fetch(entry)
          } else {
            queryCache.refresh(entry)
          }
        }
      })
    }
    hasBeenEnsured = true

    // NOTE: most of the time this should be set, so maybe we should show a dev warning
    // if it's not set instead
    if (currentScope) {
      entries.forEach((entry) => {
        queryCache.track(entry, currentScope)
        if (process.env.NODE_ENV !== 'production') {
          entry.__hmr ??= {}
          entry.__hmr.skip = true
        }
      })
      onScopeDispose(() => {
        // if all entries become inactive, we pause the scope
        // to avoid triggering the effects within useQuery. This immitates the behavior
        // of a component that unmounts
        if (
          entries.every((entry) => {
            queryCache.untrack(entry, currentScope)
            return !entry.active
          })
        ) {
          scope.pause()
        }
      })
    }

    // reset the previous effect
    currentDefineQueryEffect = previousEffect

    return ret
  }
}
