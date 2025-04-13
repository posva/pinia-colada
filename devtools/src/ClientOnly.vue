<script setup lang="ts">
import { onMounted, ref } from 'vue'

const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})
</script>

<template>
  <template v-if="isMounted">
    <slot />
  </template>
</template>
