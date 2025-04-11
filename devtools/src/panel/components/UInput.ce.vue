<script setup lang="ts">
const props = defineProps<{
  defaultValue?: string | number
}>()

const modelValue = defineModel<string | number>()
</script>

<template>
  <input v-model="modelValue" class="" >
</template>
