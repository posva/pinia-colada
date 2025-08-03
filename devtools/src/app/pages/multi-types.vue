<script lang="ts" setup>
import { useQuery } from '@pinia/colada'

const { data } = useQuery({
  key: ['types-test'],
  query: async () => ({
    string: 'Hello, world!',
    number: 42,
    boolean: true,
    nullValue: null,
    undefinedValue: undefined,
    object: { key: 'value', nested: { key2: 'value2' } },
    array: [1, 2, 3, { nested: 'object' }],
    date: new Date(),
    fn: () => 'This is a function',
    symbol: Symbol('unique'),
    anonymousSymbol: Symbol(),
    globalSymbol: Symbol.for('global'),
    bigint: 12345678901234567890n,
    regex: /test/i,
    map: new Map([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]),
    set: new Set([1, 2, 3]),
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
</script>

<template>
  <main class="big-layout">
    <h1 class="mb-12">
      All tyes display test
    </h1>

    <p>Data requires custom serialization. Has data: {{ !!data }}</p>
  </main>
</template>
