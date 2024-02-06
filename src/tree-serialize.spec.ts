import { describe, expect, it } from 'vitest'
import { TreeMapNode, logTree } from './tree-map'
import {
  UseQueryEntry,
  createQueryEntry,
  createTreeMap,
  serialize,
} from './data-fetching-store'

describe('tree-map serialization', () => {
  it('basic serialization', () => {
    const tree = new TreeMapNode<UseQueryEntry>()
    tree.set(['a'], createQueryEntry('a'))
    tree.set(['a', 'b'], createQueryEntry('ab'))
    tree.set(['a', 'b', 'c'], createQueryEntry('abc'))
    tree.set(['d', 'e', 'f'], createQueryEntry('def'))
    logTree(tree)
    expect(serialize(tree)).toEqual(serialize(createTreeMap(serialize(tree))))
  })

  it('works with empty', () => {
    const tree = new TreeMapNode<UseQueryEntry>()
    expect(serialize(tree)).toEqual(serialize(createTreeMap()))
    expect(serialize(tree)).toEqual(serialize(createTreeMap([])))
  })
})
