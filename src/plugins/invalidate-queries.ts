/**
 * @module @pinia/colada/plugins/invalidate-queries
 */
import type { EntryKey } from '@pinia/colada'

export interface UseMutationOptionsInvalidateQueries<TResult, TVars> {
  /**
   * Keys to invalidate if the mutation succeeds so that `useQuery()` refetch if used. Only available if
   * `@pinia/colada/plugins/invalidate-queries` is installed.
   */
  invalidateKeys?:
    | EntryKey[]
    | ((data: TResult, vars: TVars) => EntryKey[])
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  export interface UseMutationOptions<TResult, TVars, TError, TContext>
    extends UseMutationOptionsInvalidateQueries<TResult, TVars> {}
}

// TODO: find a way to export a plugin that checks for invalidateKeys and calls invalidateEntry()
