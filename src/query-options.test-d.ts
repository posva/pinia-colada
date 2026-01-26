import { describe, expectTypeOf, it } from 'vite-plus/test'
import type { App } from 'vue'
import { PiniaColada } from './pinia-colada'
import type { UseQueryOptions } from './query-options'

declare const app: App

describe('PiniaColada plugin types', () => {
  it('works', () => {
    app.use(PiniaColada)
    app.use(PiniaColada, {})
  })

  it('allows global queryOptions', () => {
    app.use(PiniaColada, {
      plugins: [],
      queryOptions: {
        enabled: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
      },
    })
  })
})

describe('UseQueryOptions', () => {
  function track(_options: UseQueryOptions<unknown, unknown, unknown>): void {}

  it('specific is assinable to generic', () => {
    expectTypeOf(track).toBeCallableWith({} as UseQueryOptions)
    expectTypeOf(track).toBeCallableWith(
      {} as UseQueryOptions<number, SyntaxError, number | undefined>,
    )
    expectTypeOf<UseQueryOptions>().toExtend<UseQueryOptions>()
  })
})
