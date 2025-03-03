<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { data, isLoading, refresh, refetch, error } = useQuery({
  key: ['playground'],
  async query() {
    return `Hello Playground! from ${import.meta.server ? 'server' : 'client'} on ${new Date().toLocaleString('fr')}`
  },
})
</script>

<template>
  <div>
    <h1>Pinia Colada 🍹</h1>

    <div>
      <button @click="refresh()">Refresh</button>
      <button @click="refetch()">Refetch</button>
    </div>

    <p v-if="error">
      {{ String(error) }}
    </p>

    <p v-if="isLoading">Loading...</p>

    <p v-if="data">
      {{ data }}
    </p>
  </div>
</template>
