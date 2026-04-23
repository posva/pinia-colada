<script setup lang="ts">
import Dedupe from './scenarios/dedupe/Dedupe.vue'
import Hmr from './scenarios/hmr/Hmr.vue'

const params = new URLSearchParams(window.location.search)
const scenario = params.get('scenario') || 'dedupe'
</script>

<template>
  <main>
    <h1 data-testid="scenario">{{ scenario }}</h1>
    <Dedupe v-if="scenario === 'dedupe'" />
    <Hmr v-else-if="scenario === 'hmr'" />
  </main>
</template>
