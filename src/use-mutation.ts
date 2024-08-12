import { computed, shallowRef } from 'vue'
import type { ComputedRef, ShallowRef } from 'vue'
import { useQueryCache } from './query-store'
import type { EntryKey } from './entry-options'
import type { ErrorDefault } from './types-extension'
import { type _Awaitable, type _EmptyObject, noop } from './utils'

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
   * The key of the mutation. If the mutation is successful, it will invalidate the query with the same key and refetch it
   */
  mutation: (vars: TVars, context: NoInfer<TContext>) => Promise<TResult>

  key?: _MutationKey<TVars>

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
   * The status of the mutation.
   * @see {@link MutationStatus}
   */
  status: ShallowRef<MutationStatus>

  /**
   * Calls the mutation and returns a promise with the result.
   *
   * @param args - parameters to pass to the mutation
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

// TODO: it might be worth having multiple UseMutationReturnState:
// type UseMutationReturn<TResult, TVars, TError> = UseMutationReturnSuccess | UseMutationReturnError | UseMutationReturnLoading

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
  const store = useQueryCache()

  // TODO: there could be a mutation store that stores the state based on an optional key (if passed). This would allow to retrieve the state of a mutation with useMutationState(key)
  const status = shallowRef<MutationStatus>('pending')
  const data = shallowRef<TResult>()
  const error = shallowRef<TError | null>(null)

  // a pending promise allows us to discard previous ongoing requests
  // let pendingPromise: Promise<TResult> | null = null

  let pendingCall: symbol | undefined
  async function mutateAsync(vars: TVars): Promise<TResult> {
    status.value = 'loading'

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
        data.value = newData
        error.value = null
        status.value = 'success'

        // TODO: move to plugin
        if (options.keys) {
          const keys
            = typeof options.keys === 'function'
              ? options.keys(newData, vars)
              : options.keys
          for (const entry of keys.flatMap((key) =>
            store.getEntries({ key, exact: true }),
          )) {
            // TODO: find a way to pass a source of the invalidation, could be a symbol associated with the mutation, the parameters
            store.invalidate(entry)
            // auto refresh of the active queries
            if (entry.active) {
              store.fetch(entry)
            }
          }
        }
      }
    } catch (newError: any) {
      currentError = newError
      await options.onError?.({ error: newError, vars, ...context })
      if (pendingCall === currentCall) {
        error.value = newError
        status.value = 'error'
      }
      throw newError
    } finally {
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

  function reset() {
    data.value = undefined
    error.value = null
    status.value = 'pending'
  }

  return {
    data,
    isLoading: computed(() => status.value === 'loading'),
    status,
    error,
    // @ts-expect-error: it would be nice to find a type-only refactor that works
    mutate,
    // @ts-expect-error: it would be nice to find a type-only refactor that works
    mutateAsync,
    reset,
  }
}
