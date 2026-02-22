import { describe, expectTypeOf, it } from 'vitest'
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

  it('specific is assignable to generic with a non-generic sink', () => {
    expectTypeOf<Parameters<typeof track>[0]>().toEqualTypeOf<
      UseQueryOptions<unknown, unknown, unknown>
    >()

    track({} as UseQueryOptions)
    track({} as UseQueryOptions<unknown, { custom: Error }, undefined>)
    track({} as UseQueryOptions<number, SyntaxError, number | undefined>)
  })
})
