import type {
  AppEmits,
  DevtoolsEmits,
  DuplexChannel,
  UseQueryEntryPayload,
  UseMutationEntryPayload,
} from '@pinia/colada-devtools/shared'
import { inject } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import { diagnostics } from '../../diagnostics'

export const DUPLEX_CHANNEL_KEY: InjectionKey<DuplexChannel<DevtoolsEmits, AppEmits>> =
  Symbol('duplex-channel')

export function useDuplexChannel() {
  const channel = inject(DUPLEX_CHANNEL_KEY)
  if (!channel) {
    throw diagnostics.PCD_R0006({ resource: 'duplex channel' })
  }
  return channel
}

export const QUERIES_KEY: InjectionKey<Ref<UseQueryEntryPayload[]>> = Symbol('queries')

export function useQueryEntries() {
  const entries = inject(QUERIES_KEY)
  if (!entries) {
    throw diagnostics.PCD_R0006({ resource: 'query entries' })
  }
  return entries
}

export const MUTATIONS_KEY: InjectionKey<Ref<UseMutationEntryPayload[]>> = Symbol('mutations')

export function useMutationEntries() {
  const entries = inject(MUTATIONS_KEY)
  if (!entries) {
    throw diagnostics.PCD_R0006({ resource: 'mutation entries' })
  }
  return entries
}
