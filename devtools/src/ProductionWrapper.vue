<script setup lang="ts">
import DevtoolsWrapper from './PCDevtoolsWrapper.vue'

const {
  // disable in production by default
  // we need to use a variable that gets replaced by Vite
  disabled = NODE_ENV === 'production',
} = defineProps<{ disabled?: boolean }>()
</script>

<template>
  <DevtoolsWrapper v-if="!disabled" />
</template>
