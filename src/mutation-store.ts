import type { ComponentInternalInstance, EffectScope, ShallowRef } from 'vue'
import type { AsyncStatus, DataState } from './data-state'
import type { EntryNodeKey } from './tree-map'
import { defineStore } from 'pinia'
import { shallowReactive, shallowRef } from 'vue'
import { TreeMapNode } from './tree-map'
import type { _EmptyObject } from './utils'
import { isSameArray, stringifyFlatObject, toValueWithArgs } from './utils'
import type { UseMutationOptions } from './use-mutation'

/**
 * A mutation entry in the cache.
 */
export interface UseMutationEntry<
  TResult = unknown,
  TVars = unknown,
  TError = unknown,
  TContext extends Record<any, any> = _EmptyObject,
> {
  /**
   * The state of the mutation. Contains the data, error and status.
   */
  state: ShallowRef<DataState<TResult, TError>>

  /**
   * The async status of the mutation.
   */
  asyncStatus: ShallowRef<AsyncStatus>

  /**
   * When was this data fetched the last time in ms
   */
  when: number

  /**
   * The serialized key associated with this mutation entry.
   */
  key: EntryNodeKey[] | undefined

  /**
   * The variables used to call the mutation.
   */
  vars: ShallowRef<TVars | undefined>

  options: UseMutationOptions<TResult, TVars, TError, TContext>

  pending: null | {
    abortController: AbortController
    refreshCall: Promise<DataState<TResult, TError>>
    when: number
  }

  /**
   * Component `__hmrId` to track wrong usage of `useQuery` and warn the user.
   * @internal
   */
  __hmr?: {
    id?: string
    deps?: Set<EffectScope | ComponentInternalInstance>
    skip?: boolean
  }
}

function createMutationEntry<
  TResult = unknown,
  TVars = unknown,
  TError = unknown,
  TContext extends Record<any, any> = _EmptyObject,
>(
  options: UseMutationOptions<TResult, TVars, TError, TContext>,
  key: EntryNodeKey[] | undefined,
  vars?: TVars,
): UseMutationEntry<TResult, TVars, TError, TContext> {
  return {
    state: shallowRef<DataState<TResult, TError>>({
      status: 'pending',
      data: undefined,
      error: null,
    }),
    asyncStatus: shallowRef<AsyncStatus>('idle'),
    when: 0,
    vars: shallowRef(vars),
    key,
    options,
    pending: null,
  }
}

export const useMutationCache = /* @__PURE__ */ defineStore('_pc_mutation', () => {
  // We have two versions of the cache, one that track changes and another that doesn't so the actions can be used
  // inside computed properties
  const cachesRaw = new TreeMapNode<UseMutationEntry<unknown, unknown>>()
  const caches = shallowReactive(cachesRaw)

  function ensure<
    TResult = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(
    options: UseMutationOptions<TResult, TVars, TError, TContext>,
  ): UseMutationEntry<TResult, TVars, TError, TContext>
  function ensure<
    TResult = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(
    options: UseMutationOptions<TResult, TVars, TError, TContext>,
    entry: UseMutationEntry<TResult, TVars, TError, TContext>,
    vars: NoInfer<TVars>,
  ): UseMutationEntry<TResult, TVars, TError, TContext>

  function ensure<
    TResult = unknown,
    TVars = unknown,
    TError = unknown,
    TContext extends Record<any, any> = _EmptyObject,
  >(
    options: UseMutationOptions<TResult, TVars, TError, TContext>,
    entry?: UseMutationEntry<TResult, TVars, TError, TContext>,
    vars?: NoInfer<TVars>,
  ): UseMutationEntry<TResult, TVars, TError, TContext> {
    const key
      = vars && toValueWithArgs(options.key, vars)?.map(stringifyFlatObject)

    if (!entry) {
      return createMutationEntry(options, key)
    }
    // reuse the entry when no key is provided
    if (key) {
      // update key
      if (!entry.key) {
        entry.key = key
      } else if (!isSameArray(entry.key, key)) {
        return createMutationEntry(
          options,
          key,
          // the type NonNullable<TVars> is not assignable to TVars
          vars as TVars,
        )
      }
    }

    return entry
  }

  return { ensure, caches }
})
