import type { AsyncStatus } from './data-state'
import type { EntryKey } from './entry-options'
import type { ErrorDefault } from './types-extension'
import type { _ReduceContext, UseMutationOptions } from './use-mutation'
import { defineStore } from 'pinia'
import { type ComponentInternalInstance, type EffectScope, getCurrentScope, markRaw, type Ref, shallowReactive, type ShallowRef, shallowRef, toValue } from 'vue'
import { useQueryCache } from './query-store'
import { type EntryNodeKey, TreeMapNode } from './tree-map'
import { stringifyFlatObject } from './utils'

/**
 * A mutation entry in the cache.
 */
export interface UseMutationEntry<TResult = unknown, TVars = unknown, TError = unknown, TContext extends Record<any, any> | void | null = void> {
    /**
     * The state of the mutation. Contains the data, error and status.
     */
    status: Ref<'pending' | 'success' | 'error'>
    // NOTE: replace with `state`?
    // /**
    //  * The state of the mutation. Contains the data, error and status.
    //  */
    // state: ShallowRef<DataState<TResult, TError>>

    /**
     * The status of the mutation.
     */
    asyncStatus: Ref<AsyncStatus>

    /**
     * The serialized key associated with this mutation entry.
     */
    key: EntryNodeKey[]

    /**
     * Components and effects scopes that use this mutation entry.
     */
    deps: Set<EffectScope | ComponentInternalInstance>

    pendingCall?: symbol
    // TODO?
    // pending: null | {
    //     abortController: AbortController
    //     refreshCall: Promise<DataState<TResult, TError>>
    //     when: number
    // }

    /**
     * Options used to create the mutation. They can be undefined during hydration but are needed for fetching. This is why
     * `store.ensure()` sets this property. Note these options might be shared by multiple mutation entries when the key is
     * dynamic.
     */
    options: UseMutationOptions<TResult, TVars, TError, TContext> | null
    // TODO: ideally shouldn't be null, there should be different kind of types

    data: ShallowRef<TResult | undefined>

    error: ShallowRef<TError | null>

    // TODO?
    // /**
    //  * Whether the mutation is currently being used by a Component or EffectScope (e.g. a store).
    //  */
    // readonly active: boolean

    // TODO?
    // /**
    //  * Component `__hmrId` to track wrong usage of `useQuery` and warn the user.
    //  * @internal
    //  */
    // __hmr?: {
    //   id?: string
    //   deps?: Set<EffectScope | ComponentInternalInstance>
    //   skip?: boolean
    // }
}

export function mutationEntry_addDep(
  entry: UseMutationEntry,
  effect: EffectScope | ComponentInternalInstance | null | undefined,
) {
  if (!effect) return
  entry.deps.add(effect)
}

export function mutationEntry_removeDep(
  entry: UseMutationEntry,
  effect: EffectScope | ComponentInternalInstance | null | undefined,
  store: ReturnType<typeof useMutationCache>,
) {
  if (!effect) return
  entry.deps.delete(effect)
  if (entry.deps.size === 0) store.remove(entry)
}

/**
 * Creates a new mutation entry.
 *
 * @internal
 * @param key - key of the entry
 */
// TODO: options?
export function createMutationEntry<TResult, TVars, TError, TContext extends Record<any, any> | void | null = void>(
    key?: EntryNodeKey[],
  ): UseMutationEntry<TResult, TVars, TError, TContext> {
    return {
      key: key ?? [],
      status: shallowRef('pending'),
      asyncStatus: shallowRef<AsyncStatus>('idle'),
      options: null,
      error: shallowRef(null),
      data: shallowRef(),
      deps: markRaw(new Set()),
    }
  }

/**
 * The id of the store used for queries.
 * @internal
 */
export const MUTATION_STORE_ID = '_pc_mutation'

/**
 * TODO: add link
 * A mutation entry that is defined with {@link defineMutation}.
 * @internal
 */
export type DefineMutationEntry = [entries: UseMutationEntry[], returnValue: unknown]

