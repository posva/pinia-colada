
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useResizeObserver } from '@vueuse/core'

const convertRemToPixels = (rem: number) => {
  return rem * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
}

const isResizing = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const panelRefWidth = ref(0)
const panelHeight = ref('450px')
const position = 'bottom'

const handleDragStart = (event: MouseEvent) => {
  const currentTarget = event.currentTarget as HTMLElement
  const panelElement = currentTarget.parentElement
  if (!panelElement) return

  isResizing.value = true
  const { height } = panelElement.getBoundingClientRect()
  const startY = event.clientY
  let newSize = 0
  const minHeight = convertRemToPixels(3.5)

  const runDrag = (moveEvent: MouseEvent) => {
    moveEvent.preventDefault()

      const valToAdd = startY - moveEvent.clientY
      newSize = Math.round(height + valToAdd)
      if (newSize < minHeight) {
        newSize = minHeight
      }

      panelHeight.value = `${newSize}px`
  }

  const unsubscribe = () => {
    if (isResizing.value) {
      isResizing.value = false
    }
    document.removeEventListener('mousemove', runDrag, false)
    document.removeEventListener('mouseup', unsubscribe, false)
  }

  document.addEventListener('mousemove', runDrag, false)
  document.addEventListener('mouseup', unsubscribe, false)
}

onMounted(() => {
  useResizeObserver(panelRef, (entries) => {
    const entry = entries[0]
    if (!entry) return

    const { width } = entry.contentRect
    panelRefWidth.value = width
  })
})
</script>

<template>
  <div
    ref="panelRef"
    class="blabla fixed left-0 right-0 p-4 shadow-lg rounded-lg bg-gray-900   z-50 overflow-auto"
    :style="{
      height: panelHeight,
      width: '100vw',
      top: 'auto',
      bottom: position === 'bottom' ? '0' : 'auto',
    }"
    aria-label="Pinia colada devtools"
  >
    <div
      class="absolute w-full h-4 cursor-move bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-t-lg top-0 left-0"
      @mousedown="handleDragStart"
    />

    <div class="mt-6 pt-2">
      <slot />
    </div>
  </div>
</template>
