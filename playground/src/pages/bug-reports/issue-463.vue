<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { onMounted, ref } from 'vue'

const variableStr = ref('')
onMounted(() => {
  setTimeout(() => {
    console.log('mounted timeout')
    variableStr.value = 'changed again'
  }, 1000)
  // variableStr.value = 'changed'
})

const { state } = useQuery({
  key: () => ['query', variableStr.value],
  async query() {
    return variableStr.value
  },
  enabled: () => variableStr.value.length !== 0, // doesn't affect the issue
  gcTime: 10_000,
  // staleTime: 60_000,
})
</script>

<template>
  <main>
    <p>Open the devtools to check that there are only 1 observer for the query (the component)</p>

    <pre>{{ state }}</pre>
  </main>
</template>
