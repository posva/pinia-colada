import type {
  AppEmits,
  DevtoolsEmits,
  DuplexChannel,
  UseQueryEntryPayload,
} from '@pinia/colada-devtools/shared'
import { inject } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export const DUPLEX_CHANNEL_KEY: InjectionKey<DuplexChannel<DevtoolsEmits, AppEmits>> =
  Symbol('duplex-channel')

export function useDuplexChannel() {
  const channel = inject(DUPLEX_CHANNEL_KEY)
  if (!channel) {
    throw new Error(
      'The duplex channel is not provided. Make sure to use it inside the context of a component that provides it.',
    )
  }
  return channel
}

export const QUERIES_KEY: InjectionKey<Ref<UseQueryEntryPayload[]>> = Symbol('queries')

export function useQueryEntries() {
  const entries = inject(QUERIES_KEY)
  if (!entries) {
    throw new Error(
      'The query entries are not provided. Make sure to use it inside the context of a component that provides it.',
    )
  }
  return entries
}
