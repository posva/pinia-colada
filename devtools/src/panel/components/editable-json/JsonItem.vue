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
    (isObject(props.value) && Object.keys(props.value).length > 0)
  )
})

function toggleExpansion() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div
    :style="{ paddingLeft: `${depth * 0.35}em` }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="flex items-center gap-2 py-0.5 hover:bg-(--ui-bg-muted) transition-colors rounded">
      <ILucideChevronRight
        v-if="isExpandable"
        class="size-3 text-(--ui-text-dimmed) transition-transform duration-200 cursor-pointer"
        :class="{ 'rotate-90': isExpanded }"
        @click="toggleExpansion"
      />

      <!-- Maintain alignment by adding left margin when chevron is absent -->
      <span class="text-(--devtools-syntax-gray)" :class="!isExpandable && 'ml-5'"> {{ itemKey }}: </span>

      <!-- Value or Collection Label -->
      <span
        v-if="isExpandable"
        class="text-(--ui-text-dimmed) text-xs cursor-pointer"
        @click="toggleExpansion"
      >
        {{ formatValue(value) }}
      </span>
      <span v-else :class="getValueTypeClass(value)" :title="formatValue(value)">
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
