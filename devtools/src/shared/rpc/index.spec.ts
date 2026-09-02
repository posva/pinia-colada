import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { formatValue } from '../json'
import { restoreClonedDeep, serializeDevtoolsValue } from './index'

describe('serializeDevtoolsValue', () => {
  it('preserves negative zero when formatting values', () => {
    expect(formatValue(restoreClonedDeep(serializeDevtoolsValue(-0)))).toBe('-0')
  })

  it('does not expose nested source objects to consumers', () => {
    const source = { devtools: { updatedAt: 1 } }
    const serialized = serializeDevtoolsValue(source)

    expect(serialized).not.toBe(source)
    expect(serialized.devtools).not.toBe(source.devtools)

    Object.freeze(serialized.devtools)
    expect(() => (source.devtools.updatedAt = 2)).not.toThrow()
  })

  it('restores displayable values from their wire representation', () => {
    const values = {
      date: new Date('2026-09-01T12:00:00.000Z'),
      fn: function fixtureFunction() {},
      symbol: Symbol('fixture'),
      bigint: 12_345n,
      regexp: /pinia-colada/gi,
      url: new URL('https://pinia-colada.esm.dev/guide/?fixture=url#example'),
      urlSearchParams: new URLSearchParams({ fixture: 'search params', revision: '1' }),
      map: new Map([['date', new Date('2026-09-01T12:00:00.000Z')]]),
      set: new Set([/pinia-colada/gi]),
      error: new TypeError('fixture error'),
      buffer: new ArrayBuffer(16),
      instance: new (class FixtureClass {
        label = 'fixture'
      })(),
    }

    const restored = restoreClonedDeep(serializeDevtoolsValue(values))

    expect(restored.date).toEqual(values.date)
    expect(formatValue(reactive(restored).date)).toBe('Date(2026-09-01T12:00:00.000Z)')
    expect(formatValue(restored.fn)).toBe('[Function fixtureFunction]')
    expect(restored.symbol).toBeTypeOf('symbol')
    expect(restored.bigint).toBe(12_345n)
    expect(restored.regexp).toEqual(values.regexp)
    expect(restored.url).toEqual(values.url)
    expect(restored.urlSearchParams).toEqual(values.urlSearchParams)
    expect(restored.map).toEqual(values.map)
    expect(restored.set).toEqual(values.set)
    expect(restored.error).toBeInstanceOf(Error)
    expect(restored.error.name).toBe('TypeError')
    expect(restored.error.message).toBe('fixture error')
    expect(formatValue(restored.error)).toBe('TypeError(fixture error)')
    expect(formatValue(restored.buffer)).toBe('[ArrayBuffer 16 bytes]')
    expect(formatValue(restored.instance)).toBe('FixtureClass')
    expect(Object.keys(restored.instance)).toEqual(['label'])
  })
})
