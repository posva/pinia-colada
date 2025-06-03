<script setup lang="ts">
import DevtoolsWrapper from './PCDevtoolsWrapper.vue'

const isProduction = process.env.NODE_ENV === 'production'
</script>

<template>
  <DevtoolsWrapper v-if="!isProduction" />
</template>

