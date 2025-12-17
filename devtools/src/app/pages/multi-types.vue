<script lang="ts" setup>
import { useQuery, useQueryCache } from '@pinia/colada'

const { data } = useQuery({
  key: ['types-test'],
  query: async () => ({
    string: 'Hello, world!',
    number: 42,
    boolean: true,
    nullValue: null,
    undefinedValue: undefined,
    object: {
      key: 'value',
      nested: { key2: 'value2', nested: { a: 'a', nested: { more: 'nesting!' } } },
    },
    emptyObject: {},
    array: [1, 2, 3, { nested: 'object', map: new Map() }],
    emptyArray: [],
    date: new Date(),
    fn: () => 'This is a function',
    symbol: Symbol('unique'),
    anonymousSymbol: Symbol(),
    globalSymbol: Symbol.for('global'),
    bigint: 12345678901234567890n,
    regex: /test/i,
    map: new Map<unknown, unknown>([
      ['key1', 'value1'],
      ['key2', 'value2'],
      [2, new Date()],
    ]),
    set: new Set<unknown>([1, 2, 3, new Date()]),
    weakMap: new WeakMap([[{}, 'value']]),
    weakSet: new WeakSet([{}]),
    arrayBuffer: new ArrayBuffer(8),
    typedArray: new Uint8Array([1, 2, 3]),
    promise: Promise.resolve('This is a promise'),
    error: new Error('This is an error'),
    classInstance: new (class MyClass {
      constructor(public prop: string) {}
    })('Instance of MyClass'),
  }),
})

const queryCache = useQueryCache()
function updateData(path: Array<string | number>, value: unknown) {
  console.log('Update data at path', path, 'to value', value)

  queryCache.setQueryData(['types-test'], (oldData: any) => {
    while (path.length > 1) {
      const key = path.shift()!
      if (oldData && typeof oldData === 'object' && key in oldData) {
        oldData = oldData[key]
      } else {
        return oldData
      }
    }
    oldData[path[0]!] = value

    return oldData
  })
}
</script>

<template>
  <main class="big-layout">
    <h1 class="mb-12">All types display test</h1>

    <p>Data requires custom serialization. Has data: {{ !!data }}</p>

    <JsonViewer :data @update:value="updateData" />
  </main>
</template>
