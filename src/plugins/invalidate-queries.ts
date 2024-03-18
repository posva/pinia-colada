import type { UseQueryKey } from '@pinia/colada'

export interface UseMutationOptionsInvalidateQueries<TResult, TVars> {
  /**
   * Keys to invalidate if the mutation succeeds so that `useQuery()` refetch if used.
   */
  invalidateKeys?:
    | UseQueryKey[]
    | ((data: TResult, vars: TVars) => UseQueryKey[])
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  export interface UseMutationOptions<TResult, TVars, TError, TContext>
    extends UseMutationOptionsInvalidateQueries<TResult, TVars> { }
}

// TODO: find a way to export a plugin that checks for invalidateKeys and calls invalidateEntry()
