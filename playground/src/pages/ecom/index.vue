<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { getAllProducts } from '@/api/products'
import ProductItem from '@/components/ProductItem.vue'

const { data, error } = useQuery({
  key: ['items'],
  query: getAllProducts,
  staleTime: 15000,
})

// 1. The query
// const { isError, data, suspense } = useQuery(itemsQuery)

// 4. Prefetch
// const prefetch = (id: number) => queryClient.prefetchQuery(itemQuery(id.toString()))
</script>

<template>
  <main>
    <div v-if="error">
      <pre>An error happened</pre>
    </div>
    <div v-else class="flex flex-wrap">
      <div v-for="item in data" :key="item.id">
        <!--  add prefetch here : @mouseover="prefetch(item.id)" -->
        <ProductItem :product="item" />
      </div>
    </div>
  </main>
</template>
