import { defineQueryOptions, useQueryCache } from '@pinia/colada'

const USERS_QUERY_KEYS = {
  root: ['users'] as const,
  byId: (id: string) => [...USERS_QUERY_KEYS.root, id] as const,

  orders: (id: string) => [...USERS_QUERY_KEYS.byId(id), 'orders'] as const,
}

export const userQuery = defineQueryOptions((id: string) => ({
  key: USERS_QUERY_KEYS.byId(id),
  query: async () => ({
    id,
    name: `User ${id}`,
  }),
}))

export const userOrdersQuery = defineQueryOptions((id: string) => {
  // maybe this should be passed as a second parameter to the function?
  const queryCache = useQueryCache()

  return {
    key: USERS_QUERY_KEYS.orders(id),
    query: async () => {
      const user = await queryCache.refresh(queryCache.ensure(userQuery(id)))

      return {
        user,
        orders: [],
      }
    },
  }
})
