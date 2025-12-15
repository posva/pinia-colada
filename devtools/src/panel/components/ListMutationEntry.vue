<script setup lang="ts">
import { miniJsonParse } from '@pinia/colada-devtools/shared'
import type { UseMutationEntryPayload } from '@pinia/colada-devtools/shared'
import { computed } from 'vue'
import { getMutationStatus, STATUS_COLOR_CLASSES } from '../utils/mutation-state'
import { useRouter } from 'vue-router'

const { entry } = defineProps<{
  entry: UseMutationEntryPayload
}>()
const router = useRouter()

function unselect(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  router.push('/mutations')
}

const formattedKey = computed(() => {
  if (!entry.key) return ['<anonymous>']

  return entry.key.map((rawValue) => {
    let value: unknown = rawValue
    try {
      value = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
    } catch {
      // Keep original value if parsing fails
    }
    return value && typeof value === 'object' ? miniJsonParse(value) : String(value)
  })
})

const isAnonymous = computed(() => {
  // No key means anonymous
  if (!entry.key) return true

  // If the key only contains the ID (e.g., ["$0"]), it's effectively anonymous
  return entry.key.length === 1 && entry.key[0] === entry.id
})

const status = computed(() => getMutationStatus(entry))
</script>

<template>
  <RouterLink
    v-slot="{ isActive, navigate, href }"
    :to="{ name: '/mutations/[mutationId]', params: { mutationId: entry.id } }"
    custom
  >
    <div
      class="grid grid-cols-[minmax(0,auto)_1fr] grid-flow-col items-center gap-x-2 p-1 relative text-sm @container"
      :class="[isActive ? 'bg-neutral-200 dark:bg-neutral-700' : 'hover:bg-(--ui-bg-elevated)']"
    >
      <div class="h-full w-6 relative">
        <div
          class="absolute -inset-1 right-0 flex items-center justify-center"
          :class="STATUS_COLOR_CLASSES[status].base"
          :title="status"
        >
          <i-lucide-loader v-if="status === 'loading'" title="Loading" aria-label="Loading icon" />
          <i-lucide-check-check
            v-else-if="status === 'success'"
            title="Success"
            aria-label="Success icon"
          />
          <i-lucide-x-octagon
            v-else-if="status === 'error'"
            title="Error"
            aria-label="Error icon"
          />
          <i-lucide-pause
            v-else-if="status === 'pending'"
            title="Pending"
            aria-label="Pending icon"
          />
          <i-lucide-circle v-else-if="status === 'idle'" title="Idle" aria-label="Idle icon" />
        </div>
      </div>

      <a
        :href
        class="hover:cursor-pointer block overflow-hidden"
        :title="`${isAnonymous ? 'Anonymous' : 'Mutation'} execution ${entry.id}`"
        @click="isActive ? unselect($event) : navigate($event)"
      >
        <div class="flex items-center gap-1.5">
          <i-lucide-file-question
            v-if="isAnonymous"
            class="text-(--ui-text-muted)"
            title="Anonymous mutation"
          />
          <ol class="flex font-mono grow gap-0.5 overflow-auto items-center">
            <template v-for="(key, i) in formattedKey" :key="i">
              <li
                class="text-wrap wrap-break-words rounded px-0.5"
                :class="isAnonymous ? 'bg-(--ui-text)/10 italic' : 'bg-(--ui-text)/5'"
              >
                {{ key }}
              </li>
              <li v-if="i < formattedKey.length - 1" aria-hidden="true">/</li>
            </template>
          </ol>
        </div>
      </a>
    </div>
  </RouterLink>
</template>
