import { defineQuery, useQuery } from '@pinia/colada'

export const useBasicQuery = defineQuery(() => {
  const { data: stuff, ...rest } = useQuery({
    key: ['id', '3'],
    async query() {
      console.log('➡️ change me 1')
      await new Promise((resolve) => setTimeout(resolve, 200))
      return `id-${performance.now()}-ok`
    },
    staleTime: 5000 * 1,
    gcTime: 1000 * 5,
  })

  return {
    stuff,
    ...rest,
  }
})
