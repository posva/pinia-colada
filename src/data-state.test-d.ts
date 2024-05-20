import { describe, expectTypeOf, it } from 'vitest'
import { reactive } from 'vue'
import type { AsyncDataState, DataState } from './data-state'

describe('DataState', () => {
  const asyncState = reactive<AsyncDataState<number, Error>>({} as any)
  const dataState = reactive<DataState<number, Error>>({} as any)
  const state: typeof asyncState | typeof dataState = dataState
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
