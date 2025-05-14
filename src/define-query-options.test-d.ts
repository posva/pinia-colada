import { describe, expectTypeOf, it } from 'vitest'
import { useQuery } from './use-query'
import { useQueryCache, defineQueryOptions, useDynamicQuery } from '@pinia/colada'
import type { EntryKeyTagged } from '@pinia/colada'

describe('typed query keys', () => {
  const queryCache = useQueryCache()

  describe('defineQueryOptions', () => {
    it('static', () => {
      const optsStatic = defineQueryOptions({
        key: ['a', 2],
        query: async () => `a:${2}`,
        // initialData: () => 'a',
      })

      expectTypeOf(optsStatic.key).toEqualTypeOf<EntryKeyTagged<string | undefined>>()
      expectTypeOf(queryCache.getQueryData(optsStatic.key)).toEqualTypeOf<string | undefined>()
    })

    it('dynamic', () => {
      const optsDynamic = defineQueryOptions((id: number) => ({
        key: ['a', id],
        query: async () => `a:${id}`,
      }))

      const { state, data } = useDynamicQuery(optsDynamic, () => 4)
      expectTypeOf(queryCache.getQueryData(optsDynamic(4).key)).toEqualTypeOf<string | undefined>()

      expectTypeOf(data.value).toEqualTypeOf<string | undefined>()
      expectTypeOf(state.value.data).toEqualTypeOf<string | undefined>()
    })

    it('can be composed with keys', () => {
      const CONTACTS_QUERY_KEYS = {
        root: ['contacts'],
        byId: (id: number) => [...CONTACTS_QUERY_KEYS.root, id] as const,
        byIdWithFriends: (id: number) =>
          [...CONTACTS_QUERY_KEYS.root, id, { withFriends: true }] as const,
      }

      const o = defineQueryOptions((id: number) => ({
        key: CONTACTS_QUERY_KEYS.byId(id),
        query: async () => `a:${id}`,
        // only allow dynamic properties?
      }))

      useDynamicQuery(o, () => 4)
      queryCache.getQueryData(o(4).key)

      const o2 = defineQueryOptions({
        key: CONTACTS_QUERY_KEYS.root,
        query: async () => `list`,
      })

      useQuery(o2)
      queryCache.getQueryData(o2.key)
    })

    const key = ['a']
    async function query() {
      return 'ok'
    }

    it('fails on invalid initialData type', () => {
      defineQueryOptions({
        key,
        query,
        initialData: () => 'YES',
      })

      // @ts-expect-error: initialData must be a function
      defineQueryOptions({
        key,
        query,
        initialData: 'YES',
      })
    })

    it('allows function options like initialData', () => {
      const optsStatic = defineQueryOptions({
        key: ['a', 2],
        query: async () => `a:${2}` as `a:${number}`,
        initialData: () => 'a:0' as const,
      })

      expectTypeOf(queryCache.getQueryData(optsStatic.key)).toEqualTypeOf<`a:${number}`>()
    })

    const optsStatic = defineQueryOptions({
      key: ['a', 2],
      query: async () => `a:${2}` as `a:${number}`,
      // initialData: () => 'a',
    })

    const optsDynamic = defineQueryOptions((id: number) => ({
      key: ['a', id],
      query: async () => `a:${id}` as const,
    }))

    it('types when using setQueryData and static options', () => {
      const queryCache = useQueryCache()
      queryCache.setQueryData(optsStatic.key, undefined)
      queryCache.setQueryData(optsStatic.key, 'a:2')
      queryCache.setQueryData(optsStatic.key, (oldData) => {
        expectTypeOf(oldData).toEqualTypeOf<`a:${number}` | undefined>()
        return `a:5` as const
      })
    })

    it('types when using setQueryData and dynamic options', () => {
      const queryCache = useQueryCache()
      queryCache.setQueryData(optsDynamic(2).key, undefined)
      queryCache.setQueryData(optsDynamic(2).key, 'a:2')
      queryCache.setQueryData(optsDynamic(2).key, (oldData) => {
        expectTypeOf(oldData).toEqualTypeOf<`a:${number}` | undefined>()
        return `a:5` as const
      })
    })
  })
})
