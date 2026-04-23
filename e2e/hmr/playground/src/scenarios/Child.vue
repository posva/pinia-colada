<script lang="ts" setup>
import { useQuery } from '@pinia/colada'

const { data, isLoading } = useQuery({
  key: () => ['shared-items'],
  query: async () => {
    ;(window as any).__fetchCount++
    await new Promise((r) => setTimeout(r, 0))
    return ['a', 'b', 'c']
  },
})
</script>

<template>
  <div class="child" data-testid="child">
    query: {{ isLoading ? 'loading...' : data?.join(',') }}
  </div>
</template>
