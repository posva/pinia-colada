<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { UseQueryEntryPayload } from '../shared/query-serialized'
import PiPContainer from './components/PiPContainer.vue'

const { ports, isPip } = defineProps<{
  ports: [port1: MessagePort, port2: MessagePort]
  isPip: boolean
}>()

const emit = defineEmits<{
  togglePip: []
  closePip: []
  ready: []
}>()

onMounted(() => {
  emit('ready')
})

// Data stores
const queries = ref<UseQueryEntryPayload[]>([])
const mutations = ref<any[]>([]) // Placeholder for mutation data

// Tab management
const activeTab = ref<'queries' | 'mutations'>('queries')

function onMessage(e: MessageEvent) {
  if (e.data && typeof e.data === 'object') {
    if (e.data.id === 'caches:all') {
      queries.value = e.data.caches
      console.log('Received caches:', e.data.caches)
    } else if (e.data.id === 'mutations:all') {
      mutations.value = e.data.mutations || []
      console.log('Received mutations:', e.data.mutations)
    } else {
      console.log('Received message from App:', e.data)
    }
  }
}

watch(
  () => ports[1],
  (port, _old, onCleanup) => {
    if (!port) return
    // NOTE: only setting onmessage works
    port.onmessage = onMessage
    port.onmessageerror = (err) => {
      console.error('Error in message channel:', err)
    }

    onCleanup(() => {
      port.onmessage = null
      port.onmessageerror = null
    })
  },
  { immediate: true },
)
</script>

<template>
  <PiPContainer :is-pip>
    <main id="main" class="w-full h-full flex flex-col bg-ui-bg text-ui-text">
      <!-- Merged Header with Tabs Navigation -->
      <div class="flex items-center border-b border-ui-border">
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
