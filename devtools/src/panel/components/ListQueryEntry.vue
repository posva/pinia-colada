<script setup lang="ts">
import { miniJsonParse } from '@pinia/colada-devtools/shared'
import type { UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { computed } from 'vue'
import { getQueryStatus, STATUS_COLOR_CLASSES } from '../utils/query-state'
import { useRouter } from 'vue-router'
import { useNow } from '@vueuse/core'

const { entry } = defineProps<{
  entry: UseQueryEntryPayload
}>()
const router = useRouter()

const now = useNow({ interval: Math.max(100, (entry.options?.gcTime || 0) / 30) })

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
      class="grid grid-cols-[minmax(0,auto)_1fr] grid-flow-col items-center gap-x-2 p-1 relative text-sm @container"
      :class="[
        isActive ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-(--ui-bg-elevated)',
        entry.active ? '' : 'text-(--ui-text)/50',
      ]"
    >
      <div class="h-full w-6 relative">
        <div
          class="absolute -inset-1 right-0 flex items-center justify-center"
          :class="STATUS_COLOR_CLASSES[status].base"
          :title="status"
        >
          <i-lucide-loader v-if="status === 'loading'" title="Loading" aria-label="Loading icon" />
          <i-lucide-check-check
            v-else-if="status === 'fresh'"
            title="Fresh successful data"
            aria-label="Fresh successful data icon"
          />
          <i-lucide-x-octagon
            v-else-if="status === 'error'"
            title="Error"
            aria-label="Error icon"
          />
          <i-lucide-check v-else-if="status === 'stale'" title="Stale" aria-label="Stale icon" />
          <i-lucide-pause
            v-else-if="status === 'pending'"
            title="Pending"
            aria-label="Pending icon"
          />
        </div>
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

      <div v-if="entry.options?.enabled === false" title="This query is disabled">
        <span class="rounded bg-theme/70 theme-neutral p-0.5 text-xs flex gap-x-0.5 items-center">
          <i-lucide-circle-slash aria-hidden />
          <span class="@max-md:hidden">disabled</span>
        </span>
      </div>
      <div
        v-else-if="
          !entry.active
            && entry.gcTimeout
            && entry.devtools.inactiveAt
            && typeof entry.options?.gcTime === 'number'
            && Number.isFinite(entry.options.gcTime)
            && entry.options.gcTime <= 30_000
        "
        title="This query will be garbage collected"
      >
        <UCircleProgress
          class="size-[1em] dark:text-neutral-500 text-neutral-400"
          :max="entry.options.gcTime"
          :value="entry.devtools.inactiveAt + entry.options.gcTime - now.getTime()"
        />
      </div>
    </div>
  </RouterLink>
</template>
