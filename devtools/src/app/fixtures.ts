export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createValueFixture(revision: number) {
  const weakMapKey = {}
  const weakSetValue = {}

  return {
    revision,
    string: 'Hello from the local fixture',
    number: 42,
    nan: Number.NaN,
    infinity: Number.POSITIVE_INFINITY,
    negativeInfinity: Number.NEGATIVE_INFINITY,
    negativeZero: -0,
    boolean: true,
    nullValue: null,
    undefinedValue: undefined,
    nested: {
      object: { level: { deep: { revision } } },
      array: [1, 'two', false, null, { nested: 'value' }],
    },
    emptyObject: {},
    emptyArray: [],
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
    map: new Map<unknown, unknown>([
      ['revision', revision],
      [{ objectKey: true }, new Date()],
    ]),
    set: new Set<unknown>([1, 'two', new Date()]),
    weakMap: new WeakMap([[weakMapKey, 'hidden value']]),
    weakSet: new WeakSet([weakSetValue]),
    arrayBuffer: new ArrayBuffer(16),
    typedArray: new Uint16Array([1, 2, 65_535]),
    dataView: new DataView(new ArrayBuffer(8)),
    promise: Promise.resolve('resolved fixture promise'),
    error: new TypeError('Example value error'),
    classInstance: new (class FixtureClass {
      constructor(
        public label: string,
        public revision: number,
      ) {}
    })('class instance', revision),
  }
}
