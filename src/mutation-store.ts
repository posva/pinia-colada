import { type Ref, type ShallowRef, getCurrentScope, shallowReactive, shallowRef, toValue } from 'vue'
import type { AsyncStatus } from './data-state'
import { type EntryNodeKey, TreeMapNode } from './tree-map'
import type { UseMutationOptions, _ReduceContext } from './use-mutation'
import { defineStore } from 'pinia'
import type { ErrorDefault } from './types-extension'
import { useQueryCache } from './query-store'
import { stringifyFlatObject } from './utils'

/**
 * A query entry in the cache.
 */
export interface UseMutationEntry<TResult = unknown, TVars = unknown, TError = unknown, TContext extends Record<any, any> | void | null = void> {
    /**
     * The state of the query. Contains the data, error and status.
     */
    // NOTE: use `DataStatus`?
    status: Ref<'pending' | 'success' | 'error'>

    /**
     * The status of the query.
     */
    asyncStatus: Ref<AsyncStatus>

    /**
     * The serialized key associated with this query entry.
     */
    key: EntryNodeKey[]

    // /**
    //  * Components and effects scopes that use this query entry.
    //  */
    // deps: Set<EffectScope | ComponentInternalInstance>

    pendingCall?: symbol
    // pending: null | {
    //     abortController: AbortController
    //     refreshCall: Promise<DataState<TResult, TError>>
    //     when: number
    // }

    /**
     * Options used to create the query. They can be undefined during hydration but are needed for fetching. This is why
     * `store.ensure()` sets this property. Note these options might be shared by multiple query entries when the key is
     * dynamic.
     */

    options: UseMutationOptions<TResult, TVars, TError, TContext> | null
    // TODO: ideally shouldn't be null, there should be different kind of types

    data: ShallowRef<TResult | undefined>

    error: ShallowRef<TError | null>

    // /**
    //  * Whether the query is currently being used by a Component or EffectScope (e.g. a store).
    //  */
    // readonly active: boolean
}

export interface UseMutationOptionsWithKey<TResult, TError> extends UseMutationOptions<TResult, TError> {
    key: EntryNodeKey[]
}

/**
 * Creates a new mutation entry.
 *
 * @internal
 * @param key - key of the entry
 */
export function createMutationEntry<TResult = unknown, TError = ErrorDefault>(
    key?: EntryNodeKey[],
  ): UseMutationEntry<TResult, TError> {
    return {
      key: key!,
      status: shallowRef('pending'),
      asyncStatus: shallowRef<AsyncStatus>('idle'),
      // TODO?
      // deps: new Set(),
      options: null,
      error: shallowRef(null),
      data: shallowRef(),
      // TODO?
      // get active() {
      //   return this.deps.size > 0
      // },
    }
  }

/**
 * The id of the store used for queries.
 * @internal
 */
export const MUTATION_STORE_ID = '_pc_mutation'

/**
 * A query entry that is defined with {@link defineQuery}.
 * @internal
 */
type DefineMutationEntry = unknown

export const useMutationCache = defineStore(MUTATION_STORE_ID, ({ action }) => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new TreeMapNode<UseMutationEntry<unknown, unknown>>()
  const caches = shallowReactive(cachesRaw)
  const queryCache = useQueryCache()

  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  // keep track of the entry being defined so we can add the queries in ensure
  // this allows us to refresh the entry when a defined query is used again
  // and refetchOnMount is true
  // let currentDefineMutationEntry: DefineMutationEntry | undefined | null
  const defineQueryMap = new WeakMap<() => unknown, DefineMutationEntry>()

  /**
   * Ensures a query created with {@link defineQuery} is present in the cache. If it's not, it creates a new one.
   * @param fn - function that defines the query
   */
  const ensureDefinedMutation = action(<T>(fn: () => T) => {
    let defineMutationEntry = defineQueryMap.get(fn)
    if (!defineMutationEntry) {
      // create the entry first
      defineMutationEntry = scope.run(fn)
      defineQueryMap.set(fn, defineMutationEntry)
    }

    return defineMutationEntry
  })

  /**
   * Ensures a query entry is present in the cache. If it's not, it creates a new one. The resulting entry is required
   * to call other methods like {@link fetch}, {@link refresh}, or {@link invalidate}.
   *
   * @param key - the key of the query
   */
  const ensure = action(
    <TResult = unknown, TError = ErrorDefault>(
      options: UseMutationOptionsWithKey<TResult, TError>,
    ): UseMutationEntry<TResult, TError> => {
      const key = toValue(options.key).map(stringifyFlatObject)

      // ensure the state
      // console.log('⚙️ Ensuring entry', key)
      let entry = cachesRaw.get(key)
      if (!entry) {
        cachesRaw.set(
          key,
          (entry = scope.run(() =>
            createMutationEntry(key),
          )!),
        )
        entry = cachesRaw.get(key)
      }

      // TODO: add `entry.__hmr` updates (cf. query store)

      // during HMR, the options might change, so it's better to always update them
      // @ts-expect-error: options generics
      entry.options = options

      return entry as UseMutationEntry<TResult, TError>
    },
  )

  const mutateAsync = action(
    async <TResult, TVars, TError, TContext extends Record<any, any> | void | null = void>(entry: UseMutationEntry<TResult, TVars, TError, TContext>, vars: TVars) => {
        entry.asyncStatus.value = 'loading'

        // TODO: AbortSignal that is aborted when the mutation is called again so we can throw in pending
        let currentData: TResult | undefined
        let currentError: TError | undefined
        let context!: _ReduceContext<TContext>

        // TODO: a closer implementation to the one of the query store
        const currentCall = (entry.pendingCall = Symbol())
        try {
          // NOTE: the cast makes it easier to write without extra code. It's safe because { ...null, ...undefined } works and TContext must be a Record<any, any>
          context = (await entry.options?.onMutate?.(vars)) as _ReduceContext<TContext>

          // TODO: handle the case where `entry.options` is null
          currentData = await entry.options!.mutation(
            vars,
            context as TContext,
          )
          await entry.options?.onSuccess?.({ data: currentData, vars, ...context })

          if (entry.pendingCall === currentCall) {
            entry.data.value = currentData
            entry.error.value = null
            entry.status.value = 'success'

            // TODO: move to plugin
            if (entry.options && entry.options.keys) {
              const keys
                = typeof entry.options.keys === 'function'
                  ? entry.options.keys(currentData, vars)
                  : entry.options.keys
              for (const entry of keys.flatMap((key) =>
                queryCache.getEntries({ key, exact: true }),
              )) {
                // TODO: find a way to pass a source of the invalidation, could be a symbol associated with the mutation, the parameters
                queryCache.invalidate(entry)
                // auto refresh of the active queries
                if (entry.active) {
                  queryCache.fetch(entry)
                }
              }
            }
          }
        } catch (newError: any) {
          currentError = newError
          await entry.options?.onError?.({ error: newError, vars, ...context })
          if (entry.pendingCall === currentCall) {
            entry.error.value = newError
            entry.status.value = 'error'
          }
          throw newError
        } finally {
          entry.asyncStatus.value = 'idle'
          await entry.options?.onSettled?.({
            data: currentData,
            error: currentError,
            vars,
            ...context,
          })
        }

        return currentData
      },
  )

  return {
    caches,
    ensure,
    ensureDefinedMutation,
    mutateAsync,
  }
})
