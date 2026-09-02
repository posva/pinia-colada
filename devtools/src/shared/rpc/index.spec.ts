import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { formatValue, getValueDetails, getValueDisplayTokens } from '../json'
import { restoreClonedDeep, serializeDevtoolsValue, trackPromise } from './index'

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

  it('preserves sparse array holes', () => {
    const sparse = Array(3)
    sparse[1] = 'one'

    const restored = restoreClonedDeep(serializeDevtoolsValue(sparse))

    expect(restored).toHaveLength(3)
    expect(0 in restored).toBe(false)
    expect(restored[1]).toBe('one')
  })

  it('displays repeated object references', () => {
    const shared = { label: 'shared object' }

    const restored = restoreClonedDeep(serializeDevtoolsValue({ first: shared, second: shared }))

    expect(restored.first).toEqual(shared)
    expect(formatValue(restored.second)).toMatch(/^\[Reference \*\d+]$/)
  })

  it('displays circular references without recursing indefinitely', () => {
    const circular: Record<string, unknown> = { label: 'circular object' }
    circular.self = circular

    const restored = restoreClonedDeep(serializeDevtoolsValue(circular))

    expect(restored.label).toBe('circular object')
    expect(formatValue(restored.self)).toMatch(/^\[Circular \*\d+]$/)
  })

  it('serializes tracked promise states and results', async () => {
    const pending = trackPromise(new Promise(() => {}))
    const fulfilled = trackPromise(Promise.resolve({ message: 'done' }))
    const rejected = trackPromise(Promise.reject(new TypeError('failed')))
    await Promise.resolve()

    const restored = restoreClonedDeep(serializeDevtoolsValue({ pending, fulfilled, rejected }))

    expect(formatValue(restored.pending)).toBe('[Promise pending]')
    expect(getValueDetails(restored.pending)).toEqual({ status: 'pending' })
    expect(getValueDetails(restored.fulfilled)).toEqual({
      status: 'fulfilled',
      value: { message: 'done' },
    })
    expect(getValueDetails(restored.rejected)).toMatchObject({
      status: 'rejected',
      reason: { name: 'TypeError', message: 'failed' },
    })
  })

  it('preserves restored custom values across an edited-data round trip', async () => {
    const fulfilled = trackPromise(Promise.resolve({ message: 'done' }))
    await Promise.resolve()
    const values = {
      edited: false,
      arrayBuffer: new ArrayBuffer(16),
      typedArray: new Uint16Array([1, 2, 3]),
      dataView: new DataView(new ArrayBuffer(8)),
      blob: new Blob(['fixture'], { type: 'text/plain' }),
      file: new File(['fixture'], 'fixture.txt', { type: 'text/plain', lastModified: 123 }),
      promise: fulfilled,
      url: new URL('https://pinia-colada.esm.dev/guide/'),
      urlSearchParams: new URLSearchParams({ fixture: 'params' }),
      instance: new (class FixtureClass {
        label = 'fixture'
      })(),
    }

    const restored = restoreClonedDeep(serializeDevtoolsValue(values))
    restored.edited = true
    const roundTripped = restoreClonedDeep(serializeDevtoolsValue(restored))

    expect(roundTripped.edited).toBe(true)
    expect(formatValue(roundTripped.arrayBuffer)).toBe('[ArrayBuffer 16 bytes]')
    expect(formatValue(roundTripped.typedArray)).toBe('[Uint16Array 6 bytes]')
    expect(formatValue(roundTripped.dataView)).toBe('[DataView 8 bytes]')
    expect(formatValue(roundTripped.blob)).toBe('[Blob 7 bytes]')
    expect(formatValue(roundTripped.file)).toBe('[File fixture.txt 7 bytes]')
    expect(formatValue(roundTripped.promise)).toBe('[Promise fulfilled]')
    expect(getValueDetails(roundTripped.promise)).toEqual({
      status: 'fulfilled',
      value: { message: 'done' },
    })
    expect(formatValue(roundTripped.url)).toBe('URL(https://pinia-colada.esm.dev/guide/)')
    expect(formatValue(roundTripped.urlSearchParams)).toBe('URLSearchParams(fixture=params)')
    expect(formatValue(roundTripped.instance)).toBe('FixtureClass')
    expect(Object.keys(roundTripped.instance)).toEqual(['label'])
  })

  it('restores displayable values from their wire representation', () => {
    const values = {
      date: new Date('2026-09-01T12:00:00.000Z'),
      invalidDate: new Date(Number.NaN),
      fn: function fixtureFunction() {},
      symbol: Symbol('fixture'),
      bigint: 12_345n,
      boxedNumber: Object(42),
      boxedString: Object('fixture text'),
      regexp: /pinia-colada/gi,
      url: new URL('https://pinia-colada.esm.dev/guide/?fixture=url#example'),
      urlSearchParams: new URLSearchParams({ fixture: 'search params', revision: '1' }),
      map: new Map([['date', new Date('2026-09-01T12:00:00.000Z')]]),
      set: new Set([/pinia-colada/gi]),
      error: new TypeError('fixture error'),
      errorWithCause: new Error('fixture operation failed', {
        cause: new TypeError('fixture root cause'),
      }),
      aggregateError: new AggregateError(
        [new TypeError('first fixture error'), new RangeError('second fixture error')],
        'multiple fixture operations failed',
      ),
      buffer: new ArrayBuffer(16),
      typedArray: new Uint16Array([1, 2, 65_535]),
      dataView: new DataView(new ArrayBuffer(8)),
      blob: new Blob(['Pinia Colada fixture'], { type: 'text/plain' }),
      file: new File(['Pinia Colada fixture'], 'fixture.txt', {
        type: 'text/plain',
        lastModified: 1_788_295_200_000,
      }),
      nullPrototypeObject: Object.assign(Object.create(null), { label: 'null prototype' }),
      instance: new (class FixtureClass {
        label = 'fixture'
      })(),
    }

    const restored = restoreClonedDeep(serializeDevtoolsValue(values))

    expect(restored.date).toEqual(values.date)
    expect(formatValue(reactive(restored).date)).toBe('Date(2026-09-01T12:00:00.000Z)')
    expect(getValueDisplayTokens(restored.date)).toEqual([
      { text: 'Date', class: 'text-(--devtools-syntax-object-blue)' },
      { text: '(', class: 'text-(--devtools-syntax-gray)' },
      { text: '2026-09-01T12:00:00.000Z', class: 'text-(--devtools-syntax-green)' },
      { text: ')', class: 'text-(--devtools-syntax-gray)' },
    ])
    expect(Number.isNaN(restored.invalidDate.getTime())).toBe(true)
    expect(formatValue(restored.invalidDate)).toBe('Invalid Date')
    expect(getValueDisplayTokens(restored.invalidDate)).toEqual([
      { text: 'Invalid Date', class: 'text-(--devtools-syntax-red)' },
    ])
    expect(formatValue(restored.fn)).toBe('ƒ fixtureFunction()')
    expect(getValueDisplayTokens(restored.fn).map((token) => token.text)).toEqual([
      'ƒ',
      ' fixtureFunction()',
    ])
    expect(restored.symbol).toBeTypeOf('symbol')
    expect(restored.bigint).toBe(12_345n)
    expect(formatValue(restored.boxedNumber)).toBe('Number {42}')
    expect(getValueDisplayTokens(restored.boxedNumber)).toEqual([
      { text: 'Number', class: 'text-(--devtools-syntax-object-blue)' },
      { text: ' {', class: 'text-(--devtools-syntax-gray)' },
      { text: '42', class: 'text-(--devtools-syntax-orange)' },
      { text: '}', class: 'text-(--devtools-syntax-gray)' },
    ])
    expect(formatValue(restored.boxedString)).toBe('String {"fixture text"}')
    expect(getValueDisplayTokens(restored.boxedString)).toEqual([
      { text: 'String', class: 'text-(--devtools-syntax-object-blue)' },
      { text: ' {', class: 'text-(--devtools-syntax-gray)' },
      { text: '"fixture text"', class: 'text-(--devtools-syntax-green)' },
      { text: '}', class: 'text-(--devtools-syntax-gray)' },
    ])
    expect(restored.regexp).toEqual(values.regexp)
    expect(formatValue(restored.url)).toBe(
      'URL(https://pinia-colada.esm.dev/guide/?fixture=url#example)',
    )
    expect(getValueDetails(restored.url)).toMatchObject({
      protocol: 'https:',
      hostname: 'pinia-colada.esm.dev',
      pathname: '/guide/',
    })
    expect(formatValue(restored.urlSearchParams)).toBe(
      'URLSearchParams(fixture=search+params&revision=1)',
    )
    expect(getValueDetails(restored.urlSearchParams)).toEqual({
      size: 2,
      entries: [
        ['fixture', 'search params'],
        ['revision', '1'],
      ],
    })
    expect(restored.map).toEqual(values.map)
    expect(restored.set).toEqual(values.set)
    expect(restored.error).toBeInstanceOf(Error)
    expect(restored.error.name).toBe('TypeError')
    expect(restored.error.message).toBe('fixture error')
    expect(formatValue(restored.error)).toBe('TypeError(fixture error)')
    expect(restored.errorWithCause.cause).toBeInstanceOf(Error)
    expect((restored.errorWithCause.cause as Error).name).toBe('TypeError')
    expect((restored.errorWithCause.cause as Error).message).toBe('fixture root cause')
    expect(restored.aggregateError).toBeInstanceOf(AggregateError)
    expect(restored.aggregateError.errors).toHaveLength(2)
    expect(restored.aggregateError.errors[0]).toMatchObject({
      name: 'TypeError',
      message: 'first fixture error',
    })
    expect(formatValue(restored.buffer)).toBe('[ArrayBuffer 16 bytes]')
    expect(getValueDetails(restored.buffer)).toEqual({
      byteLength: 16,
      detached: false,
      maxByteLength: 16,
      resizable: false,
    })
    expect(formatValue(restored.typedArray)).toBe('[Uint16Array 6 bytes]')
    expect(getValueDetails(restored.typedArray)).toMatchObject({
      byteLength: 6,
      byteOffset: 0,
      length: 3,
    })
    expect(formatValue(restored.dataView)).toBe('[DataView 8 bytes]')
    expect(getValueDetails(restored.dataView)).toMatchObject({ byteLength: 8, byteOffset: 0 })
    expect(formatValue(restored.blob)).toBe('[Blob 20 bytes]')
    expect(getValueDetails(restored.blob)).toEqual({ size: 20, type: 'text/plain' })
    expect(formatValue(restored.file)).toBe('[File fixture.txt 20 bytes]')
    expect(getValueDetails(restored.file)).toMatchObject({
      name: 'fixture.txt',
      size: 20,
      type: 'text/plain',
      lastModified: 1_788_295_200_000,
      webkitRelativePath: '',
    })
    expect(Object.getPrototypeOf(restored.nullPrototypeObject)).toBeNull()
    expect(formatValue(restored.nullPrototypeObject)).toBe('Object(null prototype)')
    expect(formatValue(restored.instance)).toBe('FixtureClass')
    expect(Object.keys(restored.instance)).toEqual(['label'])
  })
})
