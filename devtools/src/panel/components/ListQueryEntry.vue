<script setup lang="ts">
import { miniJsonParse } from '@pinia/colada-devtools/shared'
import type { UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { computed } from 'vue'
import { getQueryStatus, STATUS_COLOR_CLASSES } from '../utils/query-state'
import { useRouter } from 'vue-router'

const { entry } = defineProps<{
  entry: UseQueryEntryPayload
}>()
const router = useRouter()

function unselect(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  router.push('/queries')
}

// TODO: colorize the output based on the type of value
const formattedKey = computed(() => {
  return entry.key.map((rawValue) => {
    let value: unknown = rawValue
    try {
      value = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
    } catch {
      // If parsing fails, keep the original value
    }
    return value && typeof value === 'object' ? miniJsonParse(value) : String(value)
  })
})

const status = computed(() => getQueryStatus(entry))
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
      <div class="h-full w-1 relative">
        <div
          class="absolute -inset-1 right-0"
          :class="STATUS_COLOR_CLASSES[status].base"
          :title="status"
        />
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
        @click="isActive ? unselect($event) : navigate($event)"
      >
        <ol class="flex font-mono flex-grow gap-0.5 overflow-auto items-center">
          <template v-for="(key, i) in formattedKey" :key="key">
            <li class="text-wrap break-words rounded bg-(--ui-text)/5 px-0.5">{{ key }}</li>
            <li v-if="i < formattedKey.length - 1" aria-hidden="true">/</li>
          </template>
        </ol>
      </a>
    </div>
  </RouterLink>
</template>
