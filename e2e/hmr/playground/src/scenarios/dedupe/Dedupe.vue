<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import Child from './Child.vue'

const items = ref<number[]>([])

onMounted(async () => {
  // Staggered mounts across ticks — the scenario described in issue #569.
  // With 7 instances mounting on separate ticks, only 1 fetch should be
  // triggered because they all share the same query key.
  for (let i = 0; i < 7; i++) {
    await new Promise((r) => setTimeout(r, 10))
    items.value.push(i)
    window.__itemsMounted = items.value.length
  }
})
</script>

<template>
  <div>
    <div data-testid="items-mounted">{{ items.length }}</div>
    <div v-for="i in items" :key="i">
      <Child />
    </div>
  </div>
</template>
