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

  it('stringifies invalid dates for display', () => {
    expect(miniJsonStringify({ date: new Date(Number.NaN) })).toBe(`{
  "date": "Invalid Date"
}`)
  })

  it('stringifies circular references for display', () => {
    const circular: Record<string, unknown> = { label: 'circular' }
    circular.self = circular

    expect(miniJsonStringify(circular)).toBe(`{
  "label": "circular",
  "self": "[Circular]"
}`)
  })

  it('does not treat shared references as circular', () => {
    const shared = { label: 'shared' }

    expect(miniJsonStringify({ first: shared, second: shared })).toBe(`{
  "first": {
    "label": "shared"
  },
  "second": {
    "label": "shared"
  }
}`)
  })
})
