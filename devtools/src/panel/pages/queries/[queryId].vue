<script setup lang="ts">
import type { UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { computed } from 'vue'
import { useDuplexChannel, useQueryEntries } from '../../composables/duplex-channel'
import { useRoute } from 'vue-router'

const route = useRoute('/queries/[queryId]')
const queries = useQueryEntries()

// Selection management
const selectedQuery = computed<UseQueryEntryPayload | null>(() => {
  return queries.value.find((entry) => entry.id === route.params.queryId) ?? null
})

const channel = useDuplexChannel()
</script>

<template>
  <div class="flex flex-col divide-y divide-(--ui-border)">
    <template v-if="selectedQuery">
      <UCollapse title="Details">
        <div class="py-1 text-sm">
          <p class="grid grid-cols-[auto_1fr] gap-1">
            <span>key:</span>
            <span>
              <code class="rounded bg-neutral-500/20 p-0.5">{{ selectedQuery.key }}</code>
            </span>
          </p>
          <p class="grid grid-cols-[auto_1fr] gap-x-2">
            <span>Last update:</span>
            <span>{{ new Date(selectedQuery.devtools.updatedAt).toLocaleTimeString() }}</span>
          </p>
        </div>
      </UCollapse>

      <UCollapse title="Actions">
        <div class="py-2 flex gap-x-2">
          <UButton
            class="theme-info"
            size="xs"
            title="Refetch this query"
            @click="channel.emit('queries:refetch', selectedQuery.key)"
          >
            Refetch
          </UButton>

          <UButton
            class="theme-neutral"
            size="xs"
            title="Invalidate this query"
            @click="channel.emit('queries:invalidate', selectedQuery.key)"
          >
            Invalidate
          </UButton>

          <UButton
            class="theme-warning"
            size="xs"
            title="Simulate a loading state"
            @click="channel.emit('queries:set:asyncStatus', selectedQuery.key, 'loading')"
          >
            Simulate loading
          </UButton>

          <UButton
            class="theme-error"
            size="xs"
            title="Simulate an Error state"
            @click="
              channel.emit('queries:set:state', selectedQuery.key, {
                ...selectedQuery.state,
                status: 'error',
                error: new Error('Simulated error'),
              })
            "
          >
            Simulate error
          </UButton>
        </div>
      </UCollapse>

      <UCollapse title="Data">
        <div class="py-1">
          <pre class="rounded p-1 overflow-auto max-h-[1200px]">{{ selectedQuery.state.data }}</pre>
        </div>
      </UCollapse>

      <UCollapse title="Options" :open="false">
        <div class="py-1">
          <pre class="rounded bg-neutral-500/20 p-1 overflow-auto max-h-[1200px]">{{
            selectedQuery.options
          }}</pre>
        </div>
      </UCollapse>
    </template>

    <template v-else>
      <p>Select a Query</p>
    </template>
  </div>
</template>
