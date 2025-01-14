<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const bugLinks = router
  .getRoutes()
  .filter((route) => route.name && route.path.includes('bug-reports/'))
  .map((route) => ({ name: route.name! }))
console.log(bugLinks)
</script>

<template>
  <h2>Bug reproductions</h2>

  <ul>
    <li v-for="link in bugLinks">
      <RouterLink v-slot="{ href }" :to="link">
        {{ href }}
      </RouterLink>
    </li>
  </ul>
</template>
