<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEventListener } from '@vueuse/core'

const translate = defineModel('translate', {
  type: Number,
  required: true,
})

const isResizing = ref(false)

// TODO: use CSS v-bind
// TODO: refactor the code to use a ::before like in splitpanes__splitter
const panelStyle = computed(() => {
  return {
    transform: `translateY(-${translate.value - 5}px)`,
  }
})

function stopResizing() {
  isResizing.value = true
}

useEventListener(window, 'mousemove', (e: MouseEvent) => {
  if (!isResizing.value) return

  // Clamp the translate value between 20vh and 80% of the viewport height
  const maxTranslate = window.innerHeight * 0.8
  const minTranslate = window.innerHeight * 0.2
  const rawTranslate = window.innerHeight - e.clientY

  translate.value = Math.min(maxTranslate, Math.max(minTranslate, rawTranslate))
})

useEventListener(window, 'mouseup', () => {
  isResizing.value = false
})
</script>

<template>
  <div
    class="h-[8px] w-full fixed left-0 bottom-0 z-9999 cursor-row-resize hover:bg-(--ui-border) transition-[background-color] duration-200 select-none touch-none resize-handle"
    :class="[isResizing && 'bg-(--ui-border) cursor-col-resize']"
    :style="panelStyle"
    @mousedown="stopResizing"
  />
</template>
