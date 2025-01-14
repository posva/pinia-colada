<script setup lang="ts">
import { useQueryCache, useQuery } from '@pinia/colada'
import { ref, computed, onMounted } from 'vue'

const queryKey = ref(1)

const queryCache = useQueryCache()

/**
 * `data` should always be defined and is either `{ description: 'query result' }` or `{ description: 'placeholder' }`
 */
const { data } = useQuery({
  key: computed(() => ['common', queryKey.value]),
  query: async () => {
    return Promise.resolve({ description: 'query result' })
  },
  placeholderData: { description: 'placeholder' },
})

function clickHandler() {
  console.log('clickHandler invoked')

  /**
   * The issue only happens when you change the cache key and invalidate the key at the same time.
   * Performing only one of the two actions will not trigger the issue.
   */
  queryKey.value++
  queryCache.invalidateQueries({
    key: ['common'],
  })

  /**
   * In order to trigger the bug you need to access the prop immediately after the cache invalidation.
   * In our application this happened through a computed property that was used during the fetch of a secondary query but I was able to simplify it to this
   *
   * `data.value.description` should always be safe to access since we are using a `placeholder` value - but it is not
   *
   * 💥 BOOM 💥
   * TypeError: Cannot read properties of undefined (reading 'description'
   */
  console.log('[post invalidation] data', data.value.description)
}

onMounted(() => {
  console.log('[onMounted] data', data.value)
})
</script>

<template>
  <div>
    <button type="button" @click="clickHandler">
      Click me
    </button>
    <br>
    queryKey: {{ queryKey }}
    <br>
    data: {{ data }}
  </div>
</template>
