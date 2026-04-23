<script lang="ts" setup>
import { useQuery } from '@pinia/colada'

const { data, isLoading } = useQuery({
  key: () => ['shared-multi'],
  query: async () => {
    window.__fetchCount++
    await new Promise((r) => setTimeout(r, 200))
    return ['a', 'b', 'c']
  },
})
</script>

<template>
  <div class="child component-b" data-testid="child">
    B: {{ isLoading ? 'loading...' : data?.join(',') }}
  </div>
</template>
