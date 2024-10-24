import type { ComputedRef, ShallowRef } from 'vue'
import type { AsyncStatus, DataState, DataStateStatus } from './data-state'
import type { EntryKey } from './entry-options'
import type { ErrorDefault } from './types-extension'
import { computed, shallowRef } from 'vue'
import { useMutationCache, type UseMutationEntry } from './mutation-store'
import { type _Awaitable, type _EmptyObject, noop } from './utils'

/**
 * Valid keys for a mutation. Similar to query keys.
 * @see {@link EntryKey}
 * @internal
 */
type _MutationKey<TVars> = EntryKey | ((vars: TVars) => EntryKey)

/**
 * Removes the nullish types from the context type to make `A & TContext` work instead of yield `never`.
 * @internal
 */
export type _ReduceContext<TContext> = TContext extends void | null | undefined
  ? _EmptyObject
  : Record<any, any> extends TContext
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

/**
 * Context object passed to the different hooks of a mutation like `onMutate`, `onSuccess`, `onError` and `onSettled`.
 */
export interface UseMutationHooksContext {}

/**
 * Options to create a mutation.
 */
export interface UseMutationOptions<
  TResult = unknown,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> = _EmptyObject,
> {
  /**
   * The key of the mutation. If the mutation is successful, it will invalidate the mutation with the same key and refetch it
   */
  mutation: (
    vars: TVars,
    context: _ReduceContext<NoInfer<TContext>>,
  ) => Promise<TResult>

  /**
   * Optional key to identify the mutation globally and access it through other helpers like `useMutationState()`.
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
   *   onSuccess(context) {
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
    context: // always defined
    UseMutationHooksContext &
      // undefined if global onMutate throws
      UseMutationGlobalContext,
  ) => _Awaitable<TContext | undefined | void | null>

  /**
   * Runs if the mutation is successful.
   */
  onSuccess?: (
    /**
     * The result of the mutation.
     */
    data: NoInfer<TResult>,
    /**
     * The variables passed to the mutation.
     */
    vars: NoInfer<TVars>,
    /**
     * The merged context from `onMutate` and the global context.
     */
    context: UseMutationGlobalContext &
      UseMutationHooksContext &
      _ReduceContext<NoInfer<TContext>>,
  ) => unknown

  /**
   * Runs if the mutation encounters an error.
   */
  onError?: (
    /**
     * The error thrown by the mutation.
     */
    error: NoInfer<TError>,
    /**
     * The variables passed to the mutation.
     */
    vars: NoInfer<TVars>,
    /**
     * The merged context from `onMutate` and the global context. Properties returned by `onMutate` can be `undefined`
     * if `onMutate` throws.
     */
    context:
      | (UseMutationHooksContext &
          // undefined if global onMutate throws, makes type narrowing easier for the user
          Partial<Record<keyof UseMutationGlobalContext, never>> &
          Partial<Record<keyof _ReduceContext<NoInfer<TContext>>, never>>)
      // this is the success case where everything is defined
      | (UseMutationHooksContext &
          // undefined if global onMutate throws
          UseMutationGlobalContext &
          _ReduceContext<NoInfer<TContext>>),
  ) => unknown

  /**
   * Runs after the mutation is settled, regardless of the result.
   */
  onSettled?: (
    /**
     * The result of the mutation. `undefined` if the mutation failed.
     */
    data: NoInfer<TResult> | undefined,
    /**
     * The error thrown by the mutation. `undefined` if the mutation was successful.
     */
    error: NoInfer<TError> | undefined,
    /**
     * The variables passed to the mutation.
     */
    vars: NoInfer<TVars>,
    /**
     * The merged context from `onMutate` and the global context. Properties returned by `onMutate` can be `undefined`
     * if `onMutate` throws.
     */
    context:
      | (UseMutationHooksContext &
          // undefined if global onMutate throws, makes type narrowing easier for the user
          Partial<Record<keyof UseMutationGlobalContext, never>> &
          Partial<Record<keyof _ReduceContext<NoInfer<TContext>>, never>>)
      // this is the success case where everything is defined
      | (UseMutationHooksContext &
          // undefined if global onMutate throws
          UseMutationGlobalContext &
          _ReduceContext<NoInfer<TContext>>),
  ) => unknown
}

