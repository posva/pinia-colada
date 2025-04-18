<script setup lang="ts">
import type { UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { computed, ref, watch } from 'vue'
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
import { useTimeAgo, formatTimeAgo } from '@vueuse/core'
import type { FormatTimeAgoOptions } from '@vueuse/core'

const route = useRoute('/queries/[queryId]')
const queries = useQueryEntries()

const selectedQuery = computed<UseQueryEntryPayload | null>(() => {
  return queries.value.find((entry) => entry.id === route.params.queryId) ?? null
})

const TIME_AGO_OPTIONS: FormatTimeAgoOptions = {
  showSecond: true,
  rounding: 'floor',
  max: 1000 * 60 * 5, // 5 minutes
}

const lastUpdate = useTimeAgo(() => selectedQuery.value?.devtools.updatedAt ?? 0, {
  ...TIME_AGO_OPTIONS,
  updateInterval: 3_000,
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

const isDataOpen = ref(false)
let wasDataOpen = isDataOpen.value
let lastStatus: DataStateStatus | null = null
const isErrorOpen = ref(false)
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
                  new Date(selectedQuery.devtools.updatedAt + selectedQuery.options.gcTime),
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

      <UCollapse v-model:open="isDataOpen" title="Data" :icon="IFileText">
        <div class="py-1">
          <pre
            v-if="selectedQuery.state.data !== undefined"
            class="rounded p-1 overflow-auto max-h-[1200px]"
            >{{ selectedQuery.state.data }}</pre
          >
          <p v-else class="text-neutral-500/50">No data</p>
        </div>
      </UCollapse>

      <UCollapse v-model:open="isErrorOpen" title="Error" :icon="ICircleX">
        <div class="py-1">
          <pre v-if="selectedQuery.state.error" class="rounded p-1 overflow-auto max-h-[1200px]">{{
            selectedQuery.state.error
          }}</pre>
          <p v-else class="text-neutral-500/50">No error</p>
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

      <UCollapse title="History" :icon="IHistory" :open="false">
        <div class="py-1">
          <UCollapse
            v-for="(entry, i) of selectedQuery.devtools.history"
            :key="entry.updatedAt"
            :title="`Entry ${i} (${formatTimeAgo(new Date(entry.updatedAt), TIME_AGO_OPTIONS)})`"
            :open="false"
          >
            <pre class="rounded p-1 overflow-auto max-h-[1200px]">{{ entry }}</pre>
          </UCollapse>
        </div>
      </UCollapse>

      <UCollapse title="Options" :open="false" :icon="IBraces">
        <div class="py-1">
          <pre class="rounded bg-neutral-500/20 p-1 overflow-auto max-h-[1200px]">{{
            selectedQuery.options
          }}</pre>
        </div>
      </UCollapse>
    </template>

    <template v-else>
      <div class="py-6 mx-auto">
        <p class="flex flex-col text-center items-center gap-2 text-lg px-2">
          Select a Query to inspect
          <i-lucide-mouse-pointer-click />
        </p>
      </div>
    </template>
  </div>
</template>
