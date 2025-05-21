import { getCurrentInstance, getCurrentScope, onScopeDispose, toValue } from 'vue'
import type { EffectScope } from 'vue'
import type { UseQueryOptions } from './query-options'
import { useQueryCache } from './query-store'
import type { ErrorDefault } from './types-extension'
import type { UseQueryReturn } from './use-query'
import { useQuery } from './use-query'
import type { _RemoveMaybeRef } from './utils'

/**
 * The current effect scope where the function returned by `defineQuery` is
 * being called. This allows `useQuery()` to know if it should be attached to
 * an effect scope or not
 *
 * @internal
 */
// eslint-disable-next-line import/no-mutable-exports
export let currentDefineQueryEffect: undefined | EffectScope

/**
 * Options to define a query with `defineQuery()`. Similar to
 * {@link UseQueryOptions} but disallows reactive values as `defineQuery()` is
 * used outside of an effect scope.
 */
export type DefineQueryOptions<
  TData = unknown,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = TData | undefined,
> = _RemoveMaybeRef<UseQueryOptions<TData, TError, TDataInitial>> & {
  // NOTE: we need to duplicate the types for initialData and placeholderData to make everything work
  // we omit the descriptions because they are inherited from the original type
  initialData?: () => TDataInitial

  placeholderData?:
    | NoInfer<TDataInitial>
    | NoInfer<TData>
    | (<T extends TData>(
        previousData: T | undefined,
      ) => NoInfer<TDataInitial> | NoInfer<TData> | undefined)
}

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
  const setupFn
    = typeof optionsOrSetup === 'function' ? optionsOrSetup : () => useQuery(optionsOrSetup)

  let hasBeenEnsured: boolean | undefined
  // allows pausing the scope when the defined query is no used anymore
  let refCount = 0
  return () => {
    const queryCache = useQueryCache()
    // preserve any current effect to account for nested usage of these functions
    const previousEffect = currentDefineQueryEffect
    const currentScope = getCurrentInstance() || (currentDefineQueryEffect = getCurrentScope())

    const [ensuredEntries, ret, scope, isPaused] = queryCache.ensureDefinedQuery(setupFn)

    // subsequent calls to the composable returned by useQuery will not trigger the `useQuery()`,
    // this ensures the refetchOnMount option is respected
    if (hasBeenEnsured) {
      ensuredEntries.forEach((entry) => {
        // since defined query can be activated multiple times without executing useQuery,
        // we need to execute it here too
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
    //
    // Because `useQuery()` might already be called before and we might be reusing an existing query
    // we need to manually track and untrack. When untracking, we cannot use the ensuredEntries because
    // there might be another component using the defineQuery, so we simply count how many are using it
    if (currentScope) {
      refCount++
      ensuredEntries.forEach((entry) => {
        queryCache.track(entry, currentScope)
      })
      onScopeDispose(() => {
        ensuredEntries.forEach((entry) => {
          queryCache.untrack(entry, currentScope)
        })
        // if all entries become inactive, we pause the scope
        // to avoid triggering the effects within useQuery. This immitates the behavior
        // of a component that unmounts
        if (--refCount < 1) {
          scope.pause()
          isPaused.value = true
        }
      })
    }

    // reset the previous effect
    currentDefineQueryEffect = previousEffect

    return ret
  }
}
