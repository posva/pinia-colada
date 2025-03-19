import { useMutationCache } from './mutation-store'
import type { ErrorDefault } from './types-extension'
import { useMutation } from './use-mutation'
import type { UseMutationReturn } from './use-mutation'
import type { UseMutationOptions } from './mutation-options'
import type { _EmptyObject } from './utils'

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
  TContext extends Record<any, any> = _EmptyObject,
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
    = typeof optionsOrSetup === 'function' ? optionsOrSetup : () => useMutation(optionsOrSetup)
  return () => {
    // TODO: provide a way to clean them up `mutationCache.clear()`
    const mutationCache = useMutationCache()
    return mutationCache.ensureDefinedMutation(setupFn)
  }
}
