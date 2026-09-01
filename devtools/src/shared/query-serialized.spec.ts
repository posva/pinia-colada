import { describe, expect, it } from 'vitest'
import { miniJsonStringify } from './query-serialized'

describe('miniJsonStringify', () => {
  it('stringifies BigInts for display', () => {
    expect(miniJsonStringify({ count: 12_345n })).toBe(`{\n  "count": "12345n"\n}`)
  })

  it('preserves Dates as display values', () => {
    expect(miniJsonStringify({ date: new Date('2026-09-01T12:00:00.000Z') })).toBe(
      `{\n  "date": "Date(2026-09-01T12:00:00.000Z)"\n}`,
    )
  })
})
