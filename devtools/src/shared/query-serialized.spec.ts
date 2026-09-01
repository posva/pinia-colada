import { describe, expect, it } from 'vitest'
import { miniJsonStringify } from './query-serialized'

describe('miniJsonStringify', () => {
  it('stringifies BigInts for display', () => {
    expect(miniJsonStringify({ count: 12_345n })).toBe(`{\n  "count": "12345n"\n}`)
  })
})
