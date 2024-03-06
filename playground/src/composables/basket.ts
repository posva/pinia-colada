import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBasket = defineStore('cart', () => {
  const itemCount = ref<Record<string, number>>({})

  function addItemToBasket(itemId: string) {
    const itemQuantity = itemCount.value[itemId]
    if (itemQuantity) itemCount.value[itemId] = itemQuantity + 1
    else itemCount.value[itemId] = 1
  }
  function setItemQuantity(itemId: string, itemQuantity: number) {
    itemCount.value[itemId] = itemQuantity
  }
  return {
    itemCount,
    addItemToBasket,
    setItemQuantity,
  }
})
