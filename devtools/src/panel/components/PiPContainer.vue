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
    ? []
    : ['fixed', 'max-h-[80%]', 'bottom-0', 'left-0', 'right-0', 'overflow-hidden', 'z-[9999]']
})
</script>

<template>
  <div id="root" :class="[colorTheme, containerClasses]" class="">
    <slot />
  </div>
</template>
