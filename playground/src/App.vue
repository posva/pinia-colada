<script setup lang="ts">
import { useQuery } from '@pinia/colada'
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        |
        <RouterLink to="/contacts">Contacts</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>
