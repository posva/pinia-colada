<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { Pane, Splitpanes } from '@posva/splitpanes'
import { useQueryEntries } from '../composables/duplex-channel'
import { getQueryStatus, STATUS_COLOR_CLASSES } from '../utils/query-state'
import type { UseQueryEntryPayloadStatus } from '../utils/query-state'
import type { UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { useContainerMediaQuery } from '../composables/use-container-media-query'
import { useLocalStorage } from '@vueuse/core'

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
    return b.devtools.updatedAt - a.devtools.updatedAt
  })
})

const queriesGrouped = computed<
  Record<
    Exclude<UseQueryEntryPayloadStatus, 'unknown' | 'stale'> | 'inactive',
    UseQueryEntryPayload[]
  >
>(() => {
  return {
    loading: [],
    fresh: [],
    error: [],
    pending: [],
    inactive: filteredItems.value.filter((item) => !item.active),
    ...Object.groupBy(filteredItems.value, (item) => getQueryStatus(item)),
  }
})

const container = useTemplateRef('split-panes-container')
const isNarrow = useContainerMediaQuery('(width < 768px)', () => container.value?.$el)

const queryListPanelSize = useLocalStorage<number[]>('pc-devtools-query-list-panel-size', [30, 70])

function updatePanesSize({ panes }: { panes: { size: number }[] }) {
  queryListPanelSize.value = panes.map((pane) => pane.size)
}
</script>

<template>
  <section class="grid grid-rows-[auto_1fr] overflow-hidden @container">
    <!-- Search & Actions Bar -->
    <div class="flex items-center p-2 border-b border-(--ui-border) gap-2">
      <div class="relative flex-grow">
        <i-lucide-search
          class="absolute left-2 top-1/2 -translate-y-1/2 text-ui-text-muted size-4"
        />
        <UInput v-model="searchQuery" type="search" class="w-full" placeholder="Search Queries" />
      </div>

      <!-- TODO: sort source, asc/desc -->

      <div class="flex gap-x-1">
        <div
          v-for="(queryGroup, status) in queriesGrouped"
          :key="status"
          class="theme-neutral bg-(--ui-bg-muted) rounded p-1 text-xs font-semibold flex items-center gap-x-1"
          :class="(queryGroup?.length ?? 0) === 0 ? 'text-(--ui-text-muted)' : ''"
          :title="`${queryGroup?.length ?? 0} ${status} queries (after filtering)`"
        >
          <div class="rounded-full size-2" :class="STATUS_COLOR_CLASSES[status].base" />
          <span class="@max-[750px]:hidden">{{ status }}</span>
          <div
            class="px-1.5 py-0.5 rounded min-w-[1.65em] flex justify-center"
            :class="
              (queryGroup?.length ?? 0) === 0
                ? 'bg-(--ui-bg-accented)'
                : [STATUS_COLOR_CLASSES[status].base, STATUS_COLOR_CLASSES[status].text]
            "
          >
            <span>{{ queryGroup?.length ?? 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <Splitpanes
      ref="split-panes-container"
      class="overflow-hidden"
      :horizontal="isNarrow"
      @resized="updatePanesSize"
    >
      <!-- List Panel -->
      <Pane min-size="15" :size="queryListPanelSize[0]" class="flex flex-col">
        <ol role="list" class="divide-y divide-(--ui-border)">
          <li v-for="entry of filteredItems" :key="entry.keyHash">
            <ListQueryEntry :entry />
          </li>
        </ol>
      </Pane>

      <!-- Details Panel -->
      <Pane min-size="30" :size="queryListPanelSize[1]" class="flex flex-col">
        <RouterView />
      </Pane>
    </Splitpanes>
  </section>
</template>
