<script setup lang="ts">
import { useColorMode, useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'
import ResizablePanel from './ResizablePanel.vue'

const { isPip } = defineProps<{
  isPip: boolean
}>()

const colorMode = useColorMode({
  selector: '#root',
})
const colorTheme = computed(() => {
  return colorMode.value === 'auto' ? [] : colorMode.value
})

const pipContainerHeight = useLocalStorage('pinia-colada-devtools-pip-container-height', 400)

// ensure the height it less than 80% of the screen height
pipContainerHeight.value = Math.min(pipContainerHeight.value, window.innerHeight * 0.8)

// TODO: refactor into CSS v-bind
const containerStyle = computed(() => ({ height: `${pipContainerHeight.value}px` }))
const containerClasses = computed(() => {
  return isPip
    ? ['h-full']
    : [
        'fixed',
        'max-h-[80%]',
        'min-h-[20vh]',
        'bottom-0',
        'left-0',
        'right-0',
        'overflow-hidden',
        'z-[9999]',
        'border-t',
        'border-(--ui-border)',
      ]
})
</script>

<template>
  <aside
    :class="[colorTheme, containerClasses]"
    class="w-full pip-container"
    :style="containerStyle"
    v-bind="$attrs"
  >
    <slot />
  </aside>
  <ResizablePanel v-model:translate="pipContainerHeight" />
</template>
