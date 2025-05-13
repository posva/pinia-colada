<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useEventListener } from '@vueuse/core'

const convertRemToPixels = (rem: number) => {
  return rem * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
}

const isResizing = ref(false)
const panelRef = useTemplateRef<HTMLElement>('panel')
const panelHeight = ref('450px')

const handleDrag = (event: MouseEvent) => {
  const currentTarget = event.currentTarget as HTMLElement
  const panelElement = currentTarget.parentElement
  if (!panelElement) return

  isResizing.value = true
  const { height } = panelElement.getBoundingClientRect()
  const startY = event.clientY
  let newSize = 0
  const minHeight = convertRemToPixels(3.5)

  function runDrag(moveEvent: MouseEvent) {
    moveEvent.preventDefault()

    const valToAdd = startY - moveEvent.clientY
    newSize = Math.round(height + valToAdd)
    if (newSize < minHeight) {
      newSize = minHeight
    }

    panelHeight.value = `${newSize}px`
  }

  const cleanupRunDrag = useEventListener(document, 'mousemove', runDrag)

  useEventListener(document, 'mouseup', () => {
    if (isResizing.value) {
      isResizing.value = false
    }
    cleanupRunDrag()
  })
}
</script>

<template>
  <div
    ref="panelRef"
    class="fixed left-0 right-0 p-4 shadow-lg rounded-lg bg-gray-900 z-50 overflow-auto"
    :style="{
      height: panelHeight,
      width: '100vw',
      bottom: '0',
    }"
  >
    <div
      class="absolute w-full h-2 cursor-move bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-t-lg top-0 left-0"
      @mousedown="handleDrag"
    />

    <div class="mt-6 pt-2">
      <slot />
    </div>
  </div>
</template>
