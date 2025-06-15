<script setup lang="ts">
import type { JSONValue } from '../../utils/json'

defineProps<{
  data: JSONValue
}>()
</script>

<template>
  <div v-if="data" class="rounded font-mono text-sm">
    <JsonViewer :data="data" />
  </div>
  <p v-else class="text-neutral-500/50">
    No data
  </p>
</template>
