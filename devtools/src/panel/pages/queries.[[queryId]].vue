<script setup lang="ts">
import type { UseQueryEntryPayload } from '../../shared/query-serialized'
import { computed, ref } from 'vue'
import { Pane, Splitpanes } from '@posva/splitpanes'
import { useDuplexChannel, useQueryEntries } from '../composables/duplex-channel'
import { useRoute } from 'vue-router'

const searchQuery = ref('')

const queries = useQueryEntries()

const route = useRoute('/queries.[[queryId]]')

// Selection management
const selectedItem = computed<UseQueryEntryPayload | null>(() => {
  if (!route.params.queryId) return null

  return queries.value.find((entry) => entry.id === route.params.queryId) ?? null
})

// Filter items based on search query
const filteredItems = computed(() => {
  const items = queries.value
  if (!searchQuery.value) return items

  const query = searchQuery.value.toLowerCase()
  return items.filter((item) => {
    const searchable = item.key
    return searchable.some((v) => String(v).toLowerCase().includes(query))
  })
})

const channel = useDuplexChannel()

// TODO: move to a rpc instance
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
          <li v-for="entry of filteredItems">
            <ListQueryEntry :entry />
          </li>
        </ol>
      </Pane>

      <!-- Details Panel -->
      <Pane min-size="30" class="flex flex-col">
        <Splitpanes horizontal>
          <!-- Data Panel -->
          <Pane min-size="30" :size="50" class="p-4">
            <div v-if="selectedItem" class="space-y-4">
              <div class="pb-2 border-b border(--ui-border)">
                <h3 class="font-medium text-lg">Query Details</h3>
                <div class="text-sm text-ui-text-muted">
                  {{ selectedItem.key }}
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="font-medium">Status</h4>
                <div
                  class="px-2 py-1 rounded inline-flex items-center"
                  :class="{
                    'bg-success-500 bg-opacity-10 text-success-500':
                      selectedItem.state.status === 'success',
                    'bg-error-500 bg-opacity-10 text-error-500':
                      selectedItem.state.status === 'error',
                    'bg-warning-500 bg-opacity-10 text-warning-500':
                      selectedItem.state.status === 'pending',
                    'bg-neutral-500 bg-opacity-10 text-neutral-500': !selectedItem.state.status,
                  }"
                >
                  {{ selectedItem.state.status || 'unknown' }}
                </div>
              </div>

              <div v-if="selectedItem.state.data != null" class="space-y-2">
                <h4 class="font-medium">Data</h4>
                <pre class="bg-ui-bg-elevated p-3 rounded text-sm">{{
                  JSON.stringify(selectedItem.state.data, null, 2)
                }}</pre>
              </div>

              <div v-if="selectedItem.state.error" class="space-y-2">
                <h4 class="font-medium">Error</h4>
                <pre
                  class="bg-error-500 bg-opacity-10 text-error-500 p-3 rounded text-sm"
                  >{{ JSON.stringify(selectedItem.state.error, null, 2) }}</pre
                >
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center h-full text-ui-text-muted">
              <div class="text-lg">Select a query to view details</div>
            </div>
          </Pane>

          <!-- Timeline/Metadata Panel -->
          <Pane min-size="10" :size="50" class="p-4">
            <div v-if="selectedItem" class="space-y-4">
              <h3 class="font-medium border-b border(--ui-border) pb-2">Timeline & Metadata</h3>

              <div class="space-y-2">
                <h4 class="text-sm font-medium">Last Updated</h4>
                <div>{{ new Date().toLocaleString() }}</div>
              </div>

              <div class="space-y-2">
                <h4 class="text-sm font-medium">Additional Info</h4>
                <div class="text-sm text-ui-text-muted">
                  This panel will show timeline information and additional metadata.
                </div>
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center h-full text-ui-text-muted">
              <div class="text-sm">Select an item to view metadata</div>
            </div>
          </Pane>
        </Splitpanes>
      </Pane>
    </Splitpanes>
  </section>
</template>
