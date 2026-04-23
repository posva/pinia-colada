<script lang="ts" setup>
import { useQuery } from '@pinia/colada'

// Edited version used by the HMR spec: same key, different query body.
// A real HMR reload should re-run the query because the component was updated.
const { data, isLoading } = useQuery({
  key: () => ['shared-items'],
  query: async () => {
    ;(window as any).__fetchCount++
    await new Promise((r) => setTimeout(r, 20))
    return ['x', 'y', 'z']
  },
})
</script>

<template>
  <div class="child child--v2" data-testid="child">
    query-v2: {{ isLoading ? 'loading...' : data?.join(',') }}
  </div>
</template>
