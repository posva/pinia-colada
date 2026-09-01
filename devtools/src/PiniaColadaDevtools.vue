<script setup lang="ts">
import { ref } from 'vue'
import { useQueryCache, useMutationCache } from '@pinia/colada'
import type {
  AppEmits,
  DevtoolsEmits,
  UseMutationEntryPayload,
  UseQueryEntryPayload,
} from '@pinia/colada-devtools/shared'
import {
  removeMutationEntry,
  removeQueryEntry,
  replaceMutationEntry,
  replaceQueryEntry,
} from '@pinia/colada-devtools/shared'
import type { DevtoolsChannel } from './panel/composables/duplex-channel'
import { setupDevtoolsAppBridge } from './app-bridge'
import { DevtoolsPanel } from './panel'

const emit = defineEmits<{
  close: []
}>()

const queryCache = useQueryCache()
const mutationCache = useMutationCache()

const listeners = new Map<keyof AppEmits, Set<(...args: any[]) => void>>()
const channel: DevtoolsChannel = {
  emit(event, ...args) {
    const handler = bridge.actions[event] as (...args: DevtoolsEmits[typeof event]) => void
    handler(...args)
  },
  on(event, callback) {
    let eventListeners = listeners.get(event)
    if (!eventListeners) listeners.set(event, (eventListeners = new Set()))
    eventListeners.add(callback)
    return () => eventListeners.delete(callback)
  },
}

function publish<K extends keyof AppEmits>(event: K, ...args: AppEmits[K]) {
  for (const listener of listeners.get(event) ?? []) listener(...args)
}

const queries = ref<UseQueryEntryPayload[]>([])
const mutations = ref<UseMutationEntryPayload[]>([])
const bridge = setupDevtoolsAppBridge(queryCache, mutationCache, (event, payload) => {
  if (event === 'queries:all') queries.value = payload as UseQueryEntryPayload[]
  else if (event === 'queries:update')
    replaceQueryEntry(queries.value, payload as UseQueryEntryPayload)
  else if (event === 'queries:delete')
    removeQueryEntry(queries.value, payload as UseQueryEntryPayload)
  else if (event === 'mutations:all') mutations.value = payload as UseMutationEntryPayload[]
  else if (event === 'mutations:update')
    replaceMutationEntry(mutations.value, payload as UseMutationEntryPayload)
  else removeMutationEntry(mutations.value, payload as UseMutationEntryPayload)
  publish(event, payload as any)
})

bridge.sendAll()
</script>

<template>
  <Teleport to="body">
    <DevtoolsPanel
      :channel
      class="fixed inset-x-0 bottom-0 h-[50vh] z-9999"
      @close="emit('close')"
    />
  </Teleport>
</template>
