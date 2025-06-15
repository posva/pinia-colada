<script setup lang="ts">
import { ref, computed } from 'vue'
import { isObject } from '@vueuse/core'
import { isJSONPrimitive, type JSONValue } from '../utils/json'

const props = defineProps<{
  data: JSONValue
}>()

const hoverStates = ref<Record<string, boolean>>({})
const expandedItems = ref<Set<string>>(new Set())

// Generate unique path for nested items
function generatePath(parentPath: string, key: string): string {
  return parentPath ? `${parentPath}.${key}` : key
}

function handleMouseEnter(path: string) {
  hoverStates.value[path] = true
}

function handleMouseLeave(path: string) {
  hoverStates.value[path] = false
}

function isHovered(path: string) {
  return hoverStates.value[path]
}

function isExpandable(value: unknown): boolean {
  return (
    (Array.isArray(value) && value.length > 0)
    || (isObject(value) && value !== null && Object.keys(value).length > 0)
  )
}

function isExpanded(path: string) {
  return expandedItems.value.has(path)
}

function toggleExpansion(path: string) {
  if (expandedItems.value.has(path)) {
    expandedItems.value.delete(path)
  } else {
    expandedItems.value.add(path)
  }
}

// Flattened structure to avoid recursive components
interface FlatItem {
  key: string
  value: any
  path: string
  depth: number
  parentPath?: string
}

const flattenData = computed(() => {
  const result: FlatItem[] = []

  // Handle root primitive case first
  if (isJSONPrimitive(props.data)) {
    result.push({
      key: 'value',
      value: props.data,
      path: 'root',
      depth: 0,
      parentPath: undefined,
    })
    return result
  }

  function flatten(obj: unknown, parentPath = '', depth = 0) {
    const entries = Array.isArray(obj)
      ? obj.map((item, index) => [String(index), item])
      : Object.entries(obj)

    for (const [key, value] of entries) {
      const currentPath = generatePath(parentPath, key)

      result.push({
        key,
        value,
        path: currentPath,
        depth,
        parentPath: parentPath || undefined,
      })

      // If expanded and has children, flatten recursively
      if (isExpanded(currentPath) && isExpandable(value)) {
        flatten(value, currentPath, depth + 1)
      }
    }
  }

  flatten(props.data)
  return result
})

function formatValue(value: JSONValue): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  if (Array.isArray(value)) return '[Array]'
  if (typeof value === 'object') return `[${value.constructor.name}]`

  return String(value)
}

function getCollectionLabel(value: any): string {
  if (Array.isArray(value)) {
    return `Array[${value.length}]`
  }
  if (isObject(value) && value !== null) {
    // return `Object{${Object.keys(value).length}}`
    return 'Object'
  }

  return ''
}

function getValueType(value: any): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (isObject(value)) return 'object'
  if (typeof value === 'boolean') return 'boolean'
  return typeof value
}

function getValueTypeClass(value: any): string {
  const type = getValueType(value)
  switch (type) {
    case 'boolean':
      return 'text-blue-600'
    case 'string':
      return 'text-green-700'
    case 'number':
      return 'text-orange-600'
    case 'null':
      return 'text-gray-500'
    case 'undefined':
      return 'text-red-600'
    default:
      return ''
  }
}
</script>

<template>
  <div>
    <div
      v-for="item in flattenData"
      :key="item.path"
      class="text-sm mb-1"
      :style="{ paddingLeft: `${item.depth * 20}px` }"
      @mouseenter="handleMouseEnter(item.path)"
      @mouseleave="handleMouseLeave(item.path)"
    >
      <!-- Expandable items (Arrays and Objects) -->
      <div v-if="isExpandable(item.value)" class="px-3">
        <div
          class="flex items-center gap-2 px-1 py-0.5 mb-1 cursor-pointer hover:bg-theme/10 theme-neutral transition-colors"
          @click="toggleExpansion(item.path)"
        >
          <ILucideChevronRight
            class="w-3 h-3 text-gray-500 transition-transform duration-200"
            :class="{ 'rotate-90': isExpanded(item.path) }"
          />
          <span class="text-blue-600 font-semibold">{{ item.key }}:</span>
          <span class="text-gray-500 text-xs">{{ getCollectionLabel(item.value) }}</span>
        </div>
      </div>

      <!-- Non-expandable items (primitives) -->
      <div v-else class="flex items-center gap-2 px-3 py-0.5 hover:bg-gray-50 transition-colors">
        <div class="flex items-center gap-2">
          <span class="text-purple-600 font-semibold">{{ item.key }}:</span>
          <span :class="getValueTypeClass(item.value)" :title="formatValue(item.value)">
            {{ formatValue(item.value) }}
          </span>
        </div>

        <!-- Edit button -->
        <UButton v-if="isHovered(item.path)" size="xs">
          Edit
        </UButton>
      </div>
    </div>
  </div>
</template>
