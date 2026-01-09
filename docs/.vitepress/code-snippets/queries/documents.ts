import { defineQueryOptions } from '@pinia/colada'
import { getDocumentById } from '@/api/documents'

export const DOCUMENT_QUERY_KEYS = {
  root: ['documents'],
  byId: (id: string) => [...DOCUMENT_QUERY_KEYS.root, id],
  byIdWithComments: (id: string, withComments?: boolean) => [
    ...DOCUMENT_QUERY_KEYS.byId(id),
    { withComments },
  ],
} as const

export const documentByIdQuery = defineQueryOptions(
  ({ id, withComments = false }: { id: string; withComments?: boolean }) => ({
    key: DOCUMENT_QUERY_KEYS.byIdWithComments(id, withComments),
    query: () => getDocumentById(id, { withComments }),
  }),
)
