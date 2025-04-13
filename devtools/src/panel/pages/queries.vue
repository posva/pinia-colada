<script setup lang="ts">
import type { UseQueryEntryPayload } from '../../shared/query-serialized'
import { computed, ref } from 'vue'
import { Pane, Splitpanes } from '@posva/splitpanes'

const searchQuery = ref('')

// TODO: globalize
const queries = ref<UseQueryEntryPayload[]>([])

// Selection management
const selectedItemId = ref<string | null>(null)
const selectedItem = computed(() => {
  if (!selectedItemId.value) return null

  return queries.value.find((q) => q.key === selectedItemId.value) || null
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

// TODO: move to a rpc instance
function clearCache() {
  // Send message to clear query cache
  const port = ports?.[1]
  if (port) {
    port.postMessage({
      id: 'caches:clear',
    })
  }
  queries.value = []

  selectedItemId.value = null
}

function selectItem(id: string) {
  selectedItemId.value = id === selectedItemId.value ? null : id
}
</script>

<template>
  <!-- Search & Actions Bar -->
  <div class="flex items-center p-2 border-b border-ui-border gap-2">
    <div class="relative flex-grow">
      <i-carbon-search
        class="absolute left-2 top-1/2 -translate-y-1/2 text-ui-text-muted w-4 h-4"
      />
      <input
        v-model="searchQuery"
        type="search"
        class="w-full py-1.5 pl-8 pr-2 rounded bg-ui-bg-elevated border border-ui-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition-colors"
        placeholder="Search Queries"
      >
    </div>

    <button
      class="p-1.5 rounded hover:bg-ui-bg-elevated transition-colors text-ui-text-toned hover:text-error-500 flex items-center gap-1.5"
      @click="clearCache"
    >
      <i-carbon-trash-can class="w-4 h-4" />
      <span>Clear</span>
    </button>
  </div>

  <!-- Content with SplitPanes -->
  <div class="flex-grow overflow-hidden">
    <Splitpanes class="h-full">
      <!-- List Panel -->
      <Pane min-size="15" :size="30" class="flex flex-col overflow-hidden">
        <div class="flex-grow overflow-y-auto">
          <!-- Queries List -->
          <div class="flex flex-col">
            <button
              v-for="entry in filteredItems"
              :key="entry.key"
              class="text-left px-3 py-2 border-b border-ui-border flex items-start transition-colors"
              :class="
                selectedItemId === entry.key
                  ? 'bg-primary-500 bg-opacity-10'
                  : 'hover:bg-ui-bg-elevated'
              "
              @click="selectItem(entry.key)"
            >
              <div class="flex flex-col">
                <div class="font-medium">
                  {{ entry.key }}
                </div>
                <div class="text-xs text-ui-text-muted">
                  {{ entry.state.status }}
                </div>
              </div>
            </button>
            <div v-if="filteredItems.length === 0" class="p-4 text-center text-ui-text-muted">
              No queries found
            </div>
          </div>
        </div>
      </Pane>

      <!-- Details Panel -->
      <Pane min-size="30" class="flex flex-col overflow-hidden">
        <Splitpanes horizontal>
          <!-- Data Panel -->
          <Pane min-size="30" :size="50" class="p-4 overflow-auto">
            <div v-if="selectedItem" class="space-y-4">
              <div class="pb-2 border-b border-ui-border">
                <h3 class="font-medium text-lg">
                  Query Details
                </h3>
                <div class="text-sm text-ui-text-muted">
                  {{ selectedItem.key }}
                </div>
              </div>

              <div class="space-y-2">
                <h4 class="font-medium">
                  Status
                </h4>
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
                <h4 class="font-medium">
                  Data
                </h4>
                <pre class="bg-ui-bg-elevated p-3 rounded overflow-auto text-sm">{{
                  JSON.stringify(selectedItem.state.data, null, 2)
                }}</pre>
              </div>

              <div v-if="selectedItem.state.error" class="space-y-2">
                <h4 class="font-medium">
                  Error
                </h4>
                <pre
                  class="bg-error-500 bg-opacity-10 text-error-500 p-3 rounded overflow-auto text-sm"
                >{{ JSON.stringify(selectedItem.state.error, null, 2) }}</pre>
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center h-full text-ui-text-muted">
              <div class="text-lg">
                Select a query to view details
              </div>
            </div>
          </Pane>

          <!-- Timeline/Metadata Panel -->
          <Pane min-size="10" :size="50" class="p-4 overflow-auto border-t border-ui-border">
            <div v-if="selectedItem" class="space-y-4">
              <h3 class="font-medium border-b border-ui-border pb-2">
                Timeline & Metadata
              </h3>

              <div class="space-y-2">
                <h4 class="text-sm font-medium">
                  Last Updated
                </h4>
                <div>{{ new Date().toLocaleString() }}</div>
              </div>

              <div class="space-y-2">
                <h4 class="text-sm font-medium">
                  Additional Info
                </h4>
                <div class="text-sm text-ui-text-muted">
                  This panel will show timeline information and additional metadata.
                </div>
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center h-full text-ui-text-muted">
              <div class="text-sm">
                Select an item to view metadata
              </div>
            </div>
          </Pane>
        </Splitpanes>
      </Pane>
    </Splitpanes>
  </div>
</template>
