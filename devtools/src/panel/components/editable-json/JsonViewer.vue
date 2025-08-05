<script setup lang="ts">
import { formatValue, getValueTypeClass } from '../../utils/json'
import JsonItem from './JsonItem.vue'

defineProps<{
  data: unknown
}>()
</script>

<template>
  <!-- Handle arrays and objects -->
  <template v-if="data && (Array.isArray(data) || typeof data === 'object')">
    <JsonItem
      v-for="[key, value] in Object.entries(data)"
      :key="key"
      :item-key="key"
      :value="value"
      :depth="0"
    />
  </template>
  <!-- Handle primitive root values -->
  <template v-else>
    <span :class="getValueTypeClass(data)">{{ formatValue(data) }}</span>
  </template>
</template>
