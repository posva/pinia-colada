<script setup lang="ts">
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/contacts">
          Contacts
        </RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
  <PiniaColadaDevtools />
</template>
