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
</script>

<template>
  <RouterLink
    v-slot="{ isActive, navigate, href }"
    :to="{ name: '/queries.[[queryId]]', params: { queryId: entry.id } }"
    custom
  >
    <div
      class="grid grid-cols-[minmax(0,auto)_1fr] grid-flow-col items-center gap-x-2 p-1"
      :class="
        isActive ? 'bg-primary-300 dark:text-(--ui-text-inverted)' : 'hover:bg-(--ui-bg-elevated)'
      "
    >
      <!-- <div class="flex items-center gap-1"> -->
      <i-carbon-intent-request-inactive
        v-if="entry.asyncStatus === 'loading'"
        class="size-4 animate-spin"
      />
      <i-carbon-warning v-else-if="entry.stale" class="size-4" />
      <i-carbon-checkmark v-else class="size-4" />

      <a :href class="hover:cursor-pointer block" @click="navigate">
        <ol class="flex font-mono flex-grow">
          <li
            v-for="key of formattedKey"
            class="relative after:absolute after:inset-0 after:contents not-last:after:content-['/']"
          >
            {{ key }}
          </li>
        </ol>
      </a>

      <pre>{{ 7 }}</pre>
    </div>
  </RouterLink>
</template>
