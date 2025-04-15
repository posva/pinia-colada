<script setup lang="ts">
import type { UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { computed, ref } from 'vue'
import { Pane, Splitpanes } from '@posva/splitpanes'
import { useDuplexChannel, useQueryEntries } from '../../composables/duplex-channel'
import { useRoute } from 'vue-router'

const queries = useQueryEntries()

const route = useRoute('/queries/[queryId]')

// Selection management
const selectedItem = computed<UseQueryEntryPayload | null>(() => {
  return queries.value.find((entry) => entry.id === route.params.queryId) ?? null
})

const channel = useDuplexChannel()
</script>

<template>
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
              'bg-error-500 bg-opacity-10 text-error-500': selectedItem.state.status === 'error',
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
          <pre class="bg-error-500 bg-opacity-10 text-error-500 p-3 rounded text-sm">{{
            JSON.stringify(selectedItem.state.error, null, 2)
          }}</pre>
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
            {{ selectedItem.devtools.history }}
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center h-full text-ui-text-muted">
        <div class="text-sm">Select an item to view metadata</div>
      </div>
    </Pane>
  </Splitpanes>
</template>
