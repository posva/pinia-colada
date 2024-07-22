import { describe, expectTypeOf, it } from 'vitest'
import { shallowReactive } from 'vue'
import type { DataState } from './data-state'

describe('DataState type narrowing', () => {
  const dataState = shallowReactive<DataState<number, Error>>({} as any)
  const state = dataState
  it('narrowing', () => {
    if (state.status === 'pending') {
      expectTypeOf(state.data).toEqualTypeOf<undefined>()
      expectTypeOf(state.error).toEqualTypeOf<null>()
    } else if (state.status === 'error') {
      expectTypeOf(state.data).toEqualTypeOf<number | undefined>()
      expectTypeOf(state.error).toEqualTypeOf<Error>()
    } else if (state.status === 'success') {
      expectTypeOf(state.data).toEqualTypeOf<number>()
      expectTypeOf(state.error).toEqualTypeOf<null>()
    }

    if (state.error != null) {
      expectTypeOf(state.status).toEqualTypeOf<'error'>()
    }

    if (!state.error && state.status !== 'pending') {
      expectTypeOf(state.data).toEqualTypeOf<number>()
    }

    if (state.data != null) {
      expectTypeOf(state.status).toEqualTypeOf<'success' | 'error'>()
    }
  })
})
