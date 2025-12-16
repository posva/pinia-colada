<script setup lang="ts">
import type { UseMutationEntryPayload } from '@pinia/colada-devtools/shared'
import { computed } from 'vue'
import { getMutationStatus, STATUS_COLOR_CLASSES } from '../utils/mutation-state'
import { useRouter } from 'vue-router'
import { usePerformanceNow } from '../composables/performance-now'
import { useFormattedKey } from '../composables/entries'

const { entry } = defineProps<{
  entry: UseMutationEntryPayload
}>()
const router = useRouter()
const now = usePerformanceNow()

function unselect(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  router.push('/mutations')
}

const formattedKey = useFormattedKey(() => entry.key)
const isAnonymous = computed(() => !entry.key)
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
          <i-lucide-check
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
          <i-lucide-circle
            v-else-if="status === 'inactive'"
            title="Inactive"
            aria-label="Inactive icon"
          />
        </div>
      </div>

      <a
        :href
        class="hover:cursor-pointer block overflow-hidden"
        :title="`${isAnonymous ? 'Anonymous' : 'Mutation'} execution ${entry.id}`"
        @click="isActive ? unselect($event) : navigate($event)"
      >
        <div class="flex items-center gap-1.5">
          <ol class="flex font-mono grow gap-0.5 overflow-auto items-center" v-if="formattedKey">
            <template v-for="(key, i) in formattedKey" :key="i">
              <li class="text-wrap wrap-break-word rounded px-0.5 bg-(--ui-text)/5">
                {{ key }}
              </li>
              <li v-if="i < formattedKey.length - 1" aria-hidden="true">/</li>
            </template>
            <li class="text-xs text-(--ui-text-muted)">({{ entry.id }})</li>
          </ol>
          <div
            v-if="isAnonymous"
            class="grid grid-cols-[auto_auto_1fr] gap-1.5 items-center w-full"
          >
            <i-lucide-file-question class="text-(--ui-text-muted) grow" />
            <span class="text-xs">{{ entry.id }}</span>
            <span>
              <span class="font-mono rounded px-0.5 bg-(--ui-text)/8">{{
                new Date(entry.when).toISOString()
              }}</span>
            </span>
          </div>
        </div>
      </a>

      <div
        v-if="
          !entry.active &&
          entry.gcTimeout &&
          entry.devtools.inactiveAt &&
          typeof entry.options?.gcTime === 'number' &&
          Number.isFinite(entry.options.gcTime) &&
          entry.options.gcTime <= 30_000
        "
        title="This mutation will be garbage collected"
      >
        <UCircleProgress
          class="size-[1em] dark:text-neutral-500 text-neutral-400"
          :max="entry.options.gcTime"
          :value="entry.devtools.inactiveAt + entry.options.gcTime - now"
        />
      </div>
    </div>
  </RouterLink>
</template>
