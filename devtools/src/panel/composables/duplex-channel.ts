import type { AppEmits, DevtoolsEmits, MessagePortEmitter } from '@pinia/colada-devtools/shared'
import { inject } from 'vue'
import type { InjectionKey } from 'vue'

export const DUPLEX_CHANNEL_KEY: InjectionKey<MessagePortEmitter<DevtoolsEmits, AppEmits>>
  = Symbol('duplex-channel')

export function useDuplexChannel() {
  const channel = inject(DUPLEX_CHANNEL_KEY)
  if (!channel) {
    throw new Error(
      'The duplex channel is not provided. Make sure to use it inside the context of a component that provides it.',
    )
  }
  return channel
}
