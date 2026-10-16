<script setup lang="ts">
import { getValueDetails } from '@pinia/colada-devtools/shared'
import { computed } from 'vue'
import JsonViewer from './editable-json/JsonViewer.vue'

const { error } = defineProps<{ error: unknown }>()

const isErrorInstance = computed(() => error instanceof Error)

const details = computed(() => {
  const details = { ...getValueDetails(error) }
  // shown above the tree because the tree renders strings on a single line
  delete details.stack
  return details
})
</script>

<template>
  <template v-if="isErrorInstance">
    <pre class="rounded p-1 overflow-auto max-h-[1200px]">{{
      (error as Error).stack || String(error)
    }}</pre>
    <JsonViewer :data="details" readonly />
  </template>
  <JsonViewer v-else :data="error" readonly />
</template>
