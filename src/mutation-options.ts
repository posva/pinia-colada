import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { ErrorDefault } from './types-extension'
import type { _ReduceContext, _MutationKey, UseMutationGlobalContext } from './use-mutation'
import type { _EmptyObject, _Awaitable } from './utils'

/**
 * Options for mutations that can be globally overridden.
 */
export interface UseMutationOptionsGlobal {
  /**
   * Runs before a mutation is executed. It can return a value that will be
   * passed to `mutation`, `onSuccess`, `onError` and `onSettled`. If it
   * returns a promise, it will be awaited before running `mutation`.
   */
  onMutate?: (
    /**
     * The variables passed to the mutation.
     */
    vars: unknown,
  ) => _Awaitable<UseMutationGlobalContext | undefined | void | null>

  /**
   * Runs when a mutation is successful.
   */
  onSuccess?: (
    /**
     * The result of the mutation.
     */
    data: unknown,
    /**
     * The variables passed to the mutation.
     */
    vars: unknown,
    /**
     * The merged context from `onMutate` and the global context.
     */
    context: UseMutationGlobalContext,
  ) => unknown

  /**
   * Runs when a mutation encounters an error.
   */
  onError?: (
    /**
     * The error thrown by the mutation.
     */
    error: unknown,
    /**
     * The variables passed to the mutation.
     */
    vars: unknown,
    /**
     * The merged context from `onMutate` and the global context. Properties returned by `onMutate` can be `undefined`
     * if `onMutate` throws.
     */
    context:
      | Partial<Record<keyof UseMutationGlobalContext, never>>
      // this is the success case where everything is defined
      // undefined if global onMutate throws
      | UseMutationGlobalContext,
  ) => unknown

  /**
   * Runs after the mutation is settled, regardless of the result.
   */
  onSettled?: (
    /**
     * The result of the mutation. `undefined` when a mutation failed.
     */
    data: unknown | undefined,
    /**
     * The error thrown by the mutation. `undefined` if the mutation was successful.
     */
    error: unknown | undefined,
    /**
     * The variables passed to the mutation.
     */
    vars: unknown,
    /**
     * The merged context from `onMutate` and the global context. Properties returned by `onMutate` can be `undefined`
     * if `onMutate` throws.
     */
    context:
      | Partial<Record<keyof UseMutationGlobalContext, never>>
      // this is the success case where everything is defined
      // undefined if global onMutate throws
      | UseMutationGlobalContext,
  ) => unknown

  /**
   * Time in ms after which, once the mutation is no longer being used, it will be
   * garbage collected to free resources. Set to `false` to disable garbage
   * collection (not recommended).
   *
   * @default 60_000 (1 minute)
   */
  gcTime?: number | false
}

/**
 * Default options for `useMutation()`. Modifying this object will affect all mutations.
 */
export const USE_MUTATION_DEFAULTS = {
  gcTime: (1000 * 60) as NonNullable<UseMutationOptions['gcTime']>, // 1 minute
} satisfies UseMutationOptionsGlobal

/**
 * Options to create a mutation.
 */
export interface UseMutationOptions<
  TData = unknown,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> = _EmptyObject,
> extends Pick<UseMutationOptionsGlobal, 'gcTime'> {
  /**
   * The key of the mutation. If the mutation is successful, it will invalidate the mutation with the same key and refetch it
   */
  mutation: (vars: TVars, context: _ReduceContext<NoInfer<TContext>>) => Promise<TData>

  /**
   * Optional key to identify the mutation globally and access it through other
   * helpers like `useMutationState()`. If you don't need to reference the
   * mutation elsewhere, you should ignore this option.
   */
  key?: _MutationKey<NoInfer<TVars>>

  /**
   * Runs before the mutation is executed. **It should be placed before `mutation()` for `context` to be inferred**. It
   * can return a value that will be passed to `mutation`, `onSuccess`, `onError` and `onSettled`. If it returns a
   * promise, it will be awaited before running `mutation`.
   *
   * @example
   * ```ts
   * useMutation({
   * // must appear before `mutation` for `{ foo: string }` to be inferred
   * // within `mutation`
   *   onMutate() {
   *     return { foo: 'bar' }
   *   },
   *   mutation: (id: number, { foo }) => {
   *     console.log(foo) // bar
   *     return fetch(`/api/todos/${id}`)
   *   },
   *   onSuccess(data, vars, context) {
   *     console.log(context.foo) // bar
   *   },
   * })
   * ```
   */
  onMutate?: (
    /**
     * The variables passed to the mutation.
     */
    vars: NoInfer<TVars>,
    context: UseMutationGlobalContext,
  ) => _Awaitable<TContext | undefined | void | null>

  /**
   * Runs if the mutation is successful.
   */
  onSuccess?: (
    /**
     * The result of the mutation.
     */
    data: NoInfer<TData>,
    /**
     * The variables passed to the mutation.
     */
    vars: NoInfer<TVars>,
    /**
     * The merged context from `onMutate` and the global context.
     */
    context: UseMutationGlobalContext & _ReduceContext<NoInfer<TContext>>,
  ) => unknown

  /**
   * Runs if the mutation encounters an error.
   */
  onError?: (
    /**
     * The error thrown by the mutation.
     */
    error: TError,
    /**
     * The variables passed to the mutation.
     */
    vars: NoInfer<TVars>,
    /**
     * The merged context from `onMutate` and the global context. Properties returned by `onMutate` can be `undefined`
     * if `onMutate` throws.
     */
    context:
      | (Partial<Record<keyof UseMutationGlobalContext, never>> &
          Partial<Record<keyof _ReduceContext<NoInfer<TContext>>, never>>)
      // this is the success case where everything is defined
      // undefined if global onMutate throws
      | (UseMutationGlobalContext & _ReduceContext<NoInfer<TContext>>),
  ) => unknown

  /**
   * Runs after the mutation is settled, regardless of the result.
   */
  onSettled?: (
    /**
     * The result of the mutation. `undefined` if the mutation failed.
     */
    data: NoInfer<TData> | undefined,
    /**
     * The error thrown by the mutation. `undefined` if the mutation was successful.
     */
    error: TError | undefined,
    /**
     * The variables passed to the mutation.
     */
    vars: NoInfer<TVars>,
    /**
     * The merged context from `onMutate` and the global context. Properties returned by `onMutate` can be `undefined`
     * if `onMutate` throws.
     */
    context:
      | (Partial<Record<keyof UseMutationGlobalContext, never>> &
          Partial<Record<keyof _ReduceContext<NoInfer<TContext>>, never>>)
      // this is the success case where everything is defined
      // undefined if global onMutate throws
      | (UseMutationGlobalContext & _ReduceContext<NoInfer<TContext>>),
  ) => unknown
}

/**
 * Global default options for `useMutations()`.
 * @internal
 */
export type UseMutationOptionsGlobalDefaults = UseMutationOptionsGlobal &
  typeof USE_MUTATION_DEFAULTS

export const USE_MUTATION_OPTIONS_KEY: InjectionKey<UseMutationOptionsGlobalDefaults> =
  process.env.NODE_ENV !== 'production' ? Symbol('useMutationOptions') : Symbol()

/**
 * Injects the global query options.
 * @internal
 */
export const useMutationOptions = (): UseMutationOptionsGlobal =>
  inject(USE_MUTATION_OPTIONS_KEY, USE_MUTATION_DEFAULTS)
