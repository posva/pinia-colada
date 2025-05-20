import { useRoute } from 'vue-router'
import { defineQuery, useQuery } from '@pinia/colada'

export const useFirst = defineQuery(() => {
  const route = useRoute()

  const { data } = useQuery({
    key: () => ['posts', String(route.query.type)],
    query: async () => {
      console.log('fetching', route.query.type)
      return {
        type: route.query.type,
        when: Date.now(),
      }
    },
  })

  return { data }
})
