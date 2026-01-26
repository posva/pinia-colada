import { describe, expectTypeOf, it } from 'vite-plus/test'
import { useQuery } from './use-query'
import { useQueryCache, defineQueryOptions } from '@pinia/colada'
import type { EntryKeyTagged } from '@pinia/colada'
import type { ErrorDefault } from './types-extension'

describe('typed query keys', () => {
  const queryCache = useQueryCache()

  describe('defineQueryOptions', () => {
    it('static', () => {
      const optsStatic = defineQueryOptions({
        key: ['a', 2],
        query: async () => `a:${2}`,
        // initialData: () => 'a',
      })

      expectTypeOf(optsStatic.key).toEqualTypeOf<EntryKeyTagged<string, ErrorDefault, undefined>>()
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
        ({ id, withComments = false }: { id: string; withComments?: boolean }) => ({
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

    it('preserves initialData type', async () => {
      const staticOps = defineQueryOptions({
        key,
        query: async () => ({ id: 0 }),
        initialData: () => ({ id: 0, tmp: true }),
      })
      const queryCache = useQueryCache()
      // @ts-expect-error: not possible because data is expected to always be set
      queryCache.setQueryData(staticOps.key, undefined)
      queryCache.setQueryData(staticOps.key, { id: 1 })
      queryCache.setQueryData(staticOps.key, { id: 1, tmp: true })
      // @ts-expect-error: not existing property
      queryCache.setQueryData(staticOps.key, { id: 1, nope: true })

      const entry = queryCache.get(staticOps.key)!
      // no undefined
      expectTypeOf(entry.state.value.data).toEqualTypeOf<
        | {
            id: number
          }
        | {
            id: number
            tmp: boolean
          }
      >()
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

    it('removes undefined from an entry state if initialData is set', () => {
      const optsStatic = defineQueryOptions({
        key: ['a', 2],
        query: async () => `a:${2}` as `a:${number}`,
        initialData: () => 'a:0' as const,
      })
      const queryCache = useQueryCache()
      const entry = queryCache.get(optsStatic.key)!
      expectTypeOf(entry.state.value.data).toEqualTypeOf<`a:${number}`>()
    })

    it('types when using setQueryData and static options', () => {
      const queryCache = useQueryCache()
      // @ts-expect-error: success + undefined are not compatible
      queryCache.setQueryData(optsStatic.key, undefined)
      const entry = queryCache.get(optsStatic.key)!
      expectTypeOf(entry.state.value.data).toEqualTypeOf<`a:${number}` | undefined>()
      queryCache.setEntryState(entry, { status: 'pending', data: undefined, error: null })
      queryCache.setQueryData(optsStatic.key, 'a:2')
      queryCache.setQueryData(optsStatic.key, (oldData) => {
        expectTypeOf(oldData).toEqualTypeOf<`a:${number}` | undefined>()
        return `a:5` as const
      })
    })

    it('types when using setQueryData and dynamic options', () => {
      const queryCache = useQueryCache()
      // @ts-expect-error: success + undefined are not compatible
      queryCache.setQueryData(optsDynamic(2).key, undefined)
      const entry = queryCache.get(optsDynamic(2).key)!
      expectTypeOf(entry.state.value.data).toEqualTypeOf<`a:${number}` | undefined>()
      queryCache.setEntryState(entry, { status: 'pending', data: undefined, error: null })
      queryCache.setQueryData(optsDynamic(2).key, 'a:2')
      queryCache.setQueryData(optsDynamic(2).key, (oldData) => {
        expectTypeOf(oldData).toEqualTypeOf<`a:${number}` | undefined>()
        return `a:5` as const
      })
    })

    it('with keys as const and objects', () => {
      const DOCUMENTS_KEYS = {
        root: ['documents'] as const,
        byId: (id: string) => [...DOCUMENTS_KEYS.root, id] as const,
        byIdWithComments: (id: string) => [...DOCUMENTS_KEYS.byId(id), 'comments'] as const,
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

      queryCache.setQueryData(docQueryById('2').key, (oldData) => ({
        toto: oldData?.toto ?? 0 + 1,
      }))
      queryCache.setQueryData(docQueryById('2').key, { toto: 47 })
      queryCache.setQueryData(docQueryById('2').key, {
        // @ts-expect-error: not the correct type
        toto: true,
      })
      // allows non typed too with loose types
      queryCache.setQueryData(DOCUMENTS_KEYS.byId('1'), { toto: true })
    })

    function onlyTakeNumberOrUndefined(n: number | undefined): number | undefined {
      return n
    }

    it('types the placeholder data', () => {
      defineQueryOptions({
        query: async () => 42,
        key: ['foo'],
        placeholderData: (n) => {
          // we need this less strict version because the actual type is T
          expectTypeOf<number | undefined>(n)
          expectTypeOf(onlyTakeNumberOrUndefined(n)).toEqualTypeOf<number | undefined>()
          return n ?? 42
        },
      })
    })

    it('supports optional params as extra query modifiers', () => {
      const documentsListQuery = defineQueryOptions(
        ({ page = 1, withComments = false }: { page?: number; withComments?: boolean } = {}) => ({
          key: ['documents', page, { comments: withComments }],
          query: async () => ({
            page,
            withComments,
            list: [] as { id: string; title: string; hasComments: boolean }[],
          }),
        }),
      )

      const r0 = useQuery(documentsListQuery())
      expectTypeOf(r0.data.value).toEqualTypeOf<
        | {
            page: number
            withComments: boolean
            list: { id: string; title: string; hasComments: boolean }[]
          }
        | undefined
      >()

      // can also be not called
      const r1 = useQuery(documentsListQuery)
      expectTypeOf(r1).toEqualTypeOf(r0)

      const r2 = useQuery(documentsListQuery, () => ({ page: 2, withComments: true }))
      expectTypeOf(r2.data.value).toEqualTypeOf<
        | {
            page: number
            withComments: boolean
            list: { id: string; title: string; hasComments: boolean }[]
          }
        | undefined
      >()

      const queryCache = useQueryCache()
      expectTypeOf(
        queryCache.getQueryData(documentsListQuery({ page: 3, withComments: true }).key),
      ).toEqualTypeOf<
        | {
            page: number
            withComments: boolean
            list: { id: string; title: string; hasComments: boolean }[]
          }
        | undefined
      >()
      expectTypeOf(queryCache.getQueryData(documentsListQuery().key)).toEqualTypeOf<
        | {
            page: number
            withComments: boolean
            list: { id: string; title: string; hasComments: boolean }[]
          }
        | undefined
      >()
    })

    it('disallows function in meta', () => {
      // @ts-expect-error: meta cannot be a function
      defineQueryOptions({
        key: ['a'],
        query: async () => 'ok',
        meta: () => ({}),
      })

      defineQueryOptions({
        key: ['a'],
        query: async () => 'ok',
        meta: { hello: 'world' },
      })
    })
  })
})
