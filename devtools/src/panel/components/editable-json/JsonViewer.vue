<script setup lang="ts">
import { isJSONPrimitive, formatValue, getValueTypeClass } from '../../utils/json'
import type { JSONValue } from '../../utils/json'
import JsonItem from './JsonItem.vue'

 defineProps<{
  data: JSONValue
}>()
</script>

<template>
  <!-- Handle primitive root values -->
  <div v-if="isJSONPrimitive(data)" class="text-sm px-3 py-0.5">
    <span :class="getValueTypeClass(data)">{{ formatValue(data) }}</span>
  </div>

  <!-- Handle arrays and objects -->
  <template v-else-if="Array.isArray(data) || typeof data === 'object'">
    <JsonItem
      v-for="([key, value]) in Object.entries(data)"
      :key="key"
      :item-key="key"
      :value="value"
      :depth="0"
    />
  </template>
</template>
