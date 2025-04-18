<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, provide, onErrorCaptured } from 'vue'
import type { UseQueryEntryPayload, DevtoolsEmits, AppEmits } from '@pinia/colada-devtools/shared'
import { DuplexChannel } from '@pinia/colada-devtools/shared'
import { DUPLEX_CHANNEL_KEY, QUERIES_KEY } from './composables/duplex-channel'

const { port, isPip } = defineProps<{
  port: MessagePort
  isPip: boolean
}>()

const emit = defineEmits<{
  togglePip: []
  closePip: []
  ready: []
}>()
const channel = new DuplexChannel<DevtoolsEmits, AppEmits>(port)
provide(DUPLEX_CHANNEL_KEY, channel)

channel.on('ping', () => {
  console.log('[Devtools] Received ping from App')
  channel.emit('pong')
})
channel.on('pong', () => {
  console.log('[Devtools] Received pong from App')
})

watch(
  () => port,
  (port, _old) => {
    channel.setPort(port)
  },
)
onUnmounted(() => {
  channel.stop()
})

onMounted(() => {
  emit('ready')
  channel.emit('ping')
})

const queries = ref<UseQueryEntryPayload[]>([])
provide(QUERIES_KEY, queries)
channel.on('queries:all', (q) => {
  queries.value = q
})
channel.on('queries:update', (q) => {
  const index = queries.value.findIndex((entry) => entry.id === q.id)
  if (index !== -1) {
    queries.value.splice(index, 1, q)
  } else {
    queries.value.push(q)
  }
})
channel.on('queries:delete', (q) => {
  const index = queries.value.findIndex((entry) => entry.id === q.id)
  if (index !== -1) {
    queries.value.splice(index, 1)
  }
})
</script>

<template>
  <PiPContainer id="root" :is-pip>
    <main class="w-full h-full grid grid-rows-[auto_1fr] bg-ui-bg text-ui-text font-sans">
      <!-- Merged Header with Tabs Navigation -->
      <div class="flex items-center border-b border-(--ui-border) select-none">
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
        <div class="flex items-center py-1 gap-1 pr-1">
          <UButton
            class="variant-ghost theme-neutral"
            :title="isPip ? 'Close popup' : 'Open in popup'"
            @click="emit('togglePip')"
          >
            <i-carbon-popup v-if="!isPip" class="w-5 h-5" />
            <i-carbon-close v-else class="w-5 h-5" />
          </UButton>
        </div>
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
