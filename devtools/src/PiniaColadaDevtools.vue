<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'

console.log('Injected value', inject('test', 'NO'))

const isMounted = ref(false)
onMounted(async () => {
  // define the component once
  if (!customElements.get('pinia-colada-devtools-panel')) {
    const { DevtoolsPanel } = await import('@pinia/colada-devtools-panel')
    customElements.define('pinia-colada-devtools-panel', DevtoolsPanel)
  }
  isMounted.value = true
})
</script>

<template>
  <Teleport to="body">
    <pinia-colada-devtools-panel v-if="isMounted" />
  </Teleport>
</template>
