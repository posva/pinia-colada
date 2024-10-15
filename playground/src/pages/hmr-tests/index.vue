<script lang="ts" setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main>
    <p class="p-2">
      Go to one of these links
    </p>

    <ul class="ml-5 list-disc">
      <li
        v-for="route of router
          .getRoutes()
          .filter((r) => r.path.startsWith('/hmr-tests'))
          .sort((a, b) => a.path.length - b.path.length)
        "
        :key="route.name || route.path"
      >
        <RouterLink v-slot="{ href }" :to="route.path">
          {{ href }}
        </RouterLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.router-link-active {
  opacity: 0.5;
}
</style>
