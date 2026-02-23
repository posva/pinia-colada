<script setup lang="ts">
import type { UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { computed, watch } from 'vue'
import { useDuplexChannel, useQueryEntries } from '../../composables/duplex-channel'
import { formatDuration } from '../../utils/time'
import { useRoute } from 'vue-router'
import type { DataStateStatus } from '@pinia/colada'

import IWrench from '~icons/lucide/wrench'
import IInfoCircle from '~icons/lucide/info'
import IFileText from '~icons/lucide/file-text'
import ICircleX from '~icons/lucide/circle-x'
import IBraces from '~icons/lucide/braces'
import IHistory from '~icons/lucide/history'
import ISigmaSquare from '~icons/lucide/sigma-square'
import IPlugZap from '~icons/lucide/plug-zap'
import { useTimeAgo, formatTimeAgo, useLocalStorage } from '@vueuse/core'
import type { FormatTimeAgoOptions } from '@vueuse/core'

const route = useRoute()
const queries = useQueryEntries()

const selectedQuery = computed<UseQueryEntryPayload | null>(() => {
  return queries.value.find((entry) => entry.keyHash === route.params.queryId) ?? null
})

const TIME_AGO_OPTIONS: FormatTimeAgoOptions = {
  showSecond: true,
  rounding: 'floor',
  max: 1000 * 60 * 60 * 24, // 1 day
}

const lastUpdate = useTimeAgo(() => selectedQuery.value?.devtools.updatedAt ?? 0, {
  ...TIME_AGO_OPTIONS,
  updateInterval: 3000,
})

// TODO: we should be able to highlight components using this query
// const el = useTemplateRef('me')
// TODO: add ref="me" to the div
// watch(
//   // also trigger if the selectedQuery changes
//   () => [el.value, selectedQuery.value?.id] as const,
//   ([el]) => {
//     if (!el || !selectedQuery.value) return
//
//     const observingComponents = findVueComponents(
//       el,
//       selectedQuery.value.deps.filter((c) => c.type === 'component').map((c) => c.uid) ?? [],
//     )
//
//     console.log('elements', observingComponents)
//   },
// )

const channel = useDuplexChannel()

const isDataOpen = useLocalStorage<boolean>('pc:query:details:data:open', false, {})
let wasDataOpen = isDataOpen.value
let lastStatus: DataStateStatus | null = null
const isErrorOpen = useLocalStorage<boolean>('pc:query:details:error:open', false, {})
watch(
  () => selectedQuery.value?.state,
  (state) => {
    if (!state || lastStatus === state.status) return
    lastStatus = state.status
    if (state.status === 'error') {
      isErrorOpen.value = true
      // preserve it for later
      wasDataOpen = isDataOpen.value
      isDataOpen.value = false
    } else if (state.status === 'success') {
      isDataOpen.value = wasDataOpen
      isErrorOpen.value = false
    }
  },
)

// Helper function to set nested value
function setNestedValue(obj: any, path: Array<string | number>, value: unknown): boolean {
  if (path.length === 0) {
    console.error('Cannot set value with empty path')
    return false
  }

  let current = obj
  // Navigate to parent of target value
  for (let i = 0; i < path.length - 1; i++) {
    if (current == null || typeof current !== 'object') {
      console.error('Invalid path:', path, 'at index', i, 'Current value:', current)
      return false
    }
    current = current[path[i]!]
  }

  // Validate the final parent exists
  if (current == null || typeof current !== 'object') {
    console.error('Invalid final parent in path:', path)
    return false
  }

  // Set the final value
  current[path.at(-1)!] = value
  return true
}

// Handle value updates from JsonViewer
const handleValueUpdate = (path: Array<string | number>, value: unknown) => {
  if (!selectedQuery.value) return

  // Update the value at the path
  const success = setNestedValue(selectedQuery.value.state.data, path, value)

  if (!success) {
    console.error('Failed to update value at path:', path)
    return
  }

  // Send to app via RPC
  channel.emit('queries:set:state', selectedQuery.value.key, selectedQuery.value.state)
}
</script>

<template>
  <div class="flex flex-col divide-y dark:divide-(--ui-border) divide-(--ui-border-accented)">
    <template v-if="selectedQuery">
      <UCollapse title="Details" :icon="IInfoCircle">
        <div class="py-1 text-sm">
          <p class="grid grid-cols-[auto_1fr] gap-1">
            <span>key:</span>
            <span>
              <code class="rounded bg-neutral-500/20 p-0.5">{{ selectedQuery.key }}</code>
            </span>
          </p>

          <p
            class="grid grid-cols-[auto_1fr] gap-x-2"
            title="When was the query entry last updated"
          >
            <span>Last update:</span>
            <span class="font-bold">{{ lastUpdate }}</span>
          </p>

          <p
            v-if="selectedQuery.devtools.history.at(0)?.fetchTime"
            class="grid grid-cols-[auto_1fr] gap-x-2"
            title="When was the last time the query was fetched"
          >
            <span>Last fetch:</span>
            <span class="font-bold">{{
              formatTimeAgo(new Date(selectedQuery.devtools.history.at(0)!.fetchTime!.start), {
                ...TIME_AGO_OPTIONS,
                max: undefined,
              })
            }}</span>
          </p>

          <p
            v-if="selectedQuery.devtools.history.at(0)?.fetchTime?.end"
            class="grid grid-cols-[auto_1fr] gap-x-2"
            title="How long did the last query take to fetch"
          >
            <span>Fetch duration:</span>
            <span class="font-bold">{{
              formatDuration(
                selectedQuery.devtools.history.at(0)!.fetchTime!.end! -
                  selectedQuery.devtools.history.at(0)!.fetchTime!.start,
              )
            }}</span>
          </p>

          <p
            class="grid grid-cols-[auto_1fr] gap-x-2"
            title="How many components and effects are using this query"
          >
            <span
              >Observers: <span class="font-bold">{{ selectedQuery.deps.length }}</span></span
            >
          </p>

          <p
            v-if="!selectedQuery.active && selectedQuery.options"
            class="grid grid-cols-[auto_1fr] gap-x-2"
            title="When is this query entry garbace collected"
          >
            <template
              v-if="
                typeof selectedQuery.options.gcTime === 'number' &&
                Number.isFinite(selectedQuery.options.gcTime)
              "
            >
              <span>Will be <i>gced</i></span>
              <span class="font-bold">{{
                formatTimeAgo(
                  new Date(selectedQuery.devtools.inactiveAt + selectedQuery.options.gcTime),
                  {
                    ...TIME_AGO_OPTIONS,
                    max: undefined,
                  },
                )
              }}</span>
            </template>
          </p>
        </div>
      </UCollapse>

      <UCollapse
        v-if="Object.keys(selectedQuery.plugins).length"
        title="Plugins"
        :icon="IPlugZap"
        :open="true"
      >
        <div class="py-1 space-y-1">
          <UCollapse
            v-for="(data, name) in selectedQuery.plugins"
            :key="name"
            :title="String(name)"
            :open="true"
            no-padding
            class="rounded border border-(--ui-border) overflow-hidden"
          >
            <JsonViewer :data="data" readonly />
          </UCollapse>
        </div>
      </UCollapse>

      <UCollapse title="Actions" :icon="IWrench">
        <div class="py-2 gap-2 flex flex-wrap items-center justify-items-start">
          <UButton
            class="theme-info"
            size="sm"
            title="Refetch this query"
            :disabled="selectedQuery.options?.enabled === false"
            @click="channel.emit('queries:refetch', selectedQuery.key)"
          >
            <i-lucide-refresh-cw class="size-3.5" /> Refetch
          </UButton>

          <UButton
            class="theme-neutral"
            size="sm"
            title="Invalidate this query"
            @click="channel.emit('queries:invalidate', selectedQuery.key)"
          >
            <i-lucide-timer-reset /> Invalidate
          </UButton>

          <UButton
            v-if="selectedQuery.devtools.simulate !== 'loading'"
            class="theme-purple"
            size="sm"
            title="Restore the previous state"
            @click="channel.emit('queries:simulate:loading', selectedQuery.key)"
          >
            <i-lucide-loader />
            Simulate loading
          </UButton>
          <UButton
            v-else
            class="theme-purple"
            size="sm"
            title="Simulate a loading state"
            @click="channel.emit('queries:simulate:loading:stop', selectedQuery.key)"
          >
            <i-lucide-loader class="animate-spin" />
            Stop loading
          </UButton>

          <UButton
            v-if="selectedQuery.devtools.simulate !== 'error'"
            class="theme-error"
            size="sm"
            title="Simulate an Error state"
            @click="channel.emit('queries:simulate:error', selectedQuery.key)"
          >
            <i-lucide-x-octagon /> Simulate error
          </UButton>
          <UButton
            v-else
            class="theme-error"
            size="sm"
            title="Restore the previous state"
            @click="channel.emit('queries:simulate:error:stop', selectedQuery.key)"
          >
            <i-lucide-rotate-ccw /> Remove error
          </UButton>

          <UButton
            class="theme-warning"
            size="sm"
            title="Reset this query to its initial (pending) state"
            @click="channel.emit('queries:reset', selectedQuery.key)"
          >
            <i-lucide-trash /> Reset
          </UButton>
        </div>
      </UCollapse>

      <UCollapse
        v-model:open="isDataOpen"
        :title="`Data${selectedQuery.state.data === undefined ? ' (empty)' : ''}`"
        :icon="IFileText"
        :class="[selectedQuery.state.data === undefined && 'text-(--ui-text-muted)']"
        no-padding
      >
        <JsonViewer :data="selectedQuery.state.data" @update:value="handleValueUpdate" />
      </UCollapse>

      <UCollapse
        v-model:open="isErrorOpen"
        :title="`Error${selectedQuery.state.status === 'error' ? ' (!)' : '(empty)'}`"
        :icon="ICircleX"
        :class="[selectedQuery.state.status !== 'error' && 'text-(--ui-text-muted)']"
        disabled
      >
        <div class="py-1">
          <pre v-if="selectedQuery.state.error" class="rounded p-1 overflow-auto max-h-[1200px]">{{
            selectedQuery.state.error
          }}</pre>
          <p v-else class="text-(--ui-text-muted)/50">No error</p>
        </div>
      </UCollapse>

      <UCollapse title="Call count" :icon="ISigmaSquare" :open="false">
        <div class="py-1">
          <p class="grid grid-cols-[auto_1fr] gap-1">
            <span>Calls:</span>
            <span>
              <code class="font-bold">{{ selectedQuery.devtools.count.total }}</code>
            </span>
            <span>Success:</span>
            <span>
              <code class="font-bold">{{ selectedQuery.devtools.count.succeed }}</code>
            </span>
            <span>Errors:</span>
            <span>
              <code class="font-bold">{{ selectedQuery.devtools.count.errored }}</code>
            </span>
            <span>Cancelled:</span>
            <span>
              <code class="font-bold">{{ selectedQuery.devtools.count.cancelled }}</code>
            </span>
          </p>
        </div>
      </UCollapse>

      <UCollapse
        :title="`History (${selectedQuery.devtools.history.length})`"
        :icon="IHistory"
        :open="false"
      >
        <div class="py-1">
          <UCollapse
            v-for="entry of selectedQuery.devtools.history"
            :key="entry.updatedAt"
            :title="`Entry nº${entry.id} (${formatTimeAgo(new Date(entry.updatedAt), TIME_AGO_OPTIONS)})`"
            :open="false"
            class="border border-neutral-200 dark:border-neutral-800"
          >
            <JsonViewer :data="entry" readonly />
          </UCollapse>
        </div>
      </UCollapse>

      <UCollapse title="Options" :open="!selectedQuery.options" :icon="IBraces" no-padding>
        <JsonViewer v-if="selectedQuery.options" :data="selectedQuery.options" readonly />
        <p v-else>
          This Query entry has no options. It might have been created from the server or manually
          set with
          <code>queryCache.setQueryData()</code> for prefetching.
        </p>
      </UCollapse>
    </template>

    <template v-else>
      <div class="py-6 mx-auto">
        <p class="flex flex-col text-center items-center gap-2 text-lg px-2">
          Select a Query to inspect
          <i-lucide-mouse-pointer-click />
        </p>
        <p class="text-center text-sm text-neutral-500 mt-4">
          No query with key {{ route.params.queryId }} was found in the cache
        </p>
      </div>
    </template>
  </div>
</template>
