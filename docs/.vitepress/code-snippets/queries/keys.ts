export const DOCUMENT_QUERY_KEYS = {
  root: ['documents'] as const,
  byId: (id: string) => [...DOCUMENT_QUERY_KEYS.root, id] as const,
  byIdWithComments: (id: number) => [...DOCUMENT_QUERY_KEYS.byId(id), { comments: true }] as const,
}
