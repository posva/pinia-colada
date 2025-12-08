<script lang="ts" setup>
import { useQuery, useQueryCache } from '@pinia/colada'
import { ref, shallowRef } from 'vue'

const queryCache = useQueryCache()

// for logs
queryCache.$onAction(({ name, args }) => {
  if (name === 'remove') {
    const [entry] = args
    console.log('🗑️ Remove', entry.key.join('/'))
  } else {
    const [maybeEntry] = args
    let key: string = '<>'
    if (Array.isArray(maybeEntry)) {
      key = maybeEntry.join('/')
    } else if (maybeEntry && 'key' in maybeEntry && 'state' in maybeEntry) {
      key = maybeEntry.key.join('/')
    }

    console.log(`${name}: ${key}`)
  }
})

/**
 * Things that should work:
 * - Changing the id
 * - Changing the query
 */

// the main chunk that should be modified
const { state, refresh, refetch } = useQuery({
  key: ['id', '4', {}, { a: 1 }, { b: [2], c: true, d: null, e: undefined }],
  async query() {
    console.log('change me 3')
    return `id-${Date.now()}`
  },
  staleTime: 1000 * 1,
  gcTime: 1000 * 5,
})

const dataId = ref('id 1')
const dataFromRead = shallowRef()
function getData(key = ['id']) {
  console.log(queryCache.getEntries({ key: ['id'] }))
  dataFromRead.value = queryCache.getQueryData(key)
}
</script>

<template>
  <button @click="refresh()">Refresh</button>
  <button @click="refetch()">Refetch</button>

  <pre>{{ state }}</pre>

  <hr />

  <input v-model="dataId" type="text" />
  <button @click="getData(dataId.split(' ') || ['id'])">Refresh Data get</button>
  <pre>{{ dataFromRead }}</pre>
</template>
