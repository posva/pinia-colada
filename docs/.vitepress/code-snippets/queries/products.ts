import { defineQueryOptions } from '@pinia/colada'
import { getProductById } from '@/api/products'

export const PRODUCT_QUERY_KEYS = {
  root: ['products'],
  byId: (id: string) => [...PRODUCT_QUERY_KEYS.root, id],
} as const

export const productDetailsQuery = defineQueryOptions((id: string) => ({
  key: PRODUCT_QUERY_KEYS.byId(id),
  query: () => getProductById(id),
}))
