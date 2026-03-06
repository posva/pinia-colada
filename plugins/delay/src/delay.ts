/**
 * Pinia Colada Delay Loading plugin.
 *
 * Allows delaying the `loading` value for `asyncStatus` to improve _perceived performance_.
 *
 * @module @pinia/colada-plugin-delay
 */

import type { ShallowRef } from 'vue'
import { customRef, shallowRef } from 'vue'
import type { PiniaColadaPlugin, AsyncStatus } from '@pinia/colada'
import { useMutationCache } from '@pinia/colada'

/**
 * Options for the {@link PiniaColadaDelay} plugin.
 */
export interface PiniaColadaDelayOptions {
  /**
   * Delay in milliseconds to wait before letting the `asyncStatus` become `'loading'`. Set to `false` or 0 to disable.
   * @default 200
   */
  delay?: number | false

  /**
   * Query-specific delay override. Overrides the top-level `delay` for queries only.
   */
  query?: { delay?: number | false }

  /**
   * Mutation-specific delay override. Overrides the top-level `delay` for mutations only.
   */
  mutations?: { delay?: number | false }
}

/**
 * Creates a delayed `asyncStatus` customRef that waits before switching to `'loading'`.
 */
function createDelayedAsyncStatus(
  initialValue: AsyncStatus,
  delay: number,
  isDelaying: ShallowRef<boolean>,
) {
  return customRef<AsyncStatus>((track, trigger) => {
    let value = initialValue
    let timeout: ReturnType<typeof setTimeout> | undefined
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        clearTimeout(timeout)
        if (newValue === 'loading') {
          isDelaying.value = true
          timeout = setTimeout(() => {
            isDelaying.value = false
            value = newValue
            trigger()
          }, delay)
        } else {
          isDelaying.value = false
          value = newValue
          trigger()
        }
      },
    }
  })
}

/**
 * Delays the `asyncStatus` of queries by a certain amount of time to avoid flickering between refreshes.
 *
 * @param options - Plugin options
 */
export function PiniaColadaDelayQuery(
  options?: Pick<PiniaColadaDelayOptions, 'delay'>,
): PiniaColadaPlugin {
  return ({ queryCache, scope }) => {
    queryCache.$onAction(({ name, args }) => {
      if (name === 'extend') {
        const [entry] = args
        const delay = entry.options?.delay ?? options?.delay ?? 200
        scope.run(() => {
          const isDelaying = shallowRef(false)
          entry.ext.isDelaying = isDelaying
          if (!delay) return

          const initialValue = entry.asyncStatus.value
          entry.asyncStatus = createDelayedAsyncStatus(initialValue, delay, isDelaying)
        })
      }
    })
  }
}

/**
 * Delays the `asyncStatus` of mutations by a certain amount of time to avoid flickering.
 *
 * @param options - Plugin options
 */
export function PiniaColadaDelayMutations(
  options?: Pick<PiniaColadaDelayOptions, 'delay'>,
): PiniaColadaPlugin {
  return ({ pinia, scope }) => {
    const mutationCache = useMutationCache(pinia)
    mutationCache.$onAction(({ name, args }) => {
      if (name === 'extend') {
        const [entry] = args
        const delay = entry.options?.delay ?? options?.delay ?? 200
        scope.run(() => {
          const isDelaying = shallowRef(false)
          entry.ext.isDelaying = isDelaying
          if (!delay) return

          const initialValue = entry.asyncStatus.value
          entry.asyncStatus = createDelayedAsyncStatus(initialValue, delay, isDelaying)
        })
      }
    })
  }
}

/**
 * Delays the `asyncStatus` of both queries and mutations by a certain amount of time to avoid flickering.
 * Options apply to both, with optional `query` and `mutations` nested overrides.
 *
 * @param options - Plugin options
 */
export function PiniaColadaDelay(options?: PiniaColadaDelayOptions): PiniaColadaPlugin {
  const removeQueryDelays = PiniaColadaDelayQuery({
    delay: options?.query?.delay ?? options?.delay,
  })
  const removeMutationDelays = PiniaColadaDelayMutations({
    delay: options?.mutations?.delay ?? options?.delay,
  })
  return (context) => {
    removeQueryDelays(context)
    removeMutationDelays(context)
  }
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryOptions<TData, TError, TDataInitial> extends Pick<
    PiniaColadaDelayOptions,
    'delay'
  > {}

  interface UseQueryOptionsGlobal extends Pick<PiniaColadaDelayOptions, 'delay'> {}

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryEntryExtensions<TData, TError, TDataInitial> {
    /**
     * Returns whether the query is currently delaying its `asyncStatus` from becoming `'loading'`. Requires the {@link PiniaColadaDelay} plugin.
     */
    isDelaying: ShallowRef<boolean>
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseMutationOptions<TData, TVars, TError, TContext> {
    /**
     * Delay in milliseconds to wait before letting the `asyncStatus` become `'loading'`. Set to `false` or 0 to disable. Requires the {@link PiniaColadaDelay} or {@link PiniaColadaDelayMutations} plugin.
     * @default 200
     */
    delay?: number | false
  }

  interface UseMutationOptionsGlobal {
    /**
     * Delay in milliseconds to wait before letting the `asyncStatus` become `'loading'`. Set to `false` or 0 to disable. Requires the {@link PiniaColadaDelay} or {@link PiniaColadaDelayMutations} plugin.
     * @default 200
     */
    delay?: number | false
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseMutationEntryExtensions<TData, TVars, TError, TContext> {
    /**
     * Returns whether the mutation is currently delaying its `asyncStatus` from becoming `'loading'`. Requires the {@link PiniaColadaDelay} or {@link PiniaColadaDelayMutations} plugin.
     */
    isDelaying: ShallowRef<boolean>
  }
}
