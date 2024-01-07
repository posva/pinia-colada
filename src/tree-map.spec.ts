import { describe, expect, it } from 'vitest'
import { EntryNode } from './tree-map'

describe('tree-map', () => {
  it('.set and .get', () => {
    const tree = new EntryNode<string>()
    tree.set(['a'], 'a')
    expect(tree.get(['a'])).toBe('a')
    tree.set(['a', 'b'], 'ab')
    expect(tree.get(['a', 'b'])).toBe('ab')
    tree.set(['a', 'b', 'c'], 'abc')
    expect(tree.get(['a', 'b', 'c'])).toBe('abc')
    tree.set(['a'], 'a2')
    expect(tree.get(['a'])).toBe('a2')
    tree.set(['a', 'b'], 'ab2')
    expect(tree.get(['a', 'b'])).toBe('ab2')
    tree.set(['a', 'b', 'd'], 'abd')
    tree.set(['a', 'e'], 'ae')
    tree.set(['f'], 'f')
    expect(tree.get(['a', 'b', 'c'])).toBe('abc')
    expect(tree.get(['a', 'b', 'd'])).toBe('abd')
    expect(tree.get(['a', 'e'])).toBe('ae')
    expect(tree.get(['f'])).toBe('f')
  })

  it('.delete', () => {
    const tree = new EntryNode<string>()
    tree.set(['a', 'b', 'c'], 'abc')
    tree.set(['a', 'b', 'd'], 'abd')
    tree.delete(['a', 'b', 'c'])
    expect(tree.get(['a', 'b', 'c'])).toBe(undefined)
    expect(tree.get(['a', 'b', 'd'])).toBe('abd')

    tree.set(['a', 'b', 'h'], 'abh')
    tree.delete(['a', 'b'])
    expect(tree.get(['a', 'b'])).toBe(undefined)
    expect(tree.get(['a', 'b', 'c'])).toBe(undefined)
    expect(tree.get(['a', 'b', 'h'])).toBe(undefined)

    tree.set(['a', 'b', 'h'], 'abh')
    expect(tree.get(['a', 'b'])).toBe(undefined)
    expect(tree.get(['a', 'b', 'c'])).toBe(undefined)
    expect(tree.get(['a', 'b', 'h'])).toBe('abh')

    tree.set(['a', 'e'], 'ae')
    tree.set(['a', 'k'], 'ak')
    tree.set(['f'], 'f')

    tree.delete(['a', 'e'])
    expect(tree.get(['a', 'e'])).toBe(undefined)
    tree.delete(['f'])
    expect(tree.get(['f'])).toBe(undefined)
    expect(tree.get(['a', 'k'])).toBe('ak')
  })
})
