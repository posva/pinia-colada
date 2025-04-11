<script setup lang="ts">
import { Splitpanes, Pane } from '@posva/splitpanes'
import { ref, watch, computed, onMounted } from 'vue'
import type { UseQueryEntryPayload } from '../shared/query-serialized'
import PiPContainer from './components/PiPContainer.vue'

const { ports, isPip } = defineProps<{
  ports: [port1: MessagePort, port2: MessagePort]
  isPip: boolean
}>()

const emit = defineEmits<{
  togglePip: []
  closePip: []
  ready: []
}>()

onMounted(() => {
  emit('ready')
})

// Data stores
const queries = ref<UseQueryEntryPayload[]>([])
const mutations = ref<any[]>([]) // Placeholder for mutation data

// Tab management
const activeTab = ref<'queries' | 'mutations'>('queries')
const searchQuery = ref('')

// Selection management
const selectedItemId = ref<string | null>(null)
const selectedItem = computed(() => {
  if (!selectedItemId.value) return null

  if (activeTab.value === 'queries') {
    return queries.value.find((q) => q.key === selectedItemId.value) || null
  } else {
    return mutations.value.find((m) => m.id === selectedItemId.value) || null
  }
})

// Filter items based on search query
const filteredItems = computed(() => {
  const items = activeTab.value === 'queries' ? queries.value : mutations.value
  if (!searchQuery.value) return items

  const query = searchQuery.value.toLowerCase()
  return items.filter((item) => {
    const searchable = activeTab.value === 'queries' ? item.key : item.id
    return searchable.toLowerCase().includes(query)
  })
})

function onMessage(e: MessageEvent) {
  if (e.data && typeof e.data === 'object') {
    if (e.data.id === 'caches:all') {
      queries.value = e.data.caches
      console.log('Received caches:', e.data.caches)
    } else if (e.data.id === 'mutations:all') {
      mutations.value = e.data.mutations || []
      console.log('Received mutations:', e.data.mutations)
    } else {
      console.log('Received message from App:', e.data)
    }
  }
}

watch(
  () => ports[1],
  (port, _old, onCleanup) => {
    if (!port) return
    // NOTE: only setting onmessage works
    port.onmessage = onMessage
    port.onmessageerror = (err) => {
      console.error('Error in message channel:', err)
    }

    onCleanup(() => {
      port.onmessage = null
      port.onmessageerror = null
    })
  },
  { immediate: true },
)

function clearCache() {
  if (activeTab.value === 'queries') {
    // Send message to clear query cache
    const port = ports?.[1]
    if (port) {
      port.postMessage({
        id: 'caches:clear',
      })
    }
    queries.value = []
  } else {
    // Clear mutations
    mutations.value = []
  }
  selectedItemId.value = null
}

function selectItem(id: string) {
  selectedItemId.value = id === selectedItemId.value ? null : id
}
</script>

