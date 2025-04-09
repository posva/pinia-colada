<script setup lang="ts">
import { ref } from 'vue'
// import { PiniaColadaDevtools } from '../'
import { PiniaColadaDevtools } from '@pinia/colada-devtools'

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    import.meta.hot?.invalidate()
  })
  // FIXME: HMR crashes the APP
  // import.meta.hot.accept('../', () => {
  //   import.meta.hot?.invalidate()
  // })
  // import.meta.hot.accept('@pinia/colada-devtools', () => {
  //   import.meta.hot?.invalidate()
  // })
}

const isActive = ref(true)
</script>

<template>
  <main>
    <h1>Hello</h1>

    <label> <input v-model="isActive" type="checkbox" /> Show Devtools </label>
  </main>
  <PiniaColadaDevtools v-if="isActive" />
</template>
