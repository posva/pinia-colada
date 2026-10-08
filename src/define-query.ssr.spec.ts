/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import { defineQuery } from './define-query'
import { useQuery } from './use-query'
import { PiniaColada } from './pinia-colada'

describe('SSR defineQuery used by several apps (one per request)', () => {
  it('the first render in a new app only fetches the key it ends up with', async () => {
    const fetchedKeys: string[] = []
    const useTodos = defineQuery(() => {
      const filter = ref<'all' | 'done'>('all')
      const query = useQuery({
        key: () => ['todos', filter.value],
        query: async () => {
          fetchedKeys.push(filter.value)
          return filter.value
        },
      })
      return { ...query, filter }
    })

    const fetchedPerApp: string[][] = []
    for (const pinia of [createPinia(), createPinia()]) {
      fetchedKeys.length = 0
      const app = createSSRApp({
        setup() {
          const { filter, data } = useTodos()
          // e.g. a page that reads its filter from the route or a store in setup
          filter.value = 'done'
          return () => h('p', data.value)
        },
      })
      app.use(pinia).use(PiniaColada)
      await renderToString(app)
      fetchedPerApp.push([...fetchedKeys])
    }

    expect(fetchedPerApp[0]).toEqual(['done'])
    expect(fetchedPerApp[1]).toEqual(['done'])
  })
})
