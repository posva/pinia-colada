<script setup lang="ts">
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/contacts"> Contacts </RouterLink>
        |
        <RouterLink to="/multi-types"> Multi types </RouterLink>
        |
        <RouterLink to="/ssr-test">SSR test</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
  <PiniaColadaDevtools />
</template>
