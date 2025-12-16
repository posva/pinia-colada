<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { Pane, Splitpanes } from '@posva/splitpanes'
import { useMutationEntries } from '../composables/duplex-channel'
import { getMutationStatus, STATUS_COLOR_CLASSES } from '../utils/mutation-state'
import type { UseMutationEntryPayloadStatus } from '../utils/mutation-state'
import type { UseMutationEntryPayload } from '@pinia/colada-devtools/shared'
import { useContainerMediaQuery } from '../composables/use-container-media-query'
import { useLocalStorage } from '@vueuse/core'

const searchQuery = ref('')

const mutations = useMutationEntries()

const filteredItems = computed(() => {
  let items = mutations.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter((item) => {
      if (!item.key) return false
      return item.key.some((v) => String(v).toLowerCase().includes(query))
    })
  }

  // Sort by most recent first
  return items.toSorted((a, b) => {
    return b.devtools.updatedAt - a.devtools.updatedAt
  })
})

const mutationsGrouped = computed<Record<UseMutationEntryPayloadStatus, UseMutationEntryPayload[]>>(
  () => {
    return {
      loading: [],
      success: [],
      error: [],
      pending: [],
      idle: [],
      inactive: filteredItems.value.filter((item) => !item.active),
      ...Object.groupBy(filteredItems.value, (item) => getMutationStatus(item)),
    }
  },
)

const container = useTemplateRef('split-panes-container')
const isNarrow = useContainerMediaQuery('(width < 768px)', () => container.value?.$el)

const mutationListPanelSize = useLocalStorage<number[]>(
  'pc-devtools-mutation-list-panel-size',
  [30, 70],
)

function updatePanesSize({ panes }: { panes: { size: number }[] }) {
  mutationListPanelSize.value = panes.map((pane) => pane.size)
}
</script>

<template>
  <section class="grid grid-rows-[auto_1fr] overflow-hidden @container">
    <!-- Search & Actions Bar -->
    <div class="flex items-center p-2 border-b border-(--ui-border) gap-2">
      <div class="relative grow">
        <i-lucide-search
          class="absolute left-2 top-1/2 -translate-y-1/2 text-ui-text-muted size-4"
        />
        <UInput v-model="searchQuery" type="search" class="w-full" placeholder="Search Mutations" />
      </div>

      <div class="flex gap-x-1">
        <div
          v-for="(mutationGroup, status) in mutationsGrouped"
          :key="status"
          class="theme-neutral bg-(--ui-bg-muted) rounded p-1 text-xs font-semibold flex items-center gap-x-1"
          :class="(mutationGroup?.length ?? 0) === 0 ? 'text-(--ui-text-muted)' : ''"
          :title="`${mutationGroup?.length ?? 0} ${status} mutations (after filtering)`"
        >
          <div class="rounded-full size-2" :class="STATUS_COLOR_CLASSES[status].base" />
          <span class="@max-[750px]:hidden">{{ status }}</span>
          <div
            class="px-1.5 py-0.5 rounded min-w-[1.65em] flex justify-center"
            :class="
              (mutationGroup?.length ?? 0) === 0
                ? 'bg-(--ui-bg-accented)'
                : [STATUS_COLOR_CLASSES[status].base, STATUS_COLOR_CLASSES[status].text]
            "
          >
            <span>{{ mutationGroup?.length ?? 0 }}</span>
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
      <Pane min-size="15" :size="mutationListPanelSize[0]" class="flex flex-col">
        <ol role="list" class="divide-y divide-(--ui-border)" v-if="filteredItems.length > 0">
          <li v-for="entry of filteredItems" :key="entry.id">
            <ListMutationEntry :entry />
          </li>
        </ol>
        <div
          v-else
          class="flex flex-col items-center p-4 text-(--ui-text-muted) text-sm text-center gap-2"
        >
          <i-lucide-inbox class="size-8" />
          <h3 class="text-lg">No mutations found</h3>
          <p>Try adjusting your search or perform some mutations in your app.</p>
        </div>
      </Pane>

      <!-- Details Panel -->
      <Pane min-size="30" :size="mutationListPanelSize[1]" class="flex flex-col">
        <RouterView />
      </Pane>
    </Splitpanes>
  </section>
</template>
