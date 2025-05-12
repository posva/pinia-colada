import { defineQuery, useQuery } from '@pinia/colada'

export const useUsers = defineQuery(() => {
  const { data: users, ...rest } = useQuery({
    key: ['users'],
    query: async () => {
      console.log('Fetching users...')
      const res = await fetch('https://jsonplaceholder.typicode.com/users')
      const data = await res.json()
      return data
    },
  })

  return {
    users,
    ...rest,
  }
})
