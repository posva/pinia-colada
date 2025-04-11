<script setup lang="ts">
const props = defineProps<{
  defaultValue?: string | number
}>()

const classes =
  'aria-disabled:bg-theme aria-disabled:cursor-not-allowed aria-disabled:opacity-75 bg-theme disabled:bg-theme disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline-theme focus-visible:outline-2 focus-visible:outline-offset-2 font-medium gap-1.5 hover:bg-(--ui-primary)/75 inline-flex items-center px-2.5 py-1.5 rounded-[calc(var(--ui-radius)*1.5)] transition-colors'
</script>

<template>
  <button
    type="button"
    class="bg-theme-400 hover:bg-theme-600 dark:bg-theme-400 dark:hover:bg-theme-300 font-medium rounded-lg px-5 py-2.5 me-2 mb-2 hover:cursor-pointer focus-visible:outline-theme focus-visible:outline-offset-2 focus-visible:outline-2"
  >
    <slot />
  </button>
</template>
