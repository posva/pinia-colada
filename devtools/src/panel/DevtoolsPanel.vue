<script setup lang="ts">
import { provide, toRef } from 'vue'
import type { UseQueryEntryPayload, UseMutationEntryPayload } from '@pinia/colada-devtools/shared'
import type { DevtoolsActions } from './composables/devtools-context'
import { DEVTOOLS_ACTIONS_KEY, MUTATIONS_KEY, QUERIES_KEY } from './composables/devtools-context'

const props = defineProps<{
  actions: DevtoolsActions
  queries: UseQueryEntryPayload[]
  mutations: UseMutationEntryPayload[]
}>()

provide(DEVTOOLS_ACTIONS_KEY, props.actions)
provide(QUERIES_KEY, toRef(props, 'queries'))
provide(MUTATIONS_KEY, toRef(props, 'mutations'))
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
      </div>

      <RouterView />
    </main>
  </div>
</template>

<style>
@import '@posva/splitpanes/dist/splitpanes.css';
@import './splitpanes.css';
</style>