export const useMutationCache = defineStore(MUTATION_STORE_ID, ({ action }) => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new TreeMapNode<UseMutationEntry<unknown, unknown>>()
  const caches = shallowReactive(cachesRaw)
  const queryCache = useQueryCache()

  // this allows use to attach reactive effects to the scope later on
  const scope = getCurrentScope()!

  // keep track of the entry being defined so we can add the queries in ensure
  // this allows us to refresh the entry when a defined mutation is used again
  // and refetchOnMount is true
  let currentDefineMutationEntry: DefineMutationEntry | undefined | null = [[], null]
  const defineMutationMap = new WeakMap<() => unknown, DefineMutationEntry>()

  /**
   * Ensures a mutation created with {@link defineQuery} is present in the cache. If it's not, it creates a new one.
   * @param fn - function that defines the mutation
   */
  const ensureDefinedMutation = action(<T>(fn: () => T) => {
    let defineMutationEntry = defineMutationMap.get(fn)
    if (!defineMutationEntry) {
      // create the entry first
      currentDefineMutationEntry = defineMutationEntry = [[], null]
      // then run it so it can add the mutations to the entry
      defineMutationEntry[1] = scope.run(fn)
      currentDefineMutationEntry = null
      defineMutationMap.set(fn, defineMutationEntry)
    }

    return defineMutationEntry
  })

  /**
   * Ensures a mutation entry is present in the cache. If it's not, it creates a new one. The resulting entry is required
   * to call other methods like {@link fetch}, {@link refresh}, or {@link invalidate}.
   *
   * @param key - the key of the mutation
   */
  const ensure = action(
    <TResult = unknown, TVars = unknown, TError = ErrorDefault, TContext extends Record<any, any> | void | null = void>(
      options: UseMutationOptions<TResult, TVars, TError, TContext>,
    ): UseMutationEntry<TResult, TVars, TError, TContext> => {
      const key = toValue(options.key!).map(stringifyFlatObject)

      // ensure the state
      // console.log('⚙️ Ensuring entry', key)
      let entry: UseMutationEntry<TResult, TVars, TError, TContext> | undefined = cachesRaw.get(key) as UseMutationEntry<TResult, TVars, TError, TContext> | undefined

      if (!entry) {
        cachesRaw.set(
          key,
          // @ts-expect-error: `UseMutationEntry` generics
          (entry = scope.run(() =>
            createMutationEntry<TResult, TVars, TError, TContext>(key),
          )!),
        )
        entry = cachesRaw.get(key) as unknown as UseMutationEntry<TResult, TVars, TError, TContext>
      }

      // TODO: add `entry.__hmr` updates (cf. query store)

      // during HMR, the options might change, so it's better to always update them
      entry!.options = options

      // if this query was defined within a defineQuery call, add it to the list
      // @ts-expect-error: `UseMutationEntry` generics
      currentDefineMutationEntry?.[0].push(entry!)

      return entry
    },
  )

  const mutateAsync = action(
    async <TResult, TVars, TError, TContext extends Record<any, any> | void | null = void>(entry: UseMutationEntry<TResult, TVars, TError, TContext>, vars: TVars) => {
        entry.asyncStatus.value = 'loading'
        // TODO: AbortSignal that is aborted when the mutation is called again so we can throw in pending
        let currentData: TResult | undefined
        let currentError: TError | undefined
        let context!: _ReduceContext<TContext>

        // TODO: a closer implementation to the one of the mutation store
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

  const getMutationData = action(
    <TResult = unknown>(key: EntryKey): TResult | undefined => {
      const entry = caches.get(key.map(stringifyFlatObject)) as
        | UseMutationEntry<TResult>
        | undefined
      return entry?.data.value
    },
  )

  /**
   * Removes a query entry from the cache.
   */
  const remove = action((entry: UseMutationEntry) => caches.delete(entry.key))

  return {
    caches,
    ensure,
    ensureDefinedMutation,
    getMutationData,
    mutateAsync,
    remove,
    currentDefineMutationEntry,
  }
})
