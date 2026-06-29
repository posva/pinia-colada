<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

// `NODE_ENV` is replaced at build time (see vite.config `define`) with the *deferred*
// text `process.env.NODE_ENV`, which the consumer's bundler folds to a literal. In a
// production build it folds to a constant `false`, so the `import()` below lands in dead
// code: the whole devtools graph — including the lazily-loaded panel — becomes unreachable
// and is tree-shaken out of the consumer's client AND server (SSR/nitro) bundles.
//
// A *static* `import` here would instead keep that graph in the bundle (a `v-if` only stops
// rendering, not bundling), which is why the wrapper is pulled in lazily.
const DevtoolsWrapper =
  NODE_ENV === 'development'
    ? defineAsyncComponent(() => import('./PCDevtoolsWrapper.vue'))
    : undefined
</script>

<template>
  <component :is="DevtoolsWrapper" v-if="DevtoolsWrapper" />
</template>
