import { describe, expect, it } from 'vitest'
import { stringifyFlatObject } from './utils'

describe('utils', () => {
  describe('stringifyFlatObject', () => {
    it('stringifies an object no matter the order of keys', () => {
      expect(stringifyFlatObject({ a: 1, b: 2 })).toBe('{"a":1,"b":2}')
      expect(stringifyFlatObject({ b: 2, a: 1 })).toBe('{"a":1,"b":2}')
    })

    it('works with all primitives', () => {
      expect(stringifyFlatObject({ a: 1, b: 2 })).toBe('{"a":1,"b":2}')
      expect(stringifyFlatObject({ a: '1', b: '2' })).toBe('{"a":"1","b":"2"}')
      expect(stringifyFlatObject({ a: true, b: false })).toBe('{"a":true,"b":false}')
      expect(stringifyFlatObject({ a: null })).toBe('{"a":null}')
    })

    it('works with arrays', () => {
      expect(stringifyFlatObject({ a: [1, 2], b: [3, 4] })).toBe('{"a":[1,2],"b":[3,4]}')
      expect(stringifyFlatObject({ b: [1, 2], a: [3, 4] })).toBe('{"a":[3,4],"b":[1,2]}')
    })
  })
})
