<script setup lang="ts">
import { useMutationEntries, useQueryEntries } from './composables/devtools-context'

defineProps<{
  status: 'loading' | 'ready' | 'not-found'
}>()

const queries = useQueryEntries()
const mutations = useMutationEntries()
</script>

<template>
  <div id="root" class="w-full h-full">
    <main
      v-if="status === 'ready'"
      class="w-full h-full grid grid-rows-[auto_1fr] bg-ui-bg text-ui-text font-sans"
    >
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
    <main
      v-else
      class="w-full h-full grid place-items-center bg-ui-bg text-ui-text font-sans text-center"
    >
      <div class="grid gap-3 justify-items-center p-6">
        <span class="text-3xl" :class="{ 'animate-pulse': status === 'loading' }">🍹</span>
        <p class="text-sm text-(--ui-text-muted)">
          {{
            status === 'loading'
              ? 'Looking for Pinia Colada…'
              : 'No Pinia Colada instance was found.'
          }}
        </p>
      </div>
    </main>
  </div>
</template>

<style>
@import '@posva/splitpanes/dist/splitpanes.css';
@import './splitpanes.css';
</style>
