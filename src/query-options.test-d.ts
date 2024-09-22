import type { App } from 'vue'
import { describe, it } from 'vitest'
import { PiniaColada } from './pinia-colada'

declare const app: App

describe('PiniaColada types', () => {
  it('disallows "setup" to return a promise', () => {
    app.use(PiniaColada, {
      // @ts-expect-error: async await
      async setup(a) {
        return a
      },
    })

    app.use(PiniaColada, {
      // @ts-expect-error: explicit promise
      setup(a) {
        return Promise.resolve(a)
      },
    })

    app.use(PiniaColada, {
      setup(queryReturn) {
        // works!
        return queryReturn
      },
    })
  })
})
