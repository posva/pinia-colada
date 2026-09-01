import { describe, expect, it } from 'vitest'
import { serializeDevtoolsValue } from './index'

describe('serializeDevtoolsValue', () => {
  it('does not expose nested source objects to consumers', () => {
    const source = { devtools: { updatedAt: 1 } }
    const serialized = serializeDevtoolsValue(source)

    expect(serialized).not.toBe(source)
    expect(serialized.devtools).not.toBe(source.devtools)

    Object.freeze(serialized.devtools)
    expect(() => (source.devtools.updatedAt = 2)).not.toThrow()
  })
})
