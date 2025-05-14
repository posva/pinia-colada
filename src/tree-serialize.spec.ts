import { describe, expect, it } from 'vitest'
import { serializeQueryCache, useQueryCache } from './query-store'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

// TODO: move to query-store.spec.ts

describe('query cache serialization', () => {
  it('basic serialization', () => {
    const pinia = createPinia()
    const app = createApp({})
    app.use(pinia)
    const queryCache = useQueryCache(pinia)
    queryCache.setQueryData(['a'], 'a')
    queryCache.setQueryData(['a', 'b'], 'ab')
    queryCache.setQueryData(['a', 'b', 'c'], 'abc')
    queryCache.setQueryData(['d', 'e', 'f'], 'def')
    expect(serializeQueryCache(queryCache)).toEqual({
      '["a","b","c"]': ['abc', null, expect.any(Number)],
      '["a","b"]': ['ab', null, expect.any(Number)],
      '["a"]': ['a', null, expect.any(Number)],
      '["d","e","f"]': ['def', null, expect.any(Number)],
    })
  })

  it('works with empty', () => {
    const pinia = createPinia()
    const app = createApp({})
    app.use(pinia)
    const queryCache = useQueryCache(pinia)
    expect(serializeQueryCache(queryCache)).toEqual({})
  })
})
