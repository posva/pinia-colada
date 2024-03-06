<script setup lang="ts">
import { useBasket } from '@/composables/basket'
import type { ProductListItem } from '@/api/products'

defineProps<{ product: ProductListItem }>()

const cart = useBasket()
</script>

<template>
  <div class="flex items-center justify-between">
    <dt class="text-sm text-gray-600">
      {{ product.name }} ({{ product.color }})
    </dt>
    <dd class="text-sm text-gray-600">
      x {{ cart.itemCount[product.id] }}
    </dd>
    <!-- <dd class="text-sm font-medium text-gray-900">{{ price }} €</dd> -->
  </div>
</template>
