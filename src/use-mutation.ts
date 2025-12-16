import type { ComputedRef, ShallowRef } from 'vue'
import type { AsyncStatus, DataState, DataStateStatus } from './data-state'
import type { EntryKey } from './entry-keys'
import type { ErrorDefault } from './types-extension'
import {
  computed,
  shallowRef,
  getCurrentInstance,
  getCurrentScope,
  onUnmounted,
  onScopeDispose,
} from 'vue'
import { useMutationCache } from './mutation-store'
import type { UseMutationEntry } from './mutation-store'
import { noop } from './utils'
import type { _EmptyObject } from './utils'
import {
  USE_MUTATION_DEFAULTS,
  useMutationOptions,
  type UseMutationOptions,
} from './mutation-options'

/**
 * Valid keys for a mutation. Similar to query keys.
 *
 * @see {@link EntryKey}
 *
 * @internal
 */
export type _MutationKey<TVars> = EntryKey | ((vars: TVars) => EntryKey)

/**
 * Removes the nullish types from the context type to make `A & TContext` work instead of yield `never`.
 *
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

export interface UseMutationReturn<TData, TVars, TError> {
  key?: EntryKey | ((vars: NoInfer<TVars>) => EntryKey)

  /**
   * The combined state of the mutation. Contains its data, error, and status.
   * It enables type narrowing based on the {@link UseMutationReturn['status']}.
   */
  state: ComputedRef<DataState<TData, TError>>

  /**
   * The status of the mutation.
   *
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
  data: ShallowRef<TData | undefined>

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
  mutateAsync: unknown | void extends TVars ? () => Promise<TData> : (vars: TVars) => Promise<TData>

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
 *
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
  TData,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> = _EmptyObject,
>(
  options: UseMutationOptions<TData, TVars, TError, TContext>,
): UseMutationReturn<TData, TVars, TError> {
  const mutationCache = useMutationCache()
  const hasCurrentInstance = getCurrentInstance()
  const currentEffect = getCurrentScope()
  const optionDefaults = useMutationOptions()

  const mergedOptions = {
    // NOTE: overriding the hooks, makes the types too complex to infer properly
    ...(optionDefaults as typeof USE_MUTATION_DEFAULTS),
    ...options,
  }

  // always create an initial entry with no key (cannot be computed without vars)
  const entry = shallowRef<UseMutationEntry<TData, TVars, TError, TContext>>(
    mutationCache.create(mergedOptions),
  )

  // Untrack the mutation entry when component or effect scope is disposed
  if (hasCurrentInstance) {
    onUnmounted(() => {
      mutationCache.untrack(entry.value)
    })
  }
  if (currentEffect) {
    onScopeDispose(() => {
      mutationCache.untrack(entry.value)
    })
  }

  const state = computed(() => entry.value.state.value)
  const status = computed(() => state.value.status)
  const data = computed(() => state.value.data)
  const error = computed(() => state.value.error)
  const asyncStatus = computed(() => entry.value.asyncStatus.value)
  const variables = computed(() => entry.value.vars)

  async function mutateAsync(vars: TVars): Promise<TData> {
    return mutationCache.mutate(
      // ensures we reuse the initial empty entry and adapt it or create a new one
      (entry.value = mutationCache.ensure(entry.value, vars)),
    )
  }

  function mutate(vars: NoInfer<TVars>) {
    mutateAsync(vars).catch(noop)
  }

  function reset() {
    entry.value = mutationCache.create(mergedOptions)
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
