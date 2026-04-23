<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import ComponentA from './ComponentA.vue'
import ComponentB from './ComponentB.vue'

// Two distinct components sharing the same query key. Staggering their mounts
// across ticks used to ping-pong the per-entry HMR snapshot and invalidate the
// shared request even though neither component was hot-updated.
const mounted = ref<Array<'a' | 'b'>>([])

onMounted(async () => {
  const sequence: Array<'a' | 'b'> = ['a', 'b', 'a', 'b', 'a']
  for (const which of sequence) {
    await new Promise((r) => setTimeout(r, 10))
    mounted.value.push(which)
    window.__itemsMounted = mounted.value.length
  }
})
</script>

<template>
  <div>
    <div data-testid="items-mounted">{{ mounted.length }}</div>
    <template v-for="(which, i) in mounted" :key="i">
      <ComponentA v-if="which === 'a'" />
      <ComponentB v-else />
    </template>
  </div>
</template>
