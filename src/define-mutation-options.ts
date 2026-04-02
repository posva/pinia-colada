import type { UseMutationOptions } from './mutation-options'
import type { EntryKeyTagged } from './entry-keys'
import type { _MutationKey } from './use-mutation'
import type { ErrorDefault } from './types-extension'
import type { _EmptyObject } from './utils'

/**
 * Tagged version of {@link UseMutationOptions} that includes a key with
 * data type information. Returned by {@link defineMutationOptions}.
 */
export interface DefineMutationOptionsTagged<
  TData = unknown,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> = _EmptyObject,
> extends UseMutationOptions<TData, TVars, TError, TContext> {
  key: _MutationKeyTagged<TData, TVars, TError>
}

/**
 * Same as {@link _MutationKey} but with a data tag that allows inference of the data type.
 * @internal
 */
export type _MutationKeyTagged<TData, TVars, TError = ErrorDefault> =
  | EntryKeyTagged<TData, TError>
  | ((vars: TVars) => EntryKeyTagged<TData, TError>)

/**
 * Define dynamic mutation options by passing a function that accepts an
 * optional arbitrary parameter and returns the mutation options. Pass to
 * {@link useMutation} directly: `useMutation(setupOptions(params))`.
 *
 * @param setupOptions - A function that returns the mutation options.
 */
export function defineMutationOptions<
  Params,
  TData,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> = _EmptyObject,
>(
  setupOptions: (params?: Params) => UseMutationOptions<TData, TVars, TError, TContext>,
): (params?: Params) => DefineMutationOptionsTagged<TData, TVars, TError, TContext>

/**
 * Define dynamic mutation options by passing a function that accepts an
 * arbitrary parameter and returns the mutation options. Pass to
 * {@link useMutation} directly: `useMutation(setupOptions(params))`.
 *
 * @param setupOptions - A function that returns the mutation options.
 */
export function defineMutationOptions<
  Params,
  TData,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> = _EmptyObject,
>(
  setupOptions: (params: Params) => UseMutationOptions<TData, TVars, TError, TContext>,
): (params: Params) => DefineMutationOptionsTagged<TData, TVars, TError, TContext>

/**
 * Define static mutation options that can be passed directly to
 * {@link useMutation}.
 *
 * @param options - The mutation options.
 */
export function defineMutationOptions<
  TData,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> = _EmptyObject,
>(
  options: UseMutationOptions<TData, TVars, TError, TContext>,
): DefineMutationOptionsTagged<TData, TVars, TError, TContext>

/**
 * Define type-safe mutation options. Can be static or dynamic. Define the
 * arguments based on what's needed. Use an object if you need multiple
 * properties.
 *
 * @param setupOrOptions - The mutation options or a function that returns the mutation options.
 *
 * @example
 * ```ts
 * import { defineMutationOptions } from '@pinia/colada'
 *
 * const deleteItemMutation = defineMutationOptions({
 *   mutation: (id: number) => fetch(`/api/items/${id}`, { method: 'DELETE' }),
 * })
 *
 * // use in a component
 * const { mutate } = useMutation(deleteItemMutation)
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
export function defineMutationOptions<const Options extends UseMutationOptions, Params>(
  setupOrOptions: Options | ((params: Params) => Options),
): Options | ((params: Params) => Options) {
  return setupOrOptions
}
