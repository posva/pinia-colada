<script setup lang="ts">
import { usePage } from '@/queries/issue-174'
import { toCacheKey, useQueryCache } from '@pinia/colada'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute('/bug-reports/issue-174/[slug]')

const { state, asyncStatus } = usePage()
// await refresh();
// const { state, asyncStatus } = useQuery({
//   key: () => ["pages", route.params.slug as string],
//   query: () => delay(route.params.slug as string),
//   staleTime: 1000,
//   gcTime: 2000,
// });

const queryCache = useQueryCache()

/* const {data} = useQuery({
        key: () => ['pages', route.params.slug as string],
        query: () => delay(route.params.slug as string)
    })

    function delay(str: string) {
        return new Promise(resolve => setTimeout(() => {
        resolve(str);
    }, 200));
    } */

const entryOne = computed(() => {
  const entry = queryCache.getEntries({ key: ['pages', 'page1'] }).at(0)
  return (
    entry && {
      state: entry.state,
      active: entry.active,
      depSize: entry.deps.size,
      gcTimeout: entry.gcTimeout,
    }
  )
})
const entryTwo = computed(() => {
  return queryCache.getEntries({ key: ['pages', 'page2'] }).at(0)
})
</script>

<template>
  <div>
    <pre>slug: {{ route.params.slug }}</pre>
    <pre>test data: {{ state }}</pre>
    <pre>asyncStatus: {{ asyncStatus }}</pre>

    <hr>

    entryOne:
    <pre v-if="entryOne">{{ entryOne }}</pre>
    entryTwo:
    <pre v-if="entryTwo">
active: {{ entryTwo.active }}
gcTimeout: {{ entryTwo.gcTimeout }}
state: {{ entryTwo.state }}
deps size: {{ entryTwo.deps.size }}
when: {{ entryTwo.when }}
stale: {{ entryTwo.stale }}
        </pre>
  </div>
</template>
