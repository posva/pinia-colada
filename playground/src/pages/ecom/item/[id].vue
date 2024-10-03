<script setup lang="ts">
import { ref, watch } from 'vue'
import { StarIcon } from '@heroicons/vue/20/solid'
import { HeartIcon } from '@heroicons/vue/24/outline'
import { useMutation, useQuery } from '@pinia/colada'
import { useRoute } from 'vue-router/auto'
import {
  type ProductListItem,
  changeProductAvailability,
  getProductById,
} from '@/api/products'
import { delay } from '@/api/utils'

const route = useRoute('/ecom/item/[id]')

// const getPlaceholderData = (id: string) => {
//   return queryClient.getQueryData(itemsQuery.queryKey)?.find(item => item.id === Number(id))
// }
// const placeholderData = computed(() => getPlaceholderData(currentId))

// Query depending on an ID
const { data: item, isPending } = useQuery({
  key: () => ['items', route.params.id],
  query: () => getProductById(route.params.id),
  staleTime: 15000,
})

const itemAvailability = ref()
watch(
  () => item.value?.availability,
  (value) => (itemAvailability.value = value),
)

const { mutate: bookProduct } = useMutation({
  key: (product) => ['book-item', product.id],
  // TODO: migrate to onSettled
  // invalidateKeys: (product) => [['items'], ['items', product.id]],
  mutation: async (product: ProductListItem) => {
    await delay(Math.random() * 1000 + 200)
    return changeProductAvailability(product, undefined)
  },
  // NOTE: the optimistic update only works if there are no parallele updates
  onMutate: (product) => {
    const context = { previousAvailability: product.availability }
    itemAvailability.value = product.availability - 1
    return context
  },
  onError() {
    itemAvailability.value = item.value?.availability
  },
  onSuccess(data) {
    // TODO: find a better usecase
    console.log('Success hook called', data)
  },
  onSettled() {
    // TODO: find a better usecase
    console.log('Settled hook called')
  },
  // onMutate: async () => {
  //   // Cancel any outgoing refetches
  //   // (so they don't overwrite our optimistic update)
  //   await queryClient.cancelQueries(itemQuery(currentId))
  //   if (!item.value) return
  //   // Optimistically update to the new value
  //   queryClient.setQueryData(itemQuery(currentId).queryKey, () => {
  //     const newItem = { ...item.value }
  //     newItem.availability = item.value.availability - 1
  //     return newItem
  //   })
  //   return item
  // },
  // onError: (err, mutationArg, item) => {
  //   queryClient.setQueryData(itemQuery(currentId).queryKey, item?.value)
  // },
  // onSuccess: () => {
  //   queryClient.invalidateQueries(itemQuery(currentId, placeholderData.value))
  //   queryClient.invalidateQueries(itemsQuery)
  // }
})

// TODO: loader
</script>

<template>
  <div v-if="item" class="bg-white">
    <div
      class="max-w-2xl px-4 py-16 mx-auto sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8"
    >
      <div class="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
        <img
          :src="item?.imageSrc"
          class="object-cover object-center w-full h-full sm:rounded-lg"
        >

        <!-- Product info -->
        <div class="px-4 mt-10 sm:mt-16 sm:px-0 lg:mt-0">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">
            {{ item?.name }}
          </h1>

          <div class="mt-3">
            <h2 class="sr-only">
              Product information
            </h2>
            <p class="text-3xl tracking-tight text-gray-900">
              {{ item?.price }} €
            </p>
          </div>

          <!-- Reviews -->
          <div class="mt-3">
            <h3 class="sr-only">
              Reviews
            </h3>
            <div class="flex items-center">
              <div v-if="item?.rating" class="flex items-center">
                <StarIcon
                  v-for="rating in [0, 1, 2, 3, 4]"
                  :key="rating"
                  class="flex-shrink-0 w-5 h-5"
                  :class="[
                    item?.rating > rating ? 'text-indigo-500' : 'text-gray-300',
                  ]"
                  aria-hidden="true"
                />
              </div>
              <p class="sr-only">
                {{ item?.rating }} out of 5 stars
              </p>
            </div>
          </div>

          <div class="mt-6">
            <h3 class="sr-only">
              Description
            </h3>

            <div
              class="space-y-6 text-base text-gray-700"
              v-html="item?.description"
            />
          </div>

          <div>Availability: {{ itemAvailability }}</div>

          <div class="flex mt-10">
            <button
              class="flex items-center justify-center flex-1 max-w-xs px-8 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:w-full"
              @click="bookProduct(item)"
            >
              Add to bag
            </button>
            <button
              type="button"
              class="flex items-center justify-center px-3 py-3 ml-4 text-gray-400 rounded-md hover:bg-gray-100 hover:text-gray-500"
            >
              <HeartIcon class="flex-shrink-0 w-6 h-6" aria-hidden="true" />
              <span class="sr-only">Add to favorites</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="isPending">
    Loading...
  </div>
</template>
