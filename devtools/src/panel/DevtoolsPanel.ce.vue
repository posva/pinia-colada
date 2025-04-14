<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import type { UseQueryEntryPayload, DevtoolsEmits, AppEmits } from '@pinia/colada-devtools/shared'
import { MessagePortEmitter } from '@pinia/colada-devtools/shared'

const { ports, isPip } = defineProps<{
  ports: [port1: MessagePort, port2: MessagePort]
  isPip: boolean
}>()

const emit = defineEmits<{
  togglePip: []
  closePip: []
  ready: []
}>()
const events = new MessagePortEmitter<DevtoolsEmits, AppEmits>(ports[1])
events.on('ping', () => {
  console.log('Received ping from App')
  events.emit('pong')
})
events.on('pong', () => {
  console.log('Received pong from App')
})
watch(
  () => ports[1],
  (port, _old) => {
    events.setPort(port)
  },
)
onUnmounted(() => {
  events.stop()
})

onMounted(() => {
  emit('ready')
  events.emit('ping')
})

// Data stores
const queries = ref<UseQueryEntryPayload[]>([])
// const mutations = ref<any[]>([]) // Placeholder for mutation data
events.on('queries:all', (q) => {
  console.log('Received queries from App', q)
  queries.value = q
})

// Tab management
const activeTab = ref<'queries' | 'mutations'>('queries')
</script>

<template>
  <PiPContainer id="root" :is-pip>
    <main class="w-full h-full grid grid-rows-[auto_1fr] bg-ui-bg text-ui-text">
      <!-- Merged Header with Tabs Navigation -->
      <div class="flex items-center border-b border-(--ui-border)">
        <!-- Logo -->
        <div class="flex items-center p-2 mr-2">
          <span class="text-xl">🍹</span>
        </div>

        <!-- Tabs -->
        <RouterLink
          class="px-4 py-2 font-medium transition-colors relative"
          active-class="text-primary-500"
          to="/queries"
        >
          Queries
          <div
            v-if="$route.path === '/queries'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
          />
        </RouterLink>
        <RouterLink
          class="px-4 py-2 font-medium transition-colors relative"
          active-class="'text-primary-500'"
          to="/mutations"
        >
          Mutations
          <div
            v-if="activeTab === 'mutations'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
          />
        </RouterLink>

        <div class="flex-grow" />

        <!-- PiP toggle button -->
        <button
          class="p-2 rounded hover:bg-ui-bg-elevated transition-colors"
          :title="isPip ? 'Close popup' : 'Open in popup'"
          @click="emit('togglePip')"
        >
          <i-carbon-popup v-if="!isPip" class="w-5 h-5" />
          <i-carbon-close v-else class="w-5 h-5" />
        </button>
      </div>

      <RouterView />
    </main>
  </PiPContainer>
</template>

<style>
@import '@posva/splitpanes/dist/splitpanes.css';
@import './splitpanes.css';
@import '@pinia/colada-devtools/panel/index.css';
</style>
