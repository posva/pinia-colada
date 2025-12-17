<script setup lang="ts">
import { ref, computed, nextTick, useTemplateRef } from 'vue'
import type { JSONValue } from '@pinia/colada-devtools/shared'
import {
  formatValue,
  getValueTypeClass,
  isPlainObject,
  getValueType,
  isNonSerializableValue,
} from '@pinia/colada-devtools/shared'
import UButton from '../UButton.ce.vue'
import ILucideChevronRight from '~icons/lucide/chevron-right'
import ILucidePencil from '~icons/lucide/pencil'
import ILucideSquare from '~icons/lucide/square'
import ILucideCheckSquare from '~icons/lucide/check-square'
import ILucideBraces from '~icons/lucide/braces'
import ILucideSave from '~icons/lucide/save'
import ILucideUndo from '~icons/lucide/undo'
import ILucideMinus from '~icons/lucide/minus'
import ILucidePlus from '~icons/lucide/plus'

const {
  itemKey,
  value,
  depth,
  path = [],
  readonly,
} = defineProps<{
  itemKey: string
  value: JSONValue | Map<PropertyKey, any> | Set<unknown>
  depth: number
  path?: Array<string | number>
  readonly?: boolean
}>()

// Editing state
const editMode = ref<'simple' | 'json' | null>(null)
const editValue = ref<string>('')
const inputRef = useTemplateRef('inputRef')

// Value type helpers
const valueType = computed(() => getValueType(value))
const isNumber = computed(() => valueType.value === 'number')
const isBigInt = computed(() => valueType.value === 'bigint')
const isString = computed(() => valueType.value === 'string')
const isBoolean = computed(() => valueType.value === 'boolean')

const isCustomValue = computed(() => isNonSerializableValue(value))

const isEditablePrimitive = computed(
  () => !isCustomValue.value && (isNumber.value || isString.value),
)

const isEditableViaSimple = computed(
  () => !isCustomValue.value && (isNumber.value || isString.value),
)

// TODO: only readonly are non-editable via JSON
// that includes readonly prop and custom values
const isEditableViaJson = computed(() => !isCustomValue.value && !readonly)

const isExpanded = ref(false)

const isExpandable = computed(() => {
  return (
    (Array.isArray(value) && value.length > 0) ||
    (isPlainObject(value) && Object.keys(value).length > 0) ||
    (value instanceof Map && value.size > 0) ||
    (value instanceof Set && value.size > 0)
  )
})

const keyValuePairs = computed<Iterable<[PropertyKey, any]>>(() => {
  // for perf to avoid reading props.value multiple times
  const readValue = value
  if (Array.isArray(readValue)) {
    return readValue.map((v, i) => [i, v] as const)
  } else if (isPlainObject(readValue)) {
    return Object.entries(readValue)
  } else if (readValue instanceof Map) {
    return readValue.entries()
  } else if (readValue instanceof Set) {
    return Array.from(readValue).map((v, i) => [i, v] as const)
  }
  return []
})

const emit = defineEmits<{
  'update:value': [path: Array<string | number>, value: unknown]
}>()

