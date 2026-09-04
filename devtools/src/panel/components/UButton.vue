<script setup lang="ts">
import { computed } from 'vue'

const { size = 'md', variant = 'normal' } = defineProps<{
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'normal' | 'outline'
}>()
const sizeClasses = computed(() => {
  switch (size) {
    case 'xs':
      return 'px-1 py-0.5 gap-1'
    case 'sm':
      return 'px-1.5 py-1 gap-1'
    case 'lg':
      return 'px-3 py-1 gap-2'
    case 'md':
    default:
      return 'px-2 py-1 gap-1.5'
  }
})

const variantClasses = computed(() => {
  if (variant === 'outline') {
    return 'bg-transparent border border-(--ui-border) text-(--ui-text-muted) hover:bg-(--ui-bg-muted) hover:text-(--ui-text)'
  }
  return 'bg-theme-400 hover:bg-theme-600 dark:bg-theme-400 dark:hover:bg-theme-300 text-gray-900'
})
</script>

<template>
  <button
    type="button"
    class="font-medium hover:cursor-pointer focus-visible:outline-theme focus-visible:outline-offset-2 focus-visible:outline-2 transition-colors flex items-center disabled:cursor-not-allowed disabled:text-gray-700"
    :class="[
      // @sourced in tailwind css
      `text-${size}`,
      `rounded-${size}`,
      sizeClasses,
      variantClasses,
    ]"
  >
    <slot />
  </button>
</template>
