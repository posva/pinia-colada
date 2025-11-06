<script setup lang="ts">
const modelValue = defineModel<string | number>()
</script>

<template>
  <input
    v-model="modelValue"
    class="py-1.5 pl-8 pr-2 rounded border border-(--ui-border) focus:ring-1 focus:ring-theme focus:outline-none transition-colors theme-primary"
    placeholder="Search Queries"
  />
</template>
