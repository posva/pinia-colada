<script lang="ts" setup>
import { useQuery } from '@pinia/colada'
import { useRoute } from 'vue-router'

const route = useRoute()

const { data, asyncStatus } = useQuery({
  key: ['ssr'],
  staleTime: route.query.fresh !== undefined ? 0 : 5000,
  async query() {
    console.log('Refreshing data')
    return {
      text: 'I was not serialized 🏴‍☠️',
      when: Date.now(),
    }
  },
})
</script>

<template>
  <main class="big-layout">
    <h1 class="mb-12">SSR test</h1>

    <p>Check the ssr query in the devtools to see if the fresh status changes</p>

    <p>Loading: {{ asyncStatus === 'loading' }}</p>

    <pre>{{ data }}</pre>
  </main>
</template>
