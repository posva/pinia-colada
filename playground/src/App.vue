<script setup lang="ts">
import { onErrorCaptured, onMounted, shallowRef } from 'vue'
import { PiniaColadaDevtools } from '@pinia/colada-devtools'

const error = shallowRef<Error | null>(null)
onErrorCaptured((err) => {
  console.error('💥 Captured error at root', err)
  error.value = err
})
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">
          Home
        </RouterLink>
        |
        <RouterLink to="/contacts">
          Contacts
        </RouterLink>
        |
        <RouterLink to="/suspense/contacts">
          Contacts (suspense)
        </RouterLink>
        |
        <RouterLink to="/cat-facts">
          Cat Facts
        </RouterLink>
        |
        <RouterLink to="/warnings">
          Warnings
        </RouterLink>
        |
        <RouterLink to="/hmr-tests">
          HMR tests
        </RouterLink>
        |
        <RouterLink to="/bug-reports">
          Bug reports
        </RouterLink>
      </nav>
    </div>
  </header>

  <div v-if="error">
    <pre>{{ error }}</pre>
  </div>

  <RouterView v-slot="{ Component }">
    <Suspense @resolve="error = null">
      <component :is="Component" />

      <template #fallback>
        <p>Loading...</p>
      </template>
    </Suspense>
  </RouterView>

  <PiniaColadaDevtools />
  <hr>
</template>
