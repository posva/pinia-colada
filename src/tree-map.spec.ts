import { describe, expect, it } from 'vitest'
import { TreeMapNode, entryNodeSize } from './tree-map'

describe('tree-map', () => {
  it('.set and .get', () => {
    const tree = new TreeMapNode<string>()
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

  it('deleting entries', () => {
    const tree = new TreeMapNode<string>()
    tree.set(['a', 'b', 'c'], 'abc')
    tree.set(['a', 'b', 'd'], 'abd')
    // tree.delete(['a', 'b', 'c'])
    tree.find(['a', 'b'])?.children?.delete('c')
    expect(tree.get(['a', 'b', 'c'])).toBe(undefined)
    expect(tree.get(['a', 'b', 'd'])).toBe('abd')

    tree.set(['a', 'b', 'h'], 'abh')
    // tree.delete(['a', 'b'])
    tree.find(['a'])?.children?.delete('b')
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

    // tree.delete(['a', 'e'])
    tree.find(['a'])?.children?.delete('e')
    expect(tree.get(['a', 'e'])).toBe(undefined)
    // tree.delete(['f'])
    tree.find([])?.children?.delete('f')
    expect(tree.get(['f'])).toBe(undefined)
    expect(tree.get(['a', 'k'])).toBe('ak')
  })

  it('can unset a node without deleting the children', () => {
    const tree = new TreeMapNode<string>()
    tree.set(['a', 'b', 'c'], 'abc')
    tree.set(['a', 'b', 'd'], 'abd')
    tree.set(['a', 'b'])
    expect(tree.get(['a', 'b', 'c'])).toBe('abc')
    expect(tree.get(['a', 'b', 'd'])).toBe('abd')
    expect(tree.get(['a', 'b'])).toBe(undefined)
  })

  it('isEmpty if all children are empty', () => {
    const tree = new TreeMapNode<string>()
    expect(tree.isEmpty()).toBe(true)
    tree.set(['a'], 'a')
    expect(tree.isEmpty()).toBe(false)
    expect(tree.find(['a'])?.isEmpty()).toBe(false)
    tree.set(['a', 'b', 'c'], 'abc')
    tree.set(['a'])
    expect(tree.find(['a'])?.isEmpty()).toBe(false)
    expect(tree.isEmpty()).toBe(false)
    tree.set(['a', 'b', 'c'])
    expect(tree.isEmpty()).toBe(true)
  })

  it('cleans up nodes when the sub tree is empty', () => {
    const tree = new TreeMapNode<string>()
    tree.set(['a'], 'a')
    tree.set(['a', '1'], 'a1')
    tree.set(['a', '2'], 'a2')

    tree.set(['a', '1'])
    tree.set(['a', '2'])
    expect(tree.get(['a'])).toBe('a')
    tree.set(['a'])
    expect(tree.find(['a'])).toBe(undefined)
  })

  it('.find', () => {
    const tree = new TreeMapNode<string>()
    tree.set(['a', 'b', 'c'], 'abc')
    tree.set(['a', 'b', 'd'], 'abd')
    tree.set(['a', 'e'], 'ae')
    tree.set(['a', 'k'], 'ak')
    tree.set(['f'], 'f')
    tree.set(['g', 'h'], 'gh')

    expect(tree.find(['f'])?.value).toBe('f')

    expect(tree.find(['a', 'b'])?.value).toBe(undefined)
    expect(tree.find(['a', 'b'])?.get(['c'])).toBe('abc')
    expect(tree.find(['a', 'b'])?.get(['d'])).toBe('abd')
    expect(tree.find(['a', 'b'])?.get(['e'])).toBe(undefined)
    expect(tree.find(['a', 'b'])?.get(['k'])).toBe(undefined)

    expect(tree.find(['a', 'b', 'c'])?.value).toBe('abc')
    expect(tree.find(['a', 'b', 'c'])?.get([])).toBe('abc')
    expect(tree.find(['a'])?.value).toBe(undefined)
    expect(tree.find(['a', 'b', 'c'])?.get(['c'])).toBe(undefined)
    expect(tree.find(['a', 'b', 'c'])?.get(['d'])).toBe(undefined)
    expect(tree.find(['a', 'b', 'c'])?.get(['e'])).toBe(undefined)

    expect(tree.find(['g'])?.find(['h'])?.value).toBe('gh')
    expect(tree.find(['g', 'h'])?.value).toBe('gh')
  })

  it('entryNodeSize', () => {
    const tree = new TreeMapNode<string>()
    tree.set(['a', 'b', 'c'], 'abc')
    expect(entryNodeSize(tree)).toBe(3)
    tree.set(['a', 'b', 'd'], 'abd')
    expect(entryNodeSize(tree)).toBe(4)
    tree.set(['a', 'b', 'h'], 'abh')
    expect(entryNodeSize(tree)).toBe(5)
    tree.set(['a', 'b', 'h'], 'abh2')
    expect(entryNodeSize(tree)).toBe(5)
    tree.set(['a', 'e'], 'ae')
    expect(entryNodeSize(tree)).toBe(6)
    tree.set(['a', 'k'], 'ak')
    expect(entryNodeSize(tree)).toBe(7)
    tree.set(['f'], 'f')
    expect(entryNodeSize(tree)).toBe(8)
    tree.set(['f'], 'f2')
    expect(entryNodeSize(tree)).toBe(8)
    tree.set(['g', 'h'], 'gh')
    expect(entryNodeSize(tree)).toBe(10)

    const t2 = new TreeMapNode<unknown>()
    t2.set(['todos', 2], {})
    t2.set(['todos', 4], {})
    expect(entryNodeSize(t2)).toBe(3)
  })

  describe('Symbol.iterator', () => {
    it('works on empty', () => {
      const tree = new TreeMapNode<string>()
      expect([...tree]).toEqual([])
    })

    it('skips empty nodes', () => {
      const tree = new TreeMapNode<string>()
      tree.set(['a', 'b', 'c'], 'abc')
      tree.set(['a'], 'a')
      expect([...tree]).toEqual(['a', 'abc'])
      tree.set(['a', 'b'], 'ab')
      expect([...tree]).toEqual(['a', 'ab', 'abc'])
    })

    it('can be iterated', () => {
      const tree = new TreeMapNode<string>()
      tree.set(['a'], 'a')
      tree.set(['a', 'b', 'c'], 'abc')
      tree.set(['a', 'b', 'd'], 'abd')
      tree.set(['a', 'e'], 'ae')
      tree.set(['a', 'k'], 'ak')
      tree.set(['f'], 'f')
      tree.set(['g', 'h'], 'gh')

      expect([...tree]).toEqual([
        // the order matches the order of insertion and goes deep first
        'a',
        'abc',
        'abd',
        'ae',
        'ak',
        'f',
        'gh',
      ])
    })

    it('can be iterated on a child', () => {
      const tree = new TreeMapNode<string>()
      tree.set(['a', 'b', 'c'], 'abc')
      tree.set(['a', 'b', 'd'], 'abd')
      tree.set(['a', 'e'], 'ae')
      tree.set(['a', 'k'], 'ak')
      tree.set(['f'], 'f')
      tree.set(['g', 'h'], 'gh')
      tree.set(['a'], 'a')

      expect([...tree.find(['a', 'b'])!]).toEqual(['abc', 'abd'])
    })
  })
})
