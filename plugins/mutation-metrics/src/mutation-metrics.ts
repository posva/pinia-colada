/**
 * Pinia Colada Mutation Metrics plugin.
 *
 * Adds two small metrics to every mutation:
 * - `mutatedAt`: timestamp (ms) of the last successful mutation
 * - `errorCount`: number of times the mutation ended in an error
 *
 * @module @pinia/colada-plugin-mutation-metrics
 */

import type { ShallowRef } from 'vue'
import { shallowRef } from 'vue'
import type { PiniaColadaPlugin } from '@pinia/colada'

/**
 * Adds `mutatedAt` and `errorCount` to mutation entries.
 */
export function PiniaColadaMutationMetrics(): PiniaColadaPlugin {
  return ({ mutationCache, scope }) => {
    mutationCache.$onAction(({ name, args, after }) => {
      if (name === 'extend') {
        const [entry] = args
        scope.run(() => {
          entry.ext.mutatedAt = shallowRef(0)
          entry.ext.errorCount = shallowRef(0)
        })
      } else if (name === 'setEntryState') {
        const [entry, state] = args
        after(() => {
          if (state.status === 'success') {
            entry.ext.mutatedAt.value = entry.when
          } else if (state.status === 'error') {
            entry.ext.errorCount.value++
          }
        })
      }
    })
  }
}

declare module '@pinia/colada' {
  interface UseMutationEntryExtensions<TData, TVars, TError, TContext> {
    /**
     * Timestamp of the last successful mutation.
     */
    mutatedAt: ShallowRef<number>

    /**
     * Number of times this mutation ended with an error.
     */
    errorCount: ShallowRef<number>
  }
}
