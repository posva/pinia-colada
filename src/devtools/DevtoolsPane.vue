<script setup lang="ts">
import { onMounted, ref } from 'vue'

const count = ref(0)

onMounted(async () => {
  const id = 'pinia-colada-devtools'
  window.top?.postMessage({ id, type: 'FROM_DEVTOOLS', payload: 'Hello from devtools' })
})
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center">
    <pre>{{ $route.fullPath }}</pre>
    <div>{{ count }}</div>
    <button class="btn" @click="count++">
      increment
    </button>
  </div>
</template>

<style scoped>
.btn {
  background-color: #4c51bf;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  border: none;
  cursor: pointer;
}
</style>
