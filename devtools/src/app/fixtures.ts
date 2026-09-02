export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createValueFixture(revision: number) {
  const weakMapKey = {}
  const weakSetValue = {}
  const nullPrototypeObject = Object.assign(Object.create(null) as Record<string, unknown>, {
    label: 'null prototype',
    revision,
  })
  const sparseArray = Array<unknown>(4)
  sparseArray[1] = 'one'
  sparseArray[3] = revision
  const sharedObject = { label: 'shared object', revision }

  return {
    revision,
    string: 'Hello from the local fixture',
    number: 42,
    nan: Number.NaN,
    infinity: Number.POSITIVE_INFINITY,
    negativeInfinity: Number.NEGATIVE_INFINITY,
    negativeZero: -0,
    boxedNumber: Object(42),
    boxedString: Object('fixture text'),
    boolean: true,
    nullValue: null,
    undefinedValue: undefined,
    nested: {
      object: { level: { deep: { revision } } },
      array: [1, 'two', false, null, { nested: 'value' }],
    },
    emptyObject: {},
    nullPrototypeObject,
    emptyArray: [],
    sparseArray,
    sharedReferences: { first: sharedObject, second: sharedObject },
    date: new Date(),
    fn: function fixtureFunction() {
      return revision
    },
    symbol: Symbol('fixture'),
    anonymousSymbol: Symbol(),
    globalSymbol: Symbol.for('pinia-colada-fixture'),
    bigint: 12_345_678_901_234_567_890n,
    regexp: /pinia-colada/gi,
    url: new URL('https://pinia-colada.esm.dev/guide/?fixture=url#example'),
    urlSearchParams: new URLSearchParams({ fixture: 'search params', revision: String(revision) }),
    map: new Map<unknown, unknown>([
      ['revision', revision],
      [{ objectKey: true }, new Date()],
    ]),
    set: new Set<unknown>([1, 'two', new Date()]),
    weakMap: new WeakMap([[weakMapKey, 'hidden value']]),
    weakSet: new WeakSet([weakSetValue]),
    arrayBuffer: new ArrayBuffer(16),
    blob: new Blob(['Pinia Colada fixture'], { type: 'text/plain' }),
    file: new File(['Pinia Colada fixture'], 'fixture.txt', {
      type: 'text/plain',
      lastModified: 1_788_295_200_000,
    }),
    typedArray: new Uint16Array([1, 2, 65_535]),
    dataView: new DataView(new ArrayBuffer(8)),
    promise: Promise.resolve('resolved fixture promise'),
    error: new TypeError('Example value error'),
    errorWithCause: new Error('Fixture operation failed', {
      cause: new TypeError('Fixture root cause'),
    }),
    aggregateError: new AggregateError(
      [new TypeError('First fixture error'), new RangeError('Second fixture error')],
      'Multiple fixture operations failed',
    ),
    classInstance: new (class FixtureClass {
      constructor(
        public label: string,
        public revision: number,
      ) {}
    })('class instance', revision),
  }
}
