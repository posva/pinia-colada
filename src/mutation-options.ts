import type { InjectionKey } from 'vue'
import { inject } from 'vue'
import type { EntryKey } from './entry-options'
import type { ErrorDefault } from './types-extension'
import type { _Awaitable } from './utils'
import type { MutationPluginOptions } from './mutation-plugin'

type _MutationKey<TVars> =
    | EntryKey
    | ((vars: TVars) => EntryKey)

// TODO: move to a plugin
/**
 * The keys to invalidate when a mutation succeeds.
 * @internal
 */
type _MutationKeys<TVars, TResult> =
    | EntryKey[]
    | ((data: TResult, vars: TVars) => EntryKey[])

/**
 * The status of the mutation.
 * - `pending`: initial state
 * - `loading`: mutation is being made
 * - `error`: when the last mutation failed
 * - `success`: when the last mutation succeeded
 */
export type MutationStatus = 'pending' | 'loading' | 'error' | 'success'

/**
 * To avoid using `{}`
 * @internal
 */
export interface _EmptyObject {}

/**
 * Removes the nullish types from the context type to make `A & TContext` work instead of yield `never`.
 * @internal
 */
export type _ReduceContext<TContext> = TContext extends void | null | undefined
    ? _EmptyObject
    : TContext

/**
 * Context object returned by a global `onMutate` function that is merged with the context returned by a local
 * `onMutate`.
 * @example
 * ```ts
 * declare module '@pinia/colada' {
 *   export interface UseMutationGlobalContext {
 *     router: Router // from vue-router
 *   }
 * }
 *
 * // add the `router` to the context
 * app.use(MutationPlugin, {
 *   onMutate() {
 *     return { router }
 *   },
 * })
 * ```
 */
export interface UseMutationGlobalContext {}

export interface UseMutationCallbacks<
    TResult = unknown,
    TVars = void,
    TError = ErrorDefault,
    TContext extends Record<any, any> | void | null = void,
> {
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
   *   onSuccess(context) {
   *     console.log(context.foo) // bar
   *   },
   * })
   * ```
   */
  onMutate?: (vars: TVars) => _Awaitable<TContext>

  /**
   * Runs if the mutation encounters an error.
   */
  onError?: (
      context: { error: TError, vars: TVars } & UseMutationGlobalContext &
          _ReduceContext<TContext>,
  ) => unknown

  /**
   * Runs if the mutation is successful.
   */
  onSuccess?: (
      context: { data: TResult, vars: TVars } & UseMutationGlobalContext &
          _ReduceContext<TContext>,
  ) => unknown

  /**
   * Runs after the mutation is settled, regardless of the result.
   */
  onSettled?: (
      context: {
        data: TResult | undefined
        error: TError | undefined
        vars: TVars
      } & UseMutationGlobalContext &
          _ReduceContext<TContext>,
  ) => unknown
}

export interface UseMutationOptions<
    TResult = unknown,
    TVars = void,
    TError = ErrorDefault,
    TContext extends Record<any, any> | void | null = void,
> extends UseMutationCallbacks<TResult, TVars, TError, TContext> {
  /**
   * The key of the mutation. If the mutation is successful, it will invalidate the query with the same key and refetch it
   */
  mutation: (vars: TVars, context: NoInfer<TContext>) => Promise<TResult>

  key?: _MutationKey<TVars>

  // TODO: move this to a plugin that calls invalidateEntry()
  /**
   * Keys to invalidate if the mutation succeeds so that `useMutation()` refetch if used.
   */
  keys?: _MutationKeys<TVars, TResult>

  // TODO: invalidate options exact, refetch, etc
}

export const USE_MUTATION_OPTIONS_KEY: InjectionKey<
    MutationPluginOptions
> = process.env.NODE_ENV !== 'production' ? Symbol('useMutationOptions') : Symbol()

/**
 * Injects the global mutation options.
 * @internal
 */
export const useMutationOptions = () => inject(USE_MUTATION_OPTIONS_KEY)!
