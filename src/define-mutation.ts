import type { ErrorDefault } from './types-extension'
import {
  type UseMutationOptions,
  type UseMutationReturn,
  useMutation,
} from './use-mutation'

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
  // TODO: actual implementation
  return typeof optionsOrSetup === 'function'
    ? optionsOrSetup
    : () => useMutation(optionsOrSetup)
}
