import { describe, expectTypeOf, it } from 'vitest'
import { useQuery } from './use-query'
import { useQueryCache, defineQueryOptions } from '@pinia/colada'
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

      const { state: s1, data: d1 } = useQuery(optsDynamic, () => 4)
      expectTypeOf(queryCache.getQueryData(optsDynamic(4).key)).toEqualTypeOf<string | undefined>()

      expectTypeOf(d1.value).toEqualTypeOf<string | undefined>()
      expectTypeOf(s1.value.data).toEqualTypeOf<string | undefined>()

      const optsDynamic2 = defineQueryOptions(({ id = 0 }: { id?: number }) => ({
        key: ['a', id],
        query: async () => ({ id, name: 'Eduardo' }),
      }))

      const { state: s2, data: d2 } = useQuery(optsDynamic2, () => ({ id: 4 }))
      expectTypeOf(queryCache.getQueryData(optsDynamic2({}).key)).toEqualTypeOf<
        | {
            id: number
            name: string
          }
        | undefined
      >()

      expectTypeOf(d2.value).toEqualTypeOf<
        | {
            id: number
            name: string
          }
        | undefined
      >()
      expectTypeOf(s2.value.data).toEqualTypeOf<
        | {
            id: number
            name: string
          }
        | undefined
      >()
    })

    it('can be composed with keys', () => {
      const CONTACTS_QUERY_KEYS = {
        root: ['contacts'] as const,
        byId: (id: number) => [...CONTACTS_QUERY_KEYS.root, id] as const,
        byIdWithFriends: (id: number) =>
          [...CONTACTS_QUERY_KEYS.root, id, { withFriends: true }] as const,
      }

      const o = defineQueryOptions((id: number) => ({
        key: CONTACTS_QUERY_KEYS.byId(id),
        query: async () => `a:${id}`,
        // only allow dynamic properties?
      }))

      useQuery(o, () => 4)
      queryCache.getQueryData(o(4).key)

      const o2 = defineQueryOptions({
        key: CONTACTS_QUERY_KEYS.root,
        query: async () => `list`,
      })

      useQuery(o2)
      queryCache.getQueryData(o2.key)
    })

    it('allows undefined in objects', () => {
      const DOCUMENT_QUERY_KEYS = {
        root: ['documents'] as const,
        byId: (id: string) => [...DOCUMENT_QUERY_KEYS.root, id] as const,
        byIdWithComments: (id: string, withComments?: boolean) =>
          [...DOCUMENT_QUERY_KEYS.root, id, { withComments }] as const,
      }

      defineQueryOptions(
        ({ id, withComments = false }: { id: string, withComments?: boolean }) => ({
          key: DOCUMENT_QUERY_KEYS.byIdWithComments(id, withComments),
          query: async () => [2],
        }),
      )
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

      expectTypeOf(queryCache.getQueryData(optsStatic.key)).toEqualTypeOf<
        `a:${number}` | undefined
      >()
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

    it('with keys as const and objects', () => {
      const DOCUMENTS_KEYS = {
        root: ['documents'],
        byId: (id: string) => [...DOCUMENTS_KEYS.root, id],
        byIdWithComments: (id: string) => [...DOCUMENTS_KEYS.byId(id), 'comments'],
      } as const

      const queryCache = useQueryCache()

      const docQueryById = defineQueryOptions((id: string) => ({
        key: DOCUMENTS_KEYS.byId(id),
        async query() {
          return { toto: 22 }
        },
      }))

      const { data } = useQuery(docQueryById, () => '2')
      expectTypeOf(data.value).toEqualTypeOf<{ toto: number } | undefined>()

      expectTypeOf(queryCache.getQueryData(docQueryById('2').key)).toEqualTypeOf<
        | {
            toto: number
          }
        | undefined
      >()

      useQuery({
        key: DOCUMENTS_KEYS.byId('1'),
        async query() {
          return []
        },
      })

      queryCache.setQueryData(docQueryById('2').key, undefined)
      queryCache.setQueryData(docQueryById('2').key, (oldData) => ({
        toto: oldData?.toto ?? 0 + 1,
      }))
      queryCache.setQueryData(docQueryById('2').key, { toto: 47 })
      queryCache.setQueryData(DOCUMENTS_KEYS.byId('1'), { toto: true })
    })
  })
})
