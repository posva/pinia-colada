<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEventListener } from '@vueuse/core'

const props = defineProps({
  translate: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['update:translate'])

const isResizing = ref(false)

const translateY = computed({
  get: () => props.translate,
  set: (val) => emit('update:translate', val),
})

const panelStyle = computed(() => {
  return {
    transform: `translateY(-${translateY.value - 8}px)`,
  }
})

const onMouseDown = () => {
  isResizing.value = true
}

const onMouseMove = (e: MouseEvent) => {
  if (!isResizing.value) return

  // The PiP container has a max height of 80% and a min height of 20vh, so we limit the translate value within that range
  const maxTranslate = window.innerHeight * 0.8
  const minTranslate = window.innerHeight * 0.2
  let newTranslate = window.innerHeight - e.clientY

  if (newTranslate > maxTranslate) newTranslate = maxTranslate
  if (newTranslate < minTranslate) newTranslate = minTranslate

  translateY.value = newTranslate
}

const onMouseUp = () => {
  if (isResizing.value) {
    isResizing.value = false
  }
}

useEventListener(window, 'mousemove', onMouseMove)
useEventListener(window, 'mouseup', onMouseUp)
</script>

<template>
  <div
    class="h-3 w-full fixed left-0 bottom-0 z-9999 cursor-col-resize hover:bg-(--ui-border) transition-[background-color] duration-200"
    :class="[isResizing && 'bg-(--ui-border) cursor-col-resize']"
    :style="panelStyle"
    @mousedown="onMouseDown"
  />
</template>
