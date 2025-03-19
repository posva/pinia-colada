import type { ComputedRef, ShallowRef } from 'vue'
import type { AsyncStatus, DataState, DataStateStatus } from './data-state'
import type { EntryKey } from './entry-options'
import type { ErrorDefault } from './types-extension'
import { computed, shallowRef } from 'vue'
import { useMutationCache } from './mutation-store'
import type { UseMutationEntry } from './mutation-store'
import { noop } from './utils'
import type { _EmptyObject } from './utils'
import type { UseMutationOptions } from './mutation-options'

/**
 * Valid keys for a mutation. Similar to query keys.
 * @see {@link EntryKey}
 * @internal
 */
export type _MutationKey<TVars> = EntryKey | ((vars: TVars) => EntryKey)

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
 * const queryCache = useQueryCache()
 * const { mutate, status, error } = useMutation({
 *   mutation: (id: number) => fetch(`/api/todos/${id}`),
 *   onSuccess() {
 *     queryCache.invalidateQueries('todos')
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
    mutationCache.setEntryState(entry.value, {
      status: 'pending',
      data: undefined,
      error: null,
    })
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
