<script setup lang="ts">
import { isJSONPrimitive, formatValue, getValueTypeClass } from '../../utils/json'
import type { JSONValue } from '../../utils/json'
import JsonItem from './JsonItem.vue'

 defineProps<{
  data: JSONValue
}>()
</script>

<template>
  <div>
    <!-- Handle primitive root values -->
    <div v-if="isJSONPrimitive(data)" class="text-sm px-3 py-0.5">
      <span :class="getValueTypeClass(data)">{{ formatValue(data) }}</span>
    </div>

    <!-- Handle arrays -->
    <template v-else-if="Array.isArray(data)">
      <JsonItem
        v-for="(value, index) in data"
        :key="index"
        :item-key="String(index)"
        :value="value"
        :depth="0"
      />
    </template>

    <!-- Handle objects -->
    <template v-else-if="data && typeof data === 'object'">
      <JsonItem
        v-for="(value, key) in data"
        :key="key"
        :item-key="String(key)"
        :value="value"
        :depth="0"
      />
    </template>
  </div>
</template>
