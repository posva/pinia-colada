import type { ErrorDefault } from './types-extension'
import { type EffectScope, getCurrentInstance, getCurrentScope, onScopeDispose } from 'vue'
import { mutationEntry_addDep, mutationEntry_removeDep, useMutationCache } from './mutation-store'
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationReturn,
} from './use-mutation'

/**
 * The current effect scope where the function returned by `defineMutation` is being called. This allows `useMutation()` to know if it should be attached to an effect scope or not
 */
let currentDefineMutationEffect: undefined | EffectScope

// NOTE: no setter because it cannot be set outside of defineMutation()

/**
 * Gets the current defineMutation effect scope. This is used internally by `useMutation` to attach the effect to the mutation
 * entry dependency list.
 * @internal
 */
export function getCurrentDefineMutationEffect() {
  return currentDefineMutationEffect
}

/**
 * Define a mutation with the given options. Similar to `useMutation(options)` but allows you to reuse the mutation in
 * multiple places.
 *
 * @param options - the options to define the mutation
 * @example
 * ```ts
 * const useCreateTodo = defineMutation({
 *   mutation: (todoText: string) =>
 *     fetch('/api/todos', {
 *       method: 'POST',
 *       body: JSON.stringify({ text: todoText }),
 *     }),
 * })
 * ```
 */
export function defineMutation<
  TResult,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> | void | null = void,
>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
): () => UseMutationReturn<TResult, TVars, TError>

/**
 * Define a mutation with a function setup. Allows to return arbitrary values from the mutation function, create
 * contextual refs, rename the returned values, etc.
 *
 * @param setup - a function to setup the mutation
 * @example
 * ```ts
 * const useCreateTodo = defineMutation(() => {
 *   const todoText = ref('')
 *   const { data, mutate, ...rest } = useMutation({
 *     mutation: () =>
 *       fetch('/api/todos', {
 *         method: 'POST',
 *         body: JSON.stringify({ text: todoText.value }),
 *       }),
 *   })
 *   // expose the todoText ref and rename other methods for convenience
 *   return { ...rest, createTodo: mutate, todo: data, todoText }
 * })
 * ```
 */
export function defineMutation<T>(setup: () => T): () => T
export function defineMutation(
  optionsOrSetup: UseMutationOptions | (() => unknown),
): () => unknown {
  const setupFn
    = typeof optionsOrSetup === 'function'
      ? optionsOrSetup
      : () => useMutation(optionsOrSetup)
    return () => {
      const store = useMutationCache()
      // preserve any current effect to account for nested usage of these functions
      const previousEffect = currentDefineMutationEffect
      const currentScope
        = getCurrentInstance() || (currentDefineMutationEffect = getCurrentScope())

    const [entries, ret] = store.ensureDefinedMutation(setupFn)

    // NOTE: most of the time this should be set, so maybe we should show a dev warning
    // if it's not set instead
    if (currentScope) {
      entries.forEach((entry) => {
        mutationEntry_addDep(entry, currentScope)
      })
      onScopeDispose(() => {
        entries.forEach((entry) => {
          mutationEntry_removeDep(entry, currentScope, store)
        })
      })
    }

    // reset the previous effect
    currentDefineMutationEffect = previousEffect

    return ret
  }
}
