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
import { isPlainObject } from '@pinia/colada-devtools/shared'
import { computed } from 'vue'
import type { NestedValuePath } from '../../utils/set-nested-value'
import JsonItem from './JsonItem.vue'
import ValueDisplay from './ValueDisplay.vue'

const props = defineProps<{
  data: unknown
  readonly?: boolean
}>()

const keyValuePairs = computed<Iterable<[unknown, unknown]>>(() => {
  if (Array.isArray(props.data)) return props.data.entries()
  if (isPlainObject(props.data)) return Object.entries(props.data)
  if (props.data instanceof Map) return props.data.entries()
  if (props.data instanceof Set) {
    return Array.from(props.data, (value, index) => [index, value] as const)
  }
  return []
})

const emit = defineEmits<{
  'update:value': [path: NestedValuePath, value: unknown]
}>()
</script>

<template>
  <!-- Handle expandable items -->
  <template v-if="isExpandable(data)">
    <JsonItem
      class="font-mono"
      v-for="([key, value], index) in keyValuePairs"
      :key="index"
      :item-key="String(key)"
      :value="value"
      :depth="0"
      :path="[key]"
      :readonly
      @update:value="(...args) => emit('update:value', ...args)"
    />
  </template>
  <!-- Handle primitive root values -->
  <template v-else>
    <span class="font-mono"><ValueDisplay :value="data" /></span>
  </template>
</template>
