<script setup lang="ts">
import { onMounted, ref } from 'vue'

const hydrated = ref(false)
const fetches = ref(0)
const { data } = useQuery({
  key: ['basic'],
  query: async () => {
    fetches.value++
    return import.meta.server ? 'query from server' : 'query from client'
  },
  staleTime: Infinity,
})

onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <div>basic</div>
  <div :data-hydrated="hydrated">
    <span data-query>{{ data }}</span>
    <span data-fetches>{{ fetches }}</span>
  </div>
</template>
