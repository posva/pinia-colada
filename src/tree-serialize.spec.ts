import { describe, expect, it } from 'vitest'
import { TreeMapNode } from './tree-map'
import type { UseQueryEntry } from './query-store'
import { createQueryEntry, createTreeMap, serialize } from './query-store'

describe('tree-map serialization', () => {
  it('basic serialization', () => {
    const tree = new TreeMapNode<UseQueryEntry>()
    tree.set(['a'], createQueryEntry('a'))
    tree.set(['a', 'b'], createQueryEntry('ab'))
    tree.set(['a', 'b', 'c'], createQueryEntry('abc'))
    tree.set(['d', 'e', 'f'], createQueryEntry('def'))
    expect(serialize(tree)).toMatchSnapshot()
    expect(serialize(tree)).toEqual(serialize(createTreeMap(serialize(tree))))
  })

  it('works with empty', () => {
    const tree = new TreeMapNode<UseQueryEntry>()
    expect(serialize(tree)).toEqual([])
    expect(serialize(tree)).toEqual(serialize(createTreeMap()))
    expect(serialize(tree)).toEqual(serialize(createTreeMap([])))
  })
})
