import { describe, expect, it } from 'vitest'
import { TreeMapNode } from './tree-map'
import type { UseQueryEntry } from './query-store'
import { serializeTreeMap, useQueryCache } from './query-store'
import { createPinia } from 'pinia'

describe('tree-map serialization', () => {
  it('basic serialization', () => {
    const tree = new TreeMapNode<UseQueryEntry>()
    const pinia = createPinia()
    const queryCache = useQueryCache(pinia)
    tree.set(['a'], queryCache.create(['a'], 'a'))
    tree.set(['a', 'b'], queryCache.create(['a', 'b'], 'ab'))
    tree.set(['a', 'b', 'c'], queryCache.create(['a', 'b', 'c'], 'abc'))
    tree.set(['d', 'e', 'f'], queryCache.create(['d', 'e', 'f'], 'def'))
    expect(serializeTreeMap(tree)).toMatchSnapshot()
  })

  it('works with empty', () => {
    const tree = new TreeMapNode<UseQueryEntry>()
    expect(serializeTreeMap(tree)).toEqual([])
  })
})
