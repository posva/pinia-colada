<script setup lang="ts">
const modelValue = defineModel<string | number>()
</script>

<template>
  <input v-model="modelValue" class="">
</template>
