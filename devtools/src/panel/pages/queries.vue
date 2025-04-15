<script setup lang="ts">
import type { UseQueryEntryPayload } from '../../shared/query-serialized'
import { computed, ref } from 'vue'
import { Pane, Splitpanes } from '@posva/splitpanes'
import { useDuplexChannel, useQueryEntries } from '../composables/duplex-channel'
import { useRoute } from 'vue-router'

const searchQuery = ref('')

const queries = useQueryEntries()

const filteredItems = computed(() => {
  let items = queries.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter((item) => {
      const searchable = item.key
      return searchable.some((v) => String(v).toLowerCase().includes(query))
    })
  }

  // sort by last updatedAt
  return items.sort((a, b) => {
    return b.devtools.history[0]!.updatedAt - a.devtools.history[0]!.updatedAt
  })
})

const queriesGrouped = computed(() => {
  return Object.groupBy(
    filteredItems.value,
    (item) => item.asyncStatus.value === 'loading' ? 'loading' : item.state.status,
  )
})

const channel = useDuplexChannel()

function clearCache() {
  channel.emit('queries:clear')
}
</script>

<template>
  <section class="grid grid-rows-[auto_1fr] overflow-hidden">
    <!-- Search & Actions Bar -->
    <div class="flex items-center p-2 border-b border-(--ui-border) gap-2">
      <div class="relative flex-grow">
        <i-carbon-search
          class="absolute left-2 top-1/2 -translate-y-1/2 text-ui-text-muted w-4 h-4"
        />
        <UInput v-model="searchQuery" type="search" class="w-full" placeholder="Search Queries" />
      </div>

      <UButton class="variant-ghost theme-error flex items-center gap-1.5" @click="clearCache">
        <i-carbon-trash-can class="w-4 h-4" />
        <span>Clear</span>
      </UButton>
    </div>

    <Splitpanes class="overflow-hidden">
      <!-- List Panel -->
      <Pane min-size="15" :size="30" class="flex flex-col">
        <ol role="list" class="divide-y divide-(--ui-border)">
          <li v-for="entry of filteredItems" :key="entry.id">
            <ListQueryEntry :entry />
          </li>
        </ol>
      </Pane>

      <!-- Details Panel -->
      <Pane min-size="30" class="flex flex-col">
        <RouterView />
      </Pane>
    </Splitpanes>
  </section>
</template>
