import { describe, expectTypeOf, it } from 'vitest'
import { useQueryCache, type UseQueryEntry } from './query-store'
import type { EntryKeyTagged } from './entry-keys'

describe('get type inference', () => {
  it('uses unknown types for untagged keys', () => {
    const entry = useQueryCache().get(['a'])

    expectTypeOf(entry).toEqualTypeOf<UseQueryEntry<unknown, unknown, unknown> | undefined>()
    expectTypeOf(entry!.state.value.error).toBeUnknown()
    if (entry?.state.value.status === 'pending') {
      expectTypeOf(entry.state.value.data).toBeUnknown()
    }
  })

  it('defaults initial data to undefined for explicit data types', () => {
    const entry = useQueryCache().get<string>(['a'])

    expectTypeOf(entry).toEqualTypeOf<UseQueryEntry<string, unknown, undefined> | undefined>()
  })

  it('preserves types from tagged keys', () => {
    const key = ['a'] as unknown as EntryKeyTagged<string, TypeError, string>
    const entry = useQueryCache().get(key)

    expectTypeOf(entry).toEqualTypeOf<UseQueryEntry<string, TypeError, string> | undefined>()
  })
})

describe('extendQueryEntry type inference', () => {
  it('errors when setting ext directly', () => {
    const entry = {} as UseQueryEntry
    // @ts-expect-error: ext is readonly
    entry.ext = {}
  })
})
