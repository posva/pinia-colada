<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, provide } from 'vue'
import type { UseQueryEntryPayload, DevtoolsEmits, AppEmits } from '@pinia/colada-devtools/shared'
import { MessagePortEmitter } from '@pinia/colada-devtools/shared'
import { DUPLEX_CHANNEL_KEY } from './composables/duplex-channel'

const { port, isPip } = defineProps<{
  port: MessagePort
  isPip: boolean
}>()

const emit = defineEmits<{
  togglePip: []
  closePip: []
  ready: []
}>()
const events = new MessagePortEmitter<DevtoolsEmits, AppEmits>(port)
provide(DUPLEX_CHANNEL_KEY, events)

events.on('ping', () => {
  console.log('Received ping from App')
  events.emit('pong')
})
events.on('pong', () => {
  console.log('Received pong from App')
})
watch(
  () => port,
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
</script>

<template>
  <PiPContainer id="root" :is-pip>
    <main class="w-full h-full grid grid-rows-[auto_1fr] bg-ui-bg text-ui-text">
      <!-- Merged Header with Tabs Navigation -->
      <div class="flex items-center border-b border-(--ui-border) select-none pt-2">
        <!-- Logo -->
        <div class="flex items-center p-2 mr-2">
          <span class="text-xl">🍹</span>
        </div>

        <!-- Tabs -->
        <RouterLink
          v-for="link in ['/queries', '/mutations']"
          :key="link"
          v-slot="{ isActive, href, navigate }"
          custom
          :to="link"
        >
          <a
            :href
            :class="isActive ? 'border-theme' : 'border-transparent text-(--ui-text-dimmed)'"
            class="px-4 py-2 font-medium transition-colors hover:bg-theme-400 relative theme-primary border-b-2 hover:border-theme-300"
            @click="navigate"
          >
            {{ link.slice(1, 2).toUpperCase() + link.slice(2) }}
          </a>
        </RouterLink>

        <div class="flex-grow" />

        <!-- PiP toggle button -->
        <UButton
          class="theme-ghost"
          :title="isPip ? 'Close popup' : 'Open in popup'"
          @click="emit('togglePip')"
        >
          <i-carbon-popup v-if="!isPip" class="w-5 h-5" />
          <i-carbon-close v-else class="w-5 h-5" />
        </UButton>
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
