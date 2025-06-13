<script setup lang="ts">
 import type { UseQueryEntry } from '@pinia/colada'

type QueryData = UseQueryEntry['state']['value']['data']

  defineProps<{
  data?: QueryData
}>()
</script>

<template>
  <div v-if="data" class="bg-neutral-100 rounded p-4 font-mono text-sm">
    <JsonViewer :data="data" />
  </div>
  <p v-else class="text-neutral-500/50">
    No data
  </p>
</template>
