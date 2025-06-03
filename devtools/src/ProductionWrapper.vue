<script setup lang="ts">
import DevtoolsWrapper from './PCDevtoolsWrapper.vue'

const {
  // disable in production by default
  disabled = process.env.NODE_ENV === 'production',
} = defineProps<{ disabled?: boolean }>()
</script>

<template>
  <DevtoolsWrapper v-if="!disabled" />
</template>
