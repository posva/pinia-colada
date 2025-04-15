<script setup lang="ts">
import { miniJsonParse } from '@pinia/colada-devtools/shared'
import type { UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { computed } from 'vue'

const { entry } = defineProps<{
  entry: UseQueryEntryPayload
}>()

// TODO: colorize the output based on the type of value
const formattedKey = computed(() => {
  return entry.key.map((rawValue) => {
    let value: unknown = rawValue
    try {
      value = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
    } catch (_e) {
      // If parsing fails, keep the original value
    }
    return value && typeof value === 'object' ? miniJsonParse(value) : String(value)
  })
})

const status = computed(() => {
  if (entry.asyncStatus === 'loading') {
    return 'loading'
  }
  if (entry.state.status === 'error') {
    return 'error'
  }
  if (entry.stale) {
    return 'stale'
  }
  if (entry.state.status === 'success') {
    return 'success'
  }
  if (entry.state.status === 'pending') {
    return 'pending'
  }

  return 'unknown'
})
</script>

<template>
  <RouterLink
    v-slot="{ isActive, navigate, href }"
    :to="{ name: '/queries/[queryId]', params: { queryId: entry.id } }"
    custom
  >
    <div
      class="grid grid-cols-[minmax(0,auto)_1fr] grid-flow-col items-center gap-x-1 p-1 pr-3 relative"
      :class="[
        isActive ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-(--ui-bg-elevated)',
        entry.active ? '' : 'text-(--ui-text)/50',
      ]"
    >
      <div
        class="h-full w-1 relative"
        :class="{
          'theme-neutral': status === 'loading',
          'theme-success': status === 'success',
          'theme-error': status === 'error',
          'theme-info': status === 'stale',
          'theme-warning': status === 'pending',
        }"
      >
        <div class="absolute -inset-1 bg-theme right-0" :title="status" />
        <!-- <i-carbon-intent-request-inactive -->
        <!--   v-if="status === 'loading'" -->
        <!--   class="animate-spin" -->
        <!-- /> -->
        <!-- <i-carbon-warning v-else-if="status === 'error'" class="" /> -->
        <!-- <i-carbon-checkmark v-else-if="status === 'stale' || status === 'success'" class="" /> -->
      </div>

      <a
        :href
        class="hover:cursor-pointer block overflow-hidden"
        :title="entry.active ? 'Active query' : 'Inactive query'"
        @click="navigate"
      >
        <ol class="flex font-mono flex-grow gap-0.5 overflow-auto items-center">
          <template v-for="(key, i) in formattedKey" :key="key">
            <li class="text-wrap break-words rounded bg-(--ui-text)/5 px-0.5">{{ key }}</li>
            <li v-if="i < formattedKey.length - 1" aria-hidden="true">/</li>
          </template>
        </ol>
      </a>

      <span
        class="bg-neutral-200 text-(--ui-text) dark:bg-neutral-800 rounded w-4 text-center text-sm ring-inset ring ring-(--ui-text)/30"
        title="Amount of times this query has ran"
        >{{ entry.devtools.count.total }}</span
      >
    </div>
  </RouterLink>
</template>