// Editing methods
function enterEditMode(mode: 'simple' | 'json' = 'simple') {
  editMode.value = mode

  if (mode === 'json') {
    // JSON mode: use JSON.stringify representation
    if (value === undefined) {
      editValue.value = 'undefined'
    } else {
      editValue.value = JSON.stringify(value)
    }
  } else if (mode === 'simple') {
    // most editable values work like this
    editValue.value = String(value)
  }

  // Auto-focus the input
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function saveEdit() {
  let newValue: unknown

  if (editMode.value === 'json') {
    try {
      // cannot use JSON.parse for undefined
      if (editValue.value === 'undefined') {
        newValue = undefined
      } else {
        newValue = JSON.parse(editValue.value)
      }
    } catch (error) {
      // TODO: display a warning and stay in edit mode
      console.error('Invalid JSON:', error)
      // cancelEdit()
      return
    }
  } else {
    switch (valueType.value) {
      case 'bigint':
        try {
          newValue = BigInt(editValue.value)
        } catch (error) {
          console.error('Invalid BigInt:', error)
          // TODO: display a warning
          return
        }
        break
      case 'number':
        newValue = Number(editValue.value)
        if (Number.isNaN(newValue)) {
          console.error('Invalid number')
          // TODO: display a warning
          return
        }
        break
      default:
        newValue = editValue.value
        break
    }
  }

  emit('update:value', path, newValue)
  editMode.value = null
}

function cancelEdit() {
  editMode.value = null
  editValue.value = ''
}

function increment(event: MouseEvent) {
  const step = event.shiftKey ? 10 : 1
  const newValue = (value as number) + step
  emit('update:value', path, newValue)
}

function decrement(event: MouseEvent) {
  const step = event.shiftKey ? 10 : 1
  const newValue = (value as number) - step
  emit('update:value', path, newValue)
}

function toggleBoolean() {
  emit('update:value', path, !value)
}

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
      class="group flex items-center gap-2 py-0.5 bg-transparent hover:bg-(--ui-bg-muted) duration-200 transition-colors"
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

      <!-- Editable primitive value -->
      <span v-if="!isExpandable && isEditablePrimitive" class="flex">
        <!-- Editing mode -->
        <span v-if="!readonly && editMode" class="inline-flex items-center gap-1">
          <input
            ref="inputRef"
            v-model="editValue"
            class="px-1"
            :class="getValueTypeClass(value)"
            autocomplete="off"
            spellcheck="false"
            autocorrect="off"
            autocapitalize="off"
            data-1p-ignore
            data-lpignore="true"
            @keydown.enter="saveEdit"
            @keydown.escape="cancelEdit"
          />
          <UButton size="xs" variant="outline" title="Cancel changes (Esc)" @click="cancelEdit">
            <ILucideUndo class="size-3" />
          </UButton>
          <UButton size="xs" variant="outline" title="Save changes (Enter)" @click="saveEdit">
            <ILucideSave class="size-3" />
          </UButton>
        </span>

        <!-- Display mode -->
        <template v-else>
          <span
            :class="getValueTypeClass(value)"
            @dblclick.stop="!readonly && enterEditMode('simple')"
          >
            {{ formatValue(value) }}
          </span>

          <!-- Edit controls (shown on hover via Tailwind group) -->
          <span v-if="!readonly" class="hidden group-hover:flex gap-0.5 ml-1 align-middle">
            <UButton
              v-if="isNumber || isBigInt"
              size="xs"
              variant="outline"
              title="Decrement value (Shift for -10)"
              @click="decrement"
            >
              <ILucideMinus class="size-3" />
            </UButton>
            <UButton
              v-if="isNumber || isBigInt"
              size="xs"
              variant="outline"
              title="Increment value (Shift for +10)"
              @click="increment"
            >
              <ILucidePlus class="size-3" />
            </UButton>

            <!-- Simple edit button - only for strings and numbers -->
            <UButton
              v-if="isEditableViaSimple"
              size="xs"
              variant="outline"
              title="Edit value"
              @click="enterEditMode('simple')"
            >
              <ILucidePencil class="size-3" />
            </UButton>

            <!-- JSON edit button - for all editable values -->
            <UButton
              v-if="isEditableViaJson"
              size="xs"
              variant="outline"
              title="Edit as JSON"
              @click="enterEditMode('json')"
            >
              <ILucideBraces class="size-3" />
            </UButton>
          </span>
        </template>
      </span>

      <!-- Boolean value with checkbox -->
      <span
        v-else-if="!isExpandable && isBoolean && !isCustomValue"
        class="inline-flex items-center gap-1"
      >
        <component
          :is="value ? ILucideCheckSquare : ILucideSquare"
          class="size-3 text-(--ui-text-muted)"
          :class="!readonly && 'cursor-pointer hover:text-(--ui-text)'"
          :title="readonly ? undefined : `Click to toggle (current: ${value})`"
          @click="!readonly && toggleBoolean()"
        />
        <span
          :class="[getValueTypeClass(value), !readonly && 'cursor-pointer']"
          @click="!readonly && toggleBoolean()"
        >
          {{ formatValue(value) }}
        </span>
      </span>

      <!-- Editable null/undefined with JSON mode only -->
      <span
        v-else-if="
          !isExpandable && (valueType === 'null' || valueType === 'undefined') && !isCustomValue
        "
        class="inline"
      >
        <!-- Editing mode -->
        <span v-if="!readonly && editMode" class="inline-flex items-center gap-1">
          <input
            ref="inputRef"
            v-model="editValue"
            class="px-1"
            :class="getValueTypeClass(value)"
            autocomplete="off"
            spellcheck="false"
            autocorrect="off"
            autocapitalize="off"
            data-1p-ignore
            data-lpignore="true"
            @keydown.enter="saveEdit"
            @keydown.escape="cancelEdit"
          />
          <UButton size="xs" variant="outline" title="Cancel changes (Esc)" @click="cancelEdit">
            <ILucideUndo class="size-3" />
          </UButton>
          <UButton size="xs" variant="outline" title="Save changes (Enter)" @click="saveEdit">
            <ILucideSave class="size-3" />
          </UButton>
        </span>

        <!-- Display mode -->
        <template v-else>
          <span
            :class="getValueTypeClass(value)"
            @dblclick.stop="!readonly && enterEditMode('json')"
          >
            {{ formatValue(value) }}
          </span>

          <!-- Edit controls (JSON mode only) -->
          <span v-if="!readonly" class="hidden group-hover:inline-flex gap-0.5 ml-1 align-middle">
            <UButton
              size="xs"
              variant="outline"
              title="Edit as JSON"
              @click="enterEditMode('json')"
            >
              <ILucideBraces class="size-3" />
            </UButton>
          </span>
        </template>
      </span>

      <!-- Non-editable value (expandable or non-primitive) -->
      <span
        v-else
        :class="[getValueTypeClass(value), isExpandable && 'cursor-pointer']"
        :title="isExpandable ? 'Click to expand' : undefined"
        @click="toggleExpansion"
      >
        {{ formatValue(value) }}
      </span>
    </div>

    <!-- Expanded children -->
    <template v-if="isExpandable && isExpanded">
      <JsonItem
        v-for="[childKey, childValue] of keyValuePairs"
        :key="childKey"
        :item-key="String(childKey)"
        :value="childValue"
        :depth="depth + 1"
        :path="typeof childKey === 'symbol' ? undefined : [...path, childKey]"
        :readonly="readonly"
        @update:value="(...args) => emit('update:value', ...args)"
      />
    </template>
  </div>
</template>
