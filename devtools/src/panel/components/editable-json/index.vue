<script setup lang="ts">
import type { JSONValue } from '../../utils/json'

defineProps<{
  data: JSONValue
}>()
</script>

<template>
  <div class="mt-2 rounded font-mono text-sm">
    <JsonViewer :data="data" />
  </div>
</template>