// export const USE_MUTATIONS_DEFAULTS = {} satisfies Partial<UseMutationsOptions>

export interface UseMutationReturn<TResult, TVars, TError> {
  key?: EntryKey | ((vars: NoInfer<TVars>) => EntryKey)

  /**
   * The combined state of the mutation. Contains its data, error, and status. It enables type narrowing based on the {@link UseMutationReturn.status}.
   */
  state: ComputedRef<DataState<TResult, TError>>

  /**
   * The status of the mutation.
   * @see {@link DataStateStatus}
   */
  status: ShallowRef<DataStateStatus>

  /**
   * Status of the mutation. Becomes `'loading'` while the mutation is being fetched, is `'idle'` otherwise.
   */
  asyncStatus: ShallowRef<AsyncStatus>

  /**
   * The result of the mutation. `undefined` if the mutation has not been called yet.
   */
  data: ShallowRef<TResult | undefined>

  /**
   * The error of the mutation. `null` if the mutation has not been called yet or if it was successful.
   */
  error: ShallowRef<TError | null>

  /**
   * Whether the mutation is currently executing.
   */
  isLoading: ComputedRef<boolean>

  /**
   * The variables passed to the mutation. They are initially `undefined` and change every time the mutation is called.
   */
  variables: ShallowRef<TVars | undefined>

  /**
   * Calls the mutation and returns a promise with the result.
   *
   * @param vars - parameters to pass to the mutation
   */
  mutateAsync: unknown | void extends TVars
    ? () => Promise<TResult>
    : (vars: TVars) => Promise<TResult>

  /**
   * Calls the mutation without returning a promise to avoid unhandled promise rejections.
   *
   * @param args - parameters to pass to the mutation
   */
  mutate: (...args: unknown | void extends TVars ? [] : [vars: TVars]) => void

  /**
   * Resets the state of the mutation to its initial state.
   */
  reset: () => void
}

/**
 * Setups a mutation.
 *
 * @param options - Options to create the mutation
 * @example
 * ```ts
 * const { mutate, status, error } = useMutation({
 *   mutation: (id: number) => fetch(`/api/todos/${id}`),
 *   onSuccess({ queryClient }) {
 *     queryClient.invalidateQueries('todos')
 *   },
 * })
 * ```
 */
export function useMutation<
  TResult,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> = _EmptyObject,
>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
): UseMutationReturn<TResult, TVars, TError> {
  const mutationCache = useMutationCache()
  // always create an initial entry with no key (cannot be computed without vars)
  const entry = shallowRef<UseMutationEntry<TResult, TVars, TError, TContext>>(
    mutationCache.ensure(options),
  )

  const state = computed(() => entry.value.state.value)
  const status = computed(() => state.value.status)
  const data = computed(() => state.value.data)
  const error = computed(() => state.value.error)
  const asyncStatus = computed(() => entry.value.asyncStatus.value)
  const variables = computed(() => entry.value.vars.value)

  async function mutateAsync(vars: TVars): Promise<TResult> {
    // either create a new entry, transform the initial one with the correct keys, or reuse the same if keys are undefined
    return mutationCache.mutate(
      (entry.value = mutationCache.ensure(options, entry.value, vars)),
      vars,
    )
  }

  function mutate(vars: NoInfer<TVars>) {
    mutateAsync(vars).catch(noop)
  }

  function reset() {
    entry.value.state.value = {
      status: 'pending',
      data: undefined,
      error: null,
    }
    entry.value.asyncStatus.value = 'idle'
  }

  return {
    state,
    data,
    isLoading: computed(() => asyncStatus.value === 'loading'),
    status,
    variables,
    asyncStatus,
    error,
    // @ts-expect-error: because of the conditional type in UseMutationReturn
    // it would be nice to find a type-only refactor that works
    mutate,
    // @ts-expect-error: same as above
    mutateAsync,
    reset,
  }
}
