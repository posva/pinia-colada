<script setup lang="ts">
import { ref, computed } from 'vue'
import { isObject } from '@vueuse/core'
import type { JSONValue } from '../../utils/json'
import { formatValue, getValueTypeClass } from '../../utils/json'

const props = defineProps<{
  itemKey: string
  value: JSONValue
  depth: number
}>()

const isExpanded = ref(false)
const isHovered = ref(false)

const isExpandable = computed(() => {
  return (
    (Array.isArray(props.value) && props.value.length > 0) ||
    (isObject(props.value) && Object.keys(props.value).length > 0))
})

function toggleExpansion() {
  isExpanded.value = !isExpanded.value
}

function handleMouseEnter() {
  isHovered.value = true
}

function handleMouseLeave() {
  isHovered.value = false
}

 function getCollectionLabel(value: unknown): string {
  if (Array.isArray(value)) {
    return `Array[${value.length}]`
  }
  if (isObject(value) && value !== null) {
    return 'Object'
  }
  return ''
}
</script>

<template>
  <div
    class="text-sm mb-1"
    :style="{ paddingLeft: `${depth * 20}px` }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Expandable items (Arrays and Objects) -->
    <div v-if="isExpandable" class="px-3">
      <div
        class="flex items-center gap-2 px-1 py-0.5 mb-1 cursor-pointer hover:bg-theme/10 theme-neutral transition-colors"
        @click="toggleExpansion"
      >
        <ILucideChevronRight
          class="w-3 h-3 text-gray-500 transition-transform duration-200"
          :class="{ 'rotate-90': isExpanded }"
        />
        <span class="text-blue-600 font-semibold">{{ itemKey }}:</span>
        <span class="text-gray-500 text-xs">{{ getCollectionLabel(value) }}</span>
      </div>

      <!-- Recursive children - iterate directly over the value -->
      <div v-if="isExpanded">
        <JsonItem
          v-for="(childValue, childKey) in value"
          :key="childKey"
          :item-key="String(childKey)"
          :value="childValue"
          :depth="depth + 1"
        />
      </div>
    </div>

    <!-- Non-expandable items (primitives) -->
    <div v-else class="flex items-center gap-2 px-3 py-0.5 hover:bg-gray-50 transition-colors">
      <div class="flex items-center gap-2">
        <span class="text-purple-600 font-semibold">{{ itemKey }}:</span>
        <span :class="getValueTypeClass(value)" :title="formatValue(value)">
          {{ formatValue(value) }}
        </span>
      </div>

      <!-- Edit button -->
      <UButton v-if="isHovered" size="xs">
        Edit
      </UButton>
    </div>
  </div>
</template>
