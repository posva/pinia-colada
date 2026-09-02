import { describe, expect, it } from 'vitest'
import { setNestedValue } from './set-nested-value'

describe('setNestedValue', () => {
  it('updates map values, including through object keys', () => {
    const objectKey = { id: 1 }
    const data = {
      map: new Map<unknown, unknown>([
        ['count', 1],
        [objectKey, { nested: 'before' }],
      ]),
    }

    expect(setNestedValue(data, ['map', 'count'], 2)).toBe(true)
    expect(setNestedValue(data, ['map', objectKey, 'nested'], 'after')).toBe(true)
    expect(data.map.get('count')).toBe(2)
    expect(data.map.get(objectKey)).toEqual({ nested: 'after' })
  })

  it('updates a map used as the root value', () => {
    const map = new Map<unknown, unknown>([['count', 1]])

    expect(setNestedValue(map, ['count'], 2)).toBe(true)
    expect(map.get('count')).toBe(2)
  })

  it('updates set values by their displayed index without changing their order', () => {
    const data = { set: new Set<unknown>(['one', 'two', 'three']) }

    expect(setNestedValue(data, ['set', 1], 'updated')).toBe(true)
    expect(Array.from(data.set)).toEqual(['one', 'updated', 'three'])
  })

  it('updates a set used as the root value', () => {
    const set = new Set<unknown>(['one', 'two'])

    expect(setNestedValue(set, [0], 'updated')).toBe(true)
    expect(Array.from(set)).toEqual(['updated', 'two'])
  })
})
