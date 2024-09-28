import type { ComputedRef, ShallowRef } from 'vue'
import type { AsyncStatus, DataStateStatus } from './data-state'
import type { EntryKey } from './entry-options'
import type { ErrorDefault } from './types-extension'
import { computed, getCurrentInstance, getCurrentScope, onMounted, onScopeDispose, onUnmounted, shallowRef } from 'vue'
import { getCurrentDefineMutationEffect } from './define-mutation'
import { createMutationEntry, mutationEntry_addDep, mutationEntry_removeDep, useMutationCache, type UseMutationEntry } from './mutation-store'
import { useQueryCache } from './query-store'
import { type _Awaitable, type _EmptyObject, noop } from './utils'

// TODO: move to a plugin
/**
 * The keys to invalidate when a mutation succeeds.
 * @internal
 */
type _MutationKeys<TVars, TResult> =
  | EntryKey[]
  | ((data: TResult, vars: TVars) => EntryKey[])

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

export interface UseMutationOptions<
  TResult = unknown,
  TVars = void,
  TError = ErrorDefault,
  TContext extends Record<any, any> | void | null = void,
> {
  /**
   * The key of the mutation.
   */
  mutation: (vars: TVars, context: NoInfer<TContext>) => Promise<TResult>

  key?: EntryKey

  // TODO: move this to a plugin that calls invalidateEntry()
  /**
   * Keys to invalidate if the mutation succeeds so that `useQuery()` refetch if used.
   */
  keys?: _MutationKeys<TVars, TResult>

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

  // TODO: invalidate options exact, refetch, etc
}

// export const USE_MUTATIONS_DEFAULTS = {} satisfies Partial<UseMutationsOptions>

export interface UseMutationReturn<TResult, TVars, TError> {

  /**
   * The status of the mutation.
   * @see {@link DataStateStatus}
   */
  status: ShallowRef<DataStateStatus>

  /**
   * Status of the mutation. Becomes `'loading'` while the query is being fetched, is `'idle'` otherwise.
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
   * The variables passed to the mutation.
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
  TContext extends Record<any, any> | void | null = void,
>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
): UseMutationReturn<TResult, TVars, TError> {
  const queryStore = useQueryCache()
  const cacheEntries = useMutationCache()
  const variables = shallowRef<TVars>()
  const entry = options.key
    ? cacheEntries.ensure<TResult, TVars, TError, TContext>(options)
    : createMutationEntry<TResult, TVars, TError, TContext>()
  const hasCurrentInstance = getCurrentInstance()
  const currentEffect = getCurrentDefineMutationEffect() || getCurrentScope()

  if (hasCurrentInstance) {
    onMounted(() => {
      // @ts-expect-error: `UseMutationEntry` generics
      mutationEntry_addDep(entry, hasCurrentInstance)
    })
    onUnmounted(() => {
      // remove instance from Set of refs
      // @ts-expect-error: `UseMutationEntry` generics
      mutationEntry_removeDep(entry, hasCurrentInstance, cacheEntries)
    })
  } else {
    if (currentEffect) {
      // @ts-expect-error: `UseMutationEntry` generics
      mutationEntry_addDep(entry, currentEffect)
      onScopeDispose(() => {
        // @ts-expect-error: `UseMutationEntry` generics
        mutationEntry_removeDep(entry, currentEffect, cacheEntries)
      })
    }
  }

  const mutationReturn: UseMutationReturn<TResult, TVars, TError> = {
    status: computed(() => entry.status.value),
    data: computed(() => entry.data.value),
    isLoading: computed(() => entry.asyncStatus.value === 'loading'),
    error: computed(() => entry.error.value as TError | null),
    asyncStatus: computed(() => entry.asyncStatus.value),
    variables,
    // @ts-expect-error: `mutate` arguments conditional typing
    mutate,
    // @ts-expect-error: `mutate` arguments conditional typing
    mutateAsync,
    reset,
  }

  // a pending promise allows us to discard previous ongoing requests
  // let pendingPromise: Promise<TResult> | null = null

  let pendingCall: symbol | undefined
  async function mutateAsync(vars: TVars): Promise<TResult> {
    if (options.key) {
      const r = await cacheEntries.mutateAsync<TResult, TVars, TError, TContext>(entry as unknown as UseMutationEntry<TResult, TVars, TError, TContext>, vars)
      return r
    }
    entry.asyncStatus.value = 'loading'
    variables.value = vars

    // TODO: AbortSignal that is aborted when the mutation is called again so we can throw in pending
    let currentData: TResult | undefined
    let currentError: TError | undefined
    let context!: _ReduceContext<TContext>

    const currentCall = (pendingCall = Symbol())
    try {
      // NOTE: the cast makes it easier to write without extra code. It's safe because { ...null, ...undefined } works and TContext must be a Record<any, any>
      context = (await options.onMutate?.(vars)) as _ReduceContext<TContext>

      const newData = (currentData = await options.mutation(
        vars,
        context as TContext,
      ))

      await options.onSuccess?.({ data: newData, vars, ...context })

      if (pendingCall === currentCall) {
        entry.data.value = newData
        entry.error.value = null
        entry.status.value = 'success'

        // TODO: move to plugin
        if (options.keys) {
          const keys
            = typeof options.keys === 'function'
              ? options.keys(newData, vars as TVars)
              : options.keys
          for (const entry of keys.flatMap((key) =>
            queryStore.getEntries({ key, exact: true }),
          )) {
            // TODO: find a way to pass a source of the invalidation, could be a symbol associated with the mutation, the parameters
            queryStore.invalidate(entry)
            // auto refresh of the active queries
            if (entry.active) {
              queryStore.fetch(entry)
            }
          }
        }
      }
    } catch (newError: any) {
      currentError = newError
      await options.onError?.({ error: newError, vars, ...context })
      if (pendingCall === currentCall) {
        entry.error.value = newError
        entry.status.value = 'error'
      }
      throw newError
    } finally {
      entry.asyncStatus.value = 'idle'
      await options.onSettled?.({
        data: currentData,
        error: currentError,
        vars,
        ...context,
      })
    }

    return currentData
  }

  function mutate(vars: TVars) {
    mutateAsync(vars).catch(noop)
  }

  // TODO: add tests for define mutation case
  function reset() {
    entry.data.value = undefined
    entry.error.value = null
    entry.status.value = 'pending'
  }

  return mutationReturn
}
