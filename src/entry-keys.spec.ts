import { describe, expect, it } from 'vite-plus/test'
import { find, toCacheKey } from './entry-keys'
import type { EntryKey } from './entry-keys'

interface _TestEntry {
  key: EntryKey | undefined
  data: string
}

function createEntry(
  key: EntryKey | undefined,
  data: string,
): [keyHash: string, entry: _TestEntry] {
  const keyHash = toCacheKey(key || [])
  return [keyHash, { key, data }]
}

describe('toCacheKey', () => {
  it('works', () => {
    const map = new Map<string, _TestEntry>()
    map.set(...createEntry(['a'], 'a'))
    expect(map.get(toCacheKey(['a']))).toEqual({ key: ['a'], data: 'a' })
    map.set(...createEntry(['a', 'b'], 'ab'))
    expect(map.get(toCacheKey(['a', 'b']))?.data).toBe('ab')
    map.set(...createEntry(['a', 'b', 'c'], 'abc'))
    map.set(...createEntry(['a', 'b', 'd'], 'abd'))
    expect(map.get(toCacheKey(['a', 'b', 'c']))?.data).toBe('abc')
    expect(map.get(toCacheKey(['a', 'b', 'd']))?.data).toBe('abd')

    map.set(...createEntry(['a'], 'a2'))
    expect(map.get(toCacheKey(['a']))?.data).toBe('a2')
    map.set(...createEntry(['a', 'b'], 'ab2'))
    expect(map.get(toCacheKey(['a', 'b']))?.data).toBe('ab2')

    map.set(...createEntry(['a', 'e'], 'ae'))
    map.set(...createEntry(['f'], 'f'))
    expect(map.get(toCacheKey(['a', 'e']))?.data).toBe('ae')
    expect(map.get(toCacheKey(['f']))?.data).toBe('f')
  })
})

describe('find()', () => {
  it('works', () => {
    const map = new Map<string, _TestEntry>()

    map.set(...createEntry(['a', 'b', 'c'], 'abc'))
    map.set(...createEntry(['a', 'b', 'd'], 'abd'))
    map.set(...createEntry(['a', 'e'], 'ae'))
    map.set(...createEntry(['a', 'k'], 'ak'))
    map.set(...createEntry(['f'], 'f'))
    map.set(...createEntry(['g', 'h'], 'gh'))

    expect([...find(map, ['f']).map((e) => e.data)]).toEqual(['f'])

    expect([...find(map, ['a', 'b']).map((e) => e.data)]).toEqual(['abc', 'abd'])
    expect([...find(map, ['a', 'b', 'c']).map((e) => e.data)]).toEqual(['abc'])
    expect([...find(map, ['a', 'b', 'd']).map((e) => e.data)]).toEqual(['abd'])
    expect([...find(map, ['g']).map((e) => e.data)]).toEqual(['gh'])
    expect([...find(map, ['g', 'h']).map((e) => e.data)]).toEqual(['gh'])
  })

  it('works on empty', () => {
    const map = new Map<string, _TestEntry>()
    expect([...find(map, ['a', 'b']).map((e) => e.data)]).toEqual([])
    expect([...find(map, []).map((e) => e.data)]).toEqual([])
    expect([...find(map).map((e) => e.data)]).toEqual([])
  })
})
