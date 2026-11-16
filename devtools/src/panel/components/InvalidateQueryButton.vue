<script setup lang="ts">
import type { EntryKey } from '@pinia/colada'
import { computed } from 'vue'
import UButton from './UButton.vue'
import ILucideTimerReset from '~icons/lucide/timer-reset'
import ILucideChevronDown from '~icons/lucide/chevron-down'
import { useFormattedKey } from '../composables/entries'
import { panelChannel } from '../panel-channel'

const { entryKey } = defineProps<{
  entryKey: EntryKey
}>()

const formattedKey = useFormattedKey(() => entryKey)
// every key from the root to the full key: users, users / 2, users / 2 / posts
const keyPrefixes = computed(() =>
  formattedKey.value.map((_, i) => formattedKey.value.slice(0, i + 1).join(' / ')),
)

function invalidateUpTo(event: Event) {
  const select = event.currentTarget as HTMLSelectElement
  const length = Number(select.value)
  // go back to the placeholder so the same key can be picked again
  select.value = ''
  return panelChannel.call('queries:invalidate', { key: entryKey.slice(0, length) })
}
</script>

<template>
  <div class="flex">
    <UButton
      class="theme-neutral rounded-r-none"
      size="sm"
      title="Invalidate this query"
      @click="panelChannel.call('queries:invalidate', { key: entryKey, exact: true })"
    >
      <ILucideTimerReset /> Invalidate
    </UButton>
    <label
      class="theme-neutral relative flex items-center px-0.5 rounded-r-sm border-l border-gray-900/20 bg-theme-400 hover:bg-theme-600 dark:hover:bg-theme-300 text-gray-900 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-theme"
      title="Invalidate every query under a key"
    >
      <ILucideChevronDown class="size-3.5" aria-hidden="true" />
      <select
        class="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Invalidate every query under a key"
        @change="invalidateUpTo"
      >
        <option value="" disabled selected>Invalidate every query under:</option>
        <option v-for="(label, i) in keyPrefixes" :key="i" :value="i + 1">{{ label }}</option>
      </select>
    </label>
  </div>
</template>
