<script setup lang="ts">
import { ref, computed } from 'vue'
import type { JSONValue } from '@pinia/colada-devtools/shared'
import { formatValue, getValueTypeClass, isPlainObject } from '@pinia/colada-devtools/shared'

const props = defineProps<{
  itemKey: string
  value: JSONValue | Map<PropertyKey, any> | Set<unknown>
  depth: number
}>()

const isExpanded = ref(false)

const isExpandable = computed(() => {
  const { value } = props
  return (
    (Array.isArray(value) && value.length > 0) ||
    (isPlainObject(value) && Object.keys(value).length > 0) ||
    (value instanceof Map && value.size > 0) ||
    (value instanceof Set && value.size > 0)
  )
})

const keyValuePairs = computed<Iterable<[PropertyKey, any]>>(() => {
  const { value } = props
  if (Array.isArray(value)) {
    return value.map((v, i) => [i, v] as const)
  } else if (isPlainObject(value)) {
    return Object.entries(value)
  } else if (value instanceof Map) {
    return value.entries()
  } else if (value instanceof Set) {
    return Array.from(value).map((v, i) => [i, v] as const)
  }
  return []
})

function toggleExpansion() {
  if (!isExpandable.value) return
  isExpanded.value = !isExpanded.value
}

// TODO: rework the indentation of nested items, it's currently bugged: it increases too much and is too small at the beginning
</script>

<template>
  <div
    :style="{ paddingLeft: `${depth * 0.35}em` }"
    class="ring-(--ui-bg-muted)"
    :class="{
      'hover:ring': isExpandable,
      'rounded-tl': depth > 0,
    }"
  >
    <div
      class="flex items-center gap-2 py-0.5 bg-transparent hover:bg-(--ui-bg-muted) duration-200 transition-colors"
      :class="depth > 0 && 'rounded-l'"
    >
      <ILucideChevronRight
        v-if="isExpandable"
        class="size-3 text-(--ui-text-dimmed) transition-transform duration-200 cursor-pointer"
        :class="{ 'rotate-90': isExpanded }"
        @click="toggleExpansion"
      />

      <!-- Maintain alignment by adding left margin when chevron is absent -->
      <span class="text-(--devtools-syntax-gray)" :class="!isExpandable && 'ml-5'">
        {{ itemKey }}:
      </span>

      <!-- Value or Collection Label -->
      <span
        :class="[getValueTypeClass(value), isExpandable && 'cursor-pointer']"
        :title="isExpandable ? 'Click to expand' : undefined"
        @click="toggleExpansion"
      >
        {{ formatValue(value) }}
      </span>

      <!-- Edit button -->
      <!-- <UButton v-if="isHovered && !isExpandable" size="xs"> -->
      <!--   Edit -->
      <!-- </UButton> -->
    </div>

    <!-- Expanded children -->
    <template v-if="isExpandable && isExpanded">
      <JsonItem
        v-for="[childKey, childValue] of keyValuePairs"
        :key="childKey"
        :item-key="String(childKey)"
        :value="childValue"
        :depth="depth + 1"
      />
    </template>
  </div>
</template>
