<script setup lang="ts">
import { factsApi } from '@/api/cat-facts'
import type { CatFacts } from '@/api/cat-facts'
import { useInfiniteQuery } from '@pinia/colada'
import { onWatcherCleanup, useTemplateRef, watch } from 'vue'

const {
  data: facts,
  loadNextPage,
  asyncStatus,
  hasNextPage,
} = useInfiniteQuery({
  key: ['feed'],
  query: async ({ pageParam }) => factsApi.get<CatFacts>({ query: { page: pageParam, limit: 10 } }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => (lastPage.next_page_url ? lastPage.current_page + 1 : null),
})

const loadMoreEl = useTemplateRef('load-more')

watch(loadMoreEl, (el) => {
  if (el) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadNextPage()
        }
      },
      {
        rootMargin: '300px',
        threshold: [0],
      },
    )
    observer.observe(el)
    onWatcherCleanup(() => {
      observer.disconnect()
    })
  }
})
</script>

<template>
  <div>
    <button :disabled="asyncStatus === 'loading'" @click="loadNextPage()">
      Load more (or scroll down)
    </button>
    <template v-if="facts?.pages">
      <p>We have loaded {{ facts.pages.length }} pages</p>
      <details>
        <summary>Show raw</summary>
        <pre>{{ facts }}</pre>
      </details>

      <template v-for="page in facts.pages" :key="page.current_page">
        <blockquote v-for="item in page.data" :key="item.fact">
          {{ item.fact }}
        </blockquote>
      </template>

      <p v-if="hasNextPage" ref="load-more">Loading more...</p>
    </template>
  </div>
</template>
