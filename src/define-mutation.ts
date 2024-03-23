import type { ErrorDefault } from './types-extension'
import type { UseMutationOptions, UseMutationReturn } from './use-mutation'
import type { _MaybeFunction } from './utils'

export function defineMutation<
  TResult = unknown,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> | void | null = void,
>(
  _options: _MaybeFunction<UseMutationOptions<TResult, TVars, TError, TContext>>,
): (() => UseMutationReturn<TResult, TVars, TError>) {
  // TODO: implement
  return {} as any
}

/**
 * Ideas
 * - Maybe allow returning arbitrary values from the mutation function to be exposed
 * - Allow returning them in an expose object to avoid conflicts with option names
 * - Allow renaming `data`, `error`, and `mutate`
 */
