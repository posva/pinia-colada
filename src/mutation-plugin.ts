import type { App } from 'vue'
import type { ErrorDefault } from './types-extension'
import type { _Simplify } from './utils'
import type { UseMutationCallbacks, UseMutationOptions } from './mutation-options'
import { USE_MUTATION_OPTIONS_KEY } from './mutation-options'
import type { UseMutationReturn } from './use-mutation'

export interface MutationPluginOptions extends UseMutationCallbacks<unknown, unknown, unknown> {
  /**
   * Executes setup code inside `useMutation()` to add custom behavior to all mutations. **Must be synchronous**.
   *
   * @param context - properties of the `useMutation` return value and the options
   */
  setup?: <TResult = unknown, TVars = void, TError = ErrorDefault, TContext extends Record<any, any> | void | null = void>(
      context: _Simplify<
          UseMutationReturn<TResult, TVars, TError> & {
        options: UseMutationOptions<TResult, TVars, TError, TContext>
      }
      >,
  ) => void | Promise<never>
}

export function MutationPlugin(
    app: App,
    useMutationOptions: MutationPluginOptions = {},
) {
  app.provide(USE_MUTATION_OPTIONS_KEY, {
    ...useMutationOptions,
  })
}
