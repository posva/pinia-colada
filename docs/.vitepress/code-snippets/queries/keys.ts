export const DOCUMENT_QUERY_KEYS = {
  root: ['documents'],
  byId: (id: number) => [...DOCUMENT_QUERY_KEYS.root, id],
  byIdWithComments: (id: number) => [...DOCUMENT_QUERY_KEYS.root, id, { comments: true }],
} as const

export const DOCUMENT_COMMENT_QUERY_KEYS = {
  root: ['documents', 'comments'],
  byId: (id: number) => [...DOCUMENT_COMMENT_QUERY_KEYS.root, id],
  byIdWithReplies: (id: number) => [...DOCUMENT_COMMENT_QUERY_KEYS.root, id, { replies: true }],
} as const
