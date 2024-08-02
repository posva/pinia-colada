import { describe, expectTypeOf, it } from 'vitest'
import { computed, shallowReactive, shallowRef } from 'vue'
import type { DataState } from './data-state'

describe('DataState type narrowing', () => {
  it('narrowing with shallowReactive', () => {
    const dataState = shallowReactive<DataState<number, Error>>({} as any)
    const state = dataState
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

  it('narrowing with shallowRef', () => {
    const dataState = shallowRef<DataState<number, Error>>({} as any)
    const state = dataState.value
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

  it('narrowing with shallowRef within a computed', () => {
    const _state = shallowRef<DataState<number, Error>>({} as any)
    const state = computed(() => _state.value)
    if (state.value.status === 'pending') {
      expectTypeOf(state.value.data).toEqualTypeOf<undefined>()
      expectTypeOf(state.value.error).toEqualTypeOf<null>()
    } else if (state.value.status === 'error') {
      expectTypeOf(state.value.data).toEqualTypeOf<number | undefined>()
      expectTypeOf(state.value.error).toEqualTypeOf<Error>()
    } else if (state.value.status === 'success') {
      expectTypeOf(state.value.data).toEqualTypeOf<number>()
      expectTypeOf(state.value.error).toEqualTypeOf<null>()
    }

    if (state.value.error != null) {
      expectTypeOf(state.value.status).toEqualTypeOf<'error'>()
    }

    if (!state.value.error && state.value.status !== 'pending') {
      expectTypeOf(state.value.data).toEqualTypeOf<number>()
    }

    if (state.value.data != null) {
      expectTypeOf(state.value.status).toEqualTypeOf<'success' | 'error'>()
    }
  })
})
