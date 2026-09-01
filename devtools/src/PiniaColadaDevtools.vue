<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useQueryCache, useMutationCache } from '@pinia/colada'
import type { UseMutationEntryPayload, UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import {
  removeMutationEntry,
  removeQueryEntry,
  replaceMutationEntry,
  replaceQueryEntry,
} from '@pinia/colada-devtools/shared'
import { setupDevtoolsAppBridge } from './app-bridge'
import { DevtoolsPanel } from './panel'

const emit = defineEmits<{
  close: []
}>()

const queryCache = useQueryCache()
const mutationCache = useMutationCache()

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
})

onMounted(() => bridge.sendAll())
</script>

<template>
  <Teleport to="body">
    <DevtoolsPanel
      :actions="bridge.actions"
      :queries
      :mutations
      class="fixed inset-x-0 bottom-0 h-[50vh] z-9999"
      @close="emit('close')"
    />
  </Teleport>
</template>
