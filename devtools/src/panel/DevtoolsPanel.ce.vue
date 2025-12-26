<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, provide } from 'vue'
import type {
  UseQueryEntryPayload,
  UseMutationEntryPayload,
  DevtoolsEmits,
  AppEmits,
} from '@pinia/colada-devtools/shared'
import { DuplexChannel } from '@pinia/colada-devtools/shared'
import { DUPLEX_CHANNEL_KEY, QUERIES_KEY, MUTATIONS_KEY } from './composables/duplex-channel'

const { port, isPip } = defineProps<{
  port: MessagePort
  isPip: boolean
}>()

const emit = defineEmits<{
  togglePip: []
  closePip: []
  ready: []
  close: []
}>()

const channel = new DuplexChannel<DevtoolsEmits, AppEmits>(port)
provide(DUPLEX_CHANNEL_KEY, channel)

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
  requestAnimationFrame(() => {
    emit('ready')
  })
})

const queries = ref<UseQueryEntryPayload[]>([])
provide(QUERIES_KEY, queries)
channel.on('queries:all', (q) => {
  queries.value = q
})
channel.on('queries:update', (q) => {
  const index = queries.value.findIndex((entry) => entry.keyHash === q.keyHash)
  if (index !== -1) {
    queries.value.splice(index, 1, q)
  } else {
    queries.value.push(q)
  }
})
channel.on('queries:delete', (q) => {
  const index = queries.value.findIndex((entry) => entry.keyHash === q.keyHash)
  if (index !== -1) {
    queries.value.splice(index, 1)
  }
})

const mutations = ref<UseMutationEntryPayload[]>([])
provide(MUTATIONS_KEY, mutations)
channel.on('mutations:all', (m) => {
  mutations.value = m
})
channel.on('mutations:update', (m) => {
  const index = mutations.value.findIndex((entry) => entry.id === m.id)
  if (index !== -1) {
    mutations.value.splice(index, 1, m)
  } else {
    mutations.value.push(m)
  }
})
channel.on('mutations:delete', (m) => {
  const index = mutations.value.findIndex((entry) => entry.id === m.id)
  if (index !== -1) {
    mutations.value.splice(index, 1)
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
            {{ link.slice(1, 2).toUpperCase() + link.slice(2)
            }}{{
              link === '/queries' && queries.length > 0
                ? ` (${queries.length})`
                : link === '/mutations' && mutations.length > 0
                  ? ` (${mutations.length})`
                  : ''
            }}
          </a>
        </RouterLink>

        <div class="grow" />

        <!-- PiP toggle button -->
        <div class="flex items-center py-1 gap-1 pr-1">
          <UButton
            class="variant-ghost theme-neutral"
            :title="isPip ? 'Restore window' : 'Open in a new window'"
            @click="emit('togglePip')"
          >
            <i-lucide-picture-in-picture v-if="!isPip" class="w-5 h-5" />
            <i-lucide-minimize-2 v-else class="w-5 h-5" />
          </UButton>
          <UButton
            class="variant-ghost theme-neutral"
            title="Close devtools"
            @click="emit('close')"
          >
            <i-lucide-x class="w-5 h-5" />
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
