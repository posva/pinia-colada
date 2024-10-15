import { defineQuery } from '@pinia/colada'

export const useBasicQuery = defineQuery({
  key: ['id', '3'],
  async query() {
    console.log('change me 1')
    return `id-${Date.now()}-ok`
  },
  staleTime: 1000 * 1,
  gcTime: 1000 * 5,
})
