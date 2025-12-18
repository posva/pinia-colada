<script setup lang="ts">
import DevtoolsWrapper from './PCDevtoolsWrapper.vue'
const enabled = NODE_ENV === 'development'
</script>

<template>
  <DevtoolsWrapper v-if="enabled" />
</template>
