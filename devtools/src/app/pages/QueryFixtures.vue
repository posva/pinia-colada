<script setup lang="ts">
import { ref } from 'vue'
import { useQuery, useQueryCache } from '@pinia/colada'
import { createValueFixture, delay } from '../fixtures.ts'

const revision = ref(0)
const failNextFetch = ref(false)
const queryCache = useQueryCache()

const valuesQuery = useQuery({
  key: ['fixtures', 'all-value-types'],
  staleTime: 5_000,
  gcTime: 30_000,
  async query() {
    await delay(250)
    revision.value++
    if (failNextFetch.value) {
      failNextFetch.value = false
      throw new TypeError(`Fixture fetch ${revision.value} failed`)
    }
    return createValueFixture(revision.value)
  },
})

const slowQuery = useQuery({
  key: ['fixtures', 'slow-query'],
  async query() {
    await delay(3_000)
    return { finishedAt: new Date(), message: 'The slow query completed' }
  },
})

function updateCachedValue() {
  queryCache.setQueryData(['fixtures', 'all-value-types'], (data) =>
    data
      ? {
          ...data,
          editedInFixture: `Cache edit ${Date.now()}`,
        }
      : data,
  )
}

function refetchWithError() {
  failNextFetch.value = true
  void valuesQuery.refetch()
}
</script>

<template>
  <main>
    <h1>Queries and serialized values</h1>
    <p>
      These queries are entirely local. Open Pinia Colada in Vite DevTools to inspect, edit,
      invalidate, refetch, reset, and simulate their states.
    </p>

    <section>
      <h2>All supported value shapes</h2>
      <p>
        Status: <strong>{{ valuesQuery.status.value }}</strong> · Fetch:
        <strong>{{ valuesQuery.asyncStatus.value }}</strong> · Revision:
        <strong>{{ valuesQuery.data.value?.revision ?? '—' }}</strong>
      </p>
      <div class="actions">
        <button @click="valuesQuery.refetch()">Refetch values</button>
        <button class="danger" @click="refetchWithError">Fail next refetch</button>
        <button @click="updateCachedValue">Edit cached data</button>
      </div>
      <pre>{{ valuesQuery.data.value }}</pre>
    </section>

    <section>
      <h2>Slow query</h2>
      <p>Runs for three seconds so loading and cancellation are easy to inspect.</p>
      <p>
        Status: <strong>{{ slowQuery.status.value }}</strong> · Fetch:
        <strong>{{ slowQuery.asyncStatus.value }}</strong>
      </p>
      <button @click="slowQuery.refetch()">Run slow query</button>
    </section>
  </main>
</template>
