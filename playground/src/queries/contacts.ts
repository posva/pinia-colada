import { getContactById } from '@/api/contacts'
import { defineQueryOptions } from '@pinia/colada'

const CONTACTS_QUERY_KEY = {
  root: ['contacts'] as const,
  byId: (id: string) => [...CONTACTS_QUERY_KEY.root, id] as const,
}

export const contactByIdQuery = defineQueryOptions((id: string) => ({
  key: CONTACTS_QUERY_KEY.byId(id),
  query: ({ signal }) => getContactById(id, { signal }),
}))
