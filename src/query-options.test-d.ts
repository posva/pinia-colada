import { describe, it } from 'vitest'
import type { App } from 'vue'
import { PiniaColada } from './pinia-colada'

declare const app: App

describe('PiniaColada types', () => {
  it('disallows "setup" to return a promise', () => {
    app.use(PiniaColada, {
      // @ts-expect-error: async await
      async setup() {},
    })

    app.use(PiniaColada, {
      // @ts-expect-error: explicit promise
      setup() {
        return Promise.resolve()
      },
    })

    app.use(PiniaColada, {
      setup() {
        // works!
      },
    })
  })
})
