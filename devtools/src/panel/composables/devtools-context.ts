import type { UseMutationEntryPayload, UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { inject } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export const QUERIES_KEY: InjectionKey<Readonly<Ref<UseQueryEntryPayload[]>>> = Symbol('queries')

export function useQueryEntries() {
  const entries = inject(QUERIES_KEY)
  if (!entries) {
    throw new Error(
      'The query entries are not provided. Make sure to use them inside the devtools panel.',
    )
  }
  return entries
}

export const MUTATIONS_KEY: InjectionKey<Readonly<Ref<UseMutationEntryPayload[]>>> =
  Symbol('mutations')

export function useMutationEntries() {
  const entries = inject(MUTATIONS_KEY)
  if (!entries) {
    throw new Error(
      'The mutation entries are not provided. Make sure to use them inside the devtools panel.',
    )
  }
  return entries
}