<template>
  <PiPContainer :is-pip>
    <main id="main" class="w-full h-full flex flex-col bg-ui-bg text-ui-text">
      <!-- Merged Header with Tabs Navigation -->
      <div class="flex items-center border-b border-ui-border">
        <!-- Logo -->
        <div class="flex items-center p-2 mr-2">
          <span class="text-xl">🍹</span>
        </div>

        <!-- Tabs -->
        <button
          class="px-4 py-2 font-medium transition-colors relative"
          :class="activeTab === 'queries' ? 'text-primary-500' : 'hover:text-ui-text-toned'"
          @click="activeTab = 'queries'"
        >
          Queries
          <div
            v-if="activeTab === 'queries'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
          />
        </button>
        <button
          class="px-4 py-2 font-medium transition-colors relative"
          :class="activeTab === 'mutations' ? 'text-primary-500' : 'hover:text-ui-text-toned'"
          @click="activeTab = 'mutations'"
        >
          Mutations
          <div
            v-if="activeTab === 'mutations'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
          />
        </button>

        <div class="flex-grow" />

        <!-- PiP toggle button -->
        <button
          class="p-2 rounded hover:bg-ui-bg-elevated transition-colors"
          :title="isPip ? 'Close popup' : 'Open in popup'"
          @click="emit('togglePip')"
        >
          <i-carbon-popup v-if="!isPip" class="w-5 h-5" />
          <i-carbon-close v-else class="w-5 h-5" />
        </button>
      </div>

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
            :placeholder="`Search ${activeTab}`"
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
              <div v-if="activeTab === 'queries'" class="flex flex-col">
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
                      {{ entry.status }}
                    </div>
                  </div>
                </button>
                <div v-if="filteredItems.length === 0" class="p-4 text-center text-ui-text-muted">
                  No queries found
                </div>
              </div>

              <!-- Mutations List -->
              <div v-else class="flex flex-col">
                <button
                  v-for="(mutation, index) in filteredItems"
                  :key="mutation?.id || index"
                  class="text-left px-3 py-2 border-b border-ui-border flex items-start transition-colors"
                  :class="
                    selectedItemId === mutation?.id
                      ? 'bg-primary-500 bg-opacity-10'
                      : 'hover:bg-ui-bg-elevated'
                  "
                  @click="mutation?.id && selectItem(mutation.id)"
                >
                  <div class="flex flex-col">
                    <div class="font-medium">
                      {{ mutation?.name || 'Unknown Mutation' }}
                    </div>
                    <div class="text-xs text-ui-text-muted">
                      {{ mutation?.status || 'status' }}
                    </div>
                  </div>
                </button>
                <div v-if="filteredItems.length === 0" class="p-4 text-center text-ui-text-muted">
                  No mutations found
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
                      {{ activeTab === 'queries' ? 'Query' : 'Mutation' }} Details
                    </h3>
                    <div class="text-sm text-ui-text-muted">
                      {{ activeTab === 'queries' ? selectedItem.key : selectedItem?.name }}
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
                          selectedItem.status === 'success',
                        'bg-error-500 bg-opacity-10 text-error-500':
                          selectedItem.status === 'error',
                        'bg-warning-500 bg-opacity-10 text-warning-500':
                          selectedItem.status === 'pending',
                        'bg-neutral-500 bg-opacity-10 text-neutral-500': !selectedItem.status,
                      }"
                    >
                      {{ selectedItem.status || 'unknown' }}
                    </div>
                  </div>

                  <div
                    v-if="activeTab === 'queries' && selectedItem.data !== undefined"
                    class="space-y-2"
                  >
                    <h4 class="font-medium">
                      Data
                    </h4>
                    <pre class="bg-ui-bg-elevated p-3 rounded overflow-auto text-sm">{{
                      JSON.stringify(selectedItem.data, null, 2)
                    }}</pre>
                  </div>

                  <div v-if="activeTab === 'queries' && selectedItem.error" class="space-y-2">
                    <h4 class="font-medium">
                      Error
                    </h4>
                    <pre
                      class="bg-error-500 bg-opacity-10 text-error-500 p-3 rounded overflow-auto text-sm"
                    >{{ JSON.stringify(selectedItem.error, null, 2) }}</pre>
                  </div>
                </div>

                <div
                  v-else
                  class="flex flex-col items-center justify-center h-full text-ui-text-muted"
                >
                  <div class="text-lg">
                    Select a {{ activeTab === 'queries' ? 'query' : 'mutation' }} to view details
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

                <div
                  v-else
                  class="flex flex-col items-center justify-center h-full text-ui-text-muted"
                >
                  <div class="text-sm">
                    Select an item to view metadata
                  </div>
                </div>
              </Pane>
            </Splitpanes>
          </Pane>
        </Splitpanes>
      </div>
    </main>
  </PiPContainer>
</template>

<style>
@import '@pinia/colada-devtools/panel/index.css';
@import '@posva/splitpanes/dist/splitpanes.css';

.splitpanes__splitter {
  position: relative;
  --grab-size: -4px;
}

.splitpanes__splitter {
  /* background-color: #9ca3af33; */
  background-color: color-mix(in hsl, var(--ui-text) 20%, transparent);
}

/* .splitpanes--horizontal > div { */
/*   overflow-y: hidden; */
/*   overflow-x: scroll; */
/* } */
/* .splitpanes--vertical > div { */
/*   overflow-y: hidden; */
/*   overflow-x: scroll; */
/* } */

.splitpanes--vertical > .splitpanes__splitter::before {
  left: var(--grab-size);
  right: var(--grab-size);
  height: 100%;
}

.splitpanes--horizontal > .splitpanes__splitter::before {
  top: var(--grab-size);
  bottom: var(--grab-size);
  width: 100%;
}

.splitpanes__splitter::before {
  position: absolute;
  inset: 0;
  content: '';
  transition: background-color 0.25s ease-out;
  z-index: 10000;
}

/* .splitpanes--dragging .splitpanes__splitter::before, */
.splitpanes__splitter:hover::before {
  /* background-color: color-mix(in hsl, var(--ui-text) 20%, transparent); */
  background-color: color-mix(in srgb, var(--ui-text) 20%, transparent);
  opacity: 1;
}
</style>
