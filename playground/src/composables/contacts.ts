import { defineQuery, useQuery } from '@pinia/colada'
import { useRouteQuery } from '@vueuse/router'
import { searchContacts } from '@/api/contacts'

export const useContacts = defineQuery(() => {
  const searchText = useRouteQuery('search', '', { mode: 'push' })
  const { ...query } = useQuery({
    key: () => ['contacts-search', { searchText: searchText.value }],
    query: ({ signal }) => searchContacts(searchText.value, {}, { signal }),
    gcTime: 0,
  })
  return { ...query, searchText }
})
