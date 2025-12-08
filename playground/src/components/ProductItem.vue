<script setup lang="ts">
import type { ProductListItem } from '@/api/products'
import { useBasket } from '@/composables/basket'

defineProps<{ product: ProductListItem }>()
defineEmits<{
  (event: 'updateQuantity', quantity: number): void
}>()

const cart = useBasket()
</script>

<template>
  <div class="w-56 px-2 py-6 rounded-md">
    <div class="w-full h-56 overflow-hidden">
      <RouterLink
        :to="{
          name: '/ecom/item/[id]',
          params: { id: product.id },
        }"
      >
        <img
          :src="product.imageSrc"
          :alt="product.imageAlt"
          class="object-cover object-center w-full h-full"
        />
      </RouterLink>
    </div>
    <div class="py-2">
      <div class="flex justify-between">
        <div>
          <h3>
            <a class="font-medium text-gray-700 hover:text-gray-800">{{ product.name }}</a>
          </h3>
          <div class="text-sm text-gray-500">
            {{ product.color }}
          </div>
        </div>
        <div class="text-sm font-medium text-gray-900">{{ product.price }} €</div>
      </div>
      <div class="flex justify-between">
        <div>
          <label for="quantity" class="sr-only">Quantity, {{ product.name }}</label>
          <select
            id="quantity"
            name="quantity"
            :value="0"
            class="bg-transparent max-w-full rounded-md border border-transparent p-1.5 text-left text-base font-medium leading-5 text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
            @change="
              cart.setItemQuantity(product.id, Number(($event.target as HTMLInputElement).value))
            "
          >
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
          </select>
        </div>
        <div>{{ product.availability }} left</div>
      </div>
    </div>
  </div>
</template>
