import { describe, expect, it } from 'vitest'
import { TreeMapNode } from './tree-map'
import type { UseQueryEntry } from './query-store'
import { createQueryEntry, reviveTreeMap, serializeTreeMap } from './query-store'

describe('tree-map serialization', () => {
  it('basic serialization', () => {
    const tree = new TreeMapNode<UseQueryEntry>()
    tree.set(['a'], createQueryEntry(['a'], 'a'))
    tree.set(['a', 'b'], createQueryEntry(['a', 'b'], 'ab'))
    tree.set(['a', 'b', 'c'], createQueryEntry(['a', 'b', 'c'], 'abc'))
    tree.set(['d', 'e', 'f'], createQueryEntry(['d', 'e', 'f'], 'def'))
    expect(serializeTreeMap(tree)).toMatchSnapshot()
    expect(serializeTreeMap(tree)).toEqual(serializeTreeMap(reviveTreeMap(serializeTreeMap(tree))))
  })

  it('works with empty', () => {
    const tree = new TreeMapNode<UseQueryEntry>()
    expect(serializeTreeMap(tree)).toEqual([])
    expect(serializeTreeMap(tree)).toEqual(serializeTreeMap(reviveTreeMap()))
    expect(serializeTreeMap(tree)).toEqual(serializeTreeMap(reviveTreeMap([])))
  })
})
