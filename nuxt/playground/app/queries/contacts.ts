import { defineQuery, useQuery } from '@pinia/colada'
// import { useRoute } from 'vue-router'

export const useProfileInfo = defineQuery(() => {
  const route = useRoute()
  const query = useQuery({
    key: () => {
      console.log('computing key', route.params.id)
      return ['profiles', route.params.id as string]
    },
    enabled: () => 'id' in route.params,
    query: async () => ({
      id: route.params.id,
      name: 'Name',
    }),
  })

  return {
    ...query,
  }
})
