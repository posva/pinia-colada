<script lang="ts">
function isExpandable(
  value: unknown,
): value is unknown[] | Record<string, unknown> | Map<unknown, unknown> | Set<unknown> {
  return (
    !!value &&
    (Array.isArray(value) || isPlainObject(value) || value instanceof Map || value instanceof Set)
  )
}
</script>

<script setup lang="ts">
import { formatValue, getValueTypeClass, isPlainObject } from '@pinia/colada-devtools/shared'
import JsonItem from './JsonItem.vue'

defineProps<{
  data: unknown
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:value': [path: Array<string | number>, value: unknown]
}>()
</script>

<template>
  <!-- Handle expandable items -->
  <template v-if="isExpandable(data)">
    <JsonItem
      class="font-mono"
      v-for="[key, value] in Object.entries(data)"
      :key="key"
      :item-key="key"
      :value="value"
      :depth="0"
      :path="[key]"
      :readonly
      @update:value="(...args) => emit('update:value', ...args)"
    />
  </template>
  <!-- Handle primitive root values -->
  <template v-else>
    <span class="font-mono" :class="getValueTypeClass(data)">{{ formatValue(data) }}</span>
  </template>
</template>
