import { describe, expect, it } from 'vitest'
import { miniJsonParse, miniJsonStringify } from './query-serialized'

describe('miniJsonParse', () => {
  it('serializes nested non-circular values', () => {
    expect(
      miniJsonParse({ key: [null, 42, 'text', true, false, { 'quoted-key': undefined }] }),
    ).toBe('{key:[null,42,"text",true,false,{"quoted-key":undefined}]}')
  })

  it('serializes circular objects using the display marker', () => {
    const circular: Record<string, unknown> = { label: 'circular' }
    circular.self = circular

    expect(miniJsonParse(circular)).toBe('{label:"circular",self:"[Circular]"}')
  })

  it('serializes circular arrays using the display marker', () => {
    const circular: unknown[] = [1]
    circular.push(circular)

    expect(miniJsonParse(circular)).toBe('[1,"[Circular]"]')
  })

  it('detects cycles through nested objects and arrays', () => {
    const circular: Record<string, unknown> = {}
    circular.items = [{ parent: circular }]

    expect(miniJsonParse(circular)).toBe('{items:[{parent:"[Circular]"}]}')
  })

  it('does not treat shared objects or arrays as circular', () => {
    const shared = { label: 'shared' }
    const array = [shared]

    expect(miniJsonParse([array, array, shared])).toBe(
      '[[{label:"shared"}],[{label:"shared"}],{label:"shared"}]',
    )
  })
})

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
