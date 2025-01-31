<script setup lang="ts">
import { usePage } from '@/queries/issue-174'
import { useQueryCache } from '@pinia/colada'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute('/bug-reports/issue-174/[slug]')

const { state, refresh, asyncStatus } = usePage()
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
  return queryCache.getEntries({ key: ['pages', 'page1'] }).at(0)
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
    <pre v-if="entryOne">
active: {{ entryOne.active }}
gcTimeout: {{ entryOne.gcTimeout }}
state: {{ entryOne.state }}
deps size: {{ entryOne.deps.size }}
when: {{ entryOne.when }}
stale: {{ entryOne.stale }}
    </pre>
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
