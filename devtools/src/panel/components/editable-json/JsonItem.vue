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
    <div class="flex items-center gap-2 py-0.5 hover:bg-gray-50 transition-colors">
      <ILucideChevronRight
        v-if="isExpandable"
        class="w-3 h-3 text-gray-500 transition-transform duration-200 cursor-pointer"
        :class="{ 'rotate-90': isExpanded }"
        @click="toggleExpansion"
      />

      <!-- Maintain alignment by adding left margin when chevron is absent -->
      <span
        class="text-blue-600 font-semibold"
        :class="{ 'ml-5': !isExpandable }"
      >
        {{ itemKey }}:
      </span>

      <!-- Value or Collection Label -->
      <span
        v-if="isExpandable"
        class="text-gray-500 text-xs cursor-pointer"
        @click="toggleExpansion"
      >
        {{ getCollectionLabel(value) }}
      </span>
      <span
        v-else
        :class="getValueTypeClass(value)"
        :title="formatValue(value)"
      >
        {{ formatValue(value) }}
      </span>

      <!-- Edit button -->
      <UButton v-if="isHovered && !isExpandable" size="xs">
        Edit
      </UButton>
    </div>

    <!-- Expanded children -->
    <template v-if="isExpandable && isExpanded">
      <JsonItem
        v-for="(childValue, childKey) in value"
        :key="childKey"
        :item-key="String(childKey)"
        :value="childValue"
        :depth="depth + 1"
      />
    </template>
  </div>
</template>
