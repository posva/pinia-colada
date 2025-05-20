<script setup lang="ts">
import { useFirst } from '@/queries/issue-290'

const { data } = useFirst()
</script>

<template>
  <RouterLink :to="{ query: {} }" v-slot="{ href }">{{ href }}</RouterLink>
  |
  <RouterLink :to="{ query: { type: 'p_1' } }" v-slot="{ href }">{{ href }}</RouterLink>
  |
  <RouterLink :to="{ query: { type: 'p_2' } }" v-slot="{ href }">{{ href }}</RouterLink>

  <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px">
    <pre>{{ data }}</pre>
  </div>
</template>
