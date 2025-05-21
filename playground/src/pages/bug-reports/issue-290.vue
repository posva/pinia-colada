<script setup lang="ts">
import { useFirst } from '@/queries/issue-290'

const { data } = useFirst()
</script>

<template>
  <RouterLink v-slot="{ href }" :to="{ query: {} }">
    {{ href }}
  </RouterLink>
  |
  <RouterLink v-slot="{ href }" :to="{ query: { type: 'p_1' } }">
    {{ href }}
  </RouterLink>
  |
  <RouterLink v-slot="{ href }" :to="{ query: { type: 'p_2' } }">
    {{ href }}
  </RouterLink>

  <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px">
    <pre>{{ data }}</pre>
  </div>
</template>
