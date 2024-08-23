import { defineQuery, useQuery } from '@pinia/colada'
import { useRouteQuery } from '@vueuse/router'
import { searchContacts } from '@/api/contacts'

export const useContactSearch = defineQuery(() => {
  const searchText = useRouteQuery('search', '', { mode: 'push' })
  const { ...query } = useQuery({
    key: () => ['contacts-search', { searchText: searchText.value }],
    query: async ({ signal }) => searchContacts(searchText.value, {}, { signal }),
    staleTime: 0,
  })
  return { ...query, searchText }
})
