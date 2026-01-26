import { describe, expectTypeOf, it } from 'vite-plus/test'
import type { ComputedRef } from 'vue'
import { ref } from 'vue'
import { useQueryState } from './use-query-state'
import { defineQueryOptions } from './define-query-options'
import type { DataState } from './data-state'
import type { ErrorDefault } from './types-extension'

describe('useQueryState type inference', () => {
  it('works with type param', () => {
    const keyId = ref(1)
    const { data } = useQueryState<{ id: number }>(() => ['item', keyId.value])
    expectTypeOf(data).toEqualTypeOf<ComputedRef<{ id: number } | undefined>>()
  })

  it('works with defineQueryOptions static variant', () => {
    const itemQuery = defineQueryOptions({
      key: ['static-item'],
      query: async () => ({ id: 1, name: 'Item' }),
    })

    const { data } = useQueryState(itemQuery.key)
    expectTypeOf(data.value).toEqualTypeOf<{ id: number; name: string } | undefined>()
  })

  it('works with defineQueryOptions dynamic variant', () => {
    const itemQuery = defineQueryOptions((id: number) => ({
      key: ['item', id],
      query: async () => ({ id, name: `Item ${id}` }),
    }))

    const { data } = useQueryState(itemQuery, () => 1)
    expectTypeOf(data.value).toEqualTypeOf<{ id: number; name: string } | undefined>()
  })

  it('returns correct types for all properties', () => {
    const options = defineQueryOptions({
      key: ['test'],
      query: async () => ({ id: 1 }),
    })
    const { state, data, error, status, isPending } = useQueryState(options.key)

    expectTypeOf(state.value).toEqualTypeOf<
      DataState<{ id: number }, ErrorDefault, undefined> | undefined
    >()

    expectTypeOf(data.value).toEqualTypeOf<{ id: number } | undefined>()
    expectTypeOf(error.value).toEqualTypeOf<ErrorDefault | null | undefined>()
    expectTypeOf(status.value).toEqualTypeOf<'pending' | 'error' | 'success' | undefined>()
    expectTypeOf(isPending.value).toEqualTypeOf<boolean>()
  })
})
