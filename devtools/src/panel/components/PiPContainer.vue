<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'

const { isPip } = defineProps<{
  isPip: boolean
}>()

const colorMode = useColorMode({
  selector: '#root',
})
const colorTheme = computed(() => {
  return colorMode.value === 'auto' ? [] : colorMode.value
})

const containerClasses = computed(() => {
  return isPip
    ? ['h-full']
    : ['fixed', 'max-h-[80%]', 'min-h-[20vh]', 'bottom-0', 'left-0', 'right-0', 'overflow-hidden', 'z-[9999]', 'h-[500px]']
})
</script>

<template>
  <aside :class="[colorTheme, containerClasses]" class="w-full ">
    <slot />
  </aside>
</template>
