import { expectTypeOf, it } from 'vitest'
import type { App } from 'vue'
import { QueryPlugin } from './query-plugin'

declare const app: App

it('disallows "setup" to return a promise', () => {
  app.use(QueryPlugin, {
    // @ts-expect-error: async await
    async setup() {},
  })

  app.use(QueryPlugin, {
    // @ts-expect-error: explicit promise
    setup() {
      return Promise.resolve()
    },
  })

  app.use(QueryPlugin, {
    setup() {
      // works!
    },
  })
})
