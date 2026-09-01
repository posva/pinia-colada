import type {
  AppEmits,
  DevtoolsEmits,
  UseQueryEntryPayload,
  UseMutationEntryPayload,
} from '@pinia/colada-devtools/shared'
import { inject } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export interface DevtoolsChannel {
  emit<K extends keyof DevtoolsEmits>(event: K, ...args: DevtoolsEmits[K]): void
  on<K extends keyof AppEmits>(event: K, callback: (...args: AppEmits[K]) => void): () => void
}

export const DEVTOOLS_CHANNEL_KEY: InjectionKey<DevtoolsChannel> = Symbol('devtools-channel')

export function useDevtoolsChannel() {
  const channel = inject(DEVTOOLS_CHANNEL_KEY)
  if (!channel) {
    throw new Error(
      'The devtools channel is not provided. Make sure to use it inside the context of a component that provides it.',
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

export const MUTATIONS_KEY: InjectionKey<Ref<UseMutationEntryPayload[]>> = Symbol('mutations')

export function useMutationEntries() {
  const entries = inject(MUTATIONS_KEY)
  if (!entries) {
    throw new Error(
      'The mutation entries are not provided. Make sure to use it inside the context of a component that provides it.',
    )
  }
  return entries
}
