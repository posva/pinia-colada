<script setup lang="ts">
import { computed } from 'vue'

const { size = 'md' } = defineProps<{
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>()
const padding = computed(() => {
  switch (size) {
    case 'xs':
      return 'px-1 py-0.5'
    case 'sm':
      return 'px-2 py-1'
    case 'md':
      return 'px-2 py-2'
    case 'lg':
      return 'px-3 py-3'
    default:
      return 'px-2 py-2'
  }
})
</script>

<template>
  <button
    type="button"
    class="bg-theme-400 hover:bg-theme-600 dark:bg-theme-400 dark:hover:bg-theme-300 font-medium hover:cursor-pointer focus-visible:outline-theme focus-visible:outline-offset-2 focus-visible:outline-2 transition-colors text-(--color-gray-900)"
    :class="[`text-${size}`, padding, `rounded-${size}`]"
  >
    <slot />
  </button>
</template>
