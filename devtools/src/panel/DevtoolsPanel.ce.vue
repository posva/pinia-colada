<script setup lang="ts">
import { ref, provide } from 'vue'
import type { UseQueryEntryPayload, UseMutationEntryPayload } from '@pinia/colada-devtools/shared'
import {
  removeMutationEntry,
  removeQueryEntry,
  replaceMutationEntry,
  replaceQueryEntry,
} from '@pinia/colada-devtools/shared'
import type { DevtoolsChannel } from './composables/duplex-channel'
import { DEVTOOLS_CHANNEL_KEY, QUERIES_KEY, MUTATIONS_KEY } from './composables/duplex-channel'

const { channel } = defineProps<{
  channel: DevtoolsChannel
}>()

const emit = defineEmits<{
  close: []
}>()

provide(DEVTOOLS_CHANNEL_KEY, channel)

const queries = ref<UseQueryEntryPayload[]>([])
provide(QUERIES_KEY, queries)
channel.on('queries:all', (q) => {
  queries.value = q
})
channel.on('queries:update', (q) => {
  replaceQueryEntry(queries.value, q)
})
channel.on('queries:delete', (q) => {
  removeQueryEntry(queries.value, q)
})

const mutations = ref<UseMutationEntryPayload[]>([])
provide(MUTATIONS_KEY, mutations)
channel.on('mutations:all', (m) => {
  mutations.value = m
})
channel.on('mutations:update', (m) => {
  replaceMutationEntry(mutations.value, m)
})
channel.on('mutations:delete', (m) => {
  removeMutationEntry(mutations.value, m)
})
</script>

<template>
  <div id="root" class="w-full h-full">
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

        <div class="flex items-center py-1 gap-1 pr-1">
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
  </div>
</template>

<style>
@import '@posva/splitpanes/dist/splitpanes.css';
@import './splitpanes.css';
@import '@pinia/colada-devtools/panel/index.css';
</style>
