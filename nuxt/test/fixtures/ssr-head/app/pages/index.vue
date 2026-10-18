<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
defineOptions({ name: 'SsrHeadIndexPage' })
definePageMeta({ name: 'ssr-head-index' })
</script>

<template>
  <main>
    <NuxtLink to="/posts/one">Post one</NuxtLink>
    <NuxtLink to="/posts/two">Post two</NuxtLink>
  </main>
</template>
