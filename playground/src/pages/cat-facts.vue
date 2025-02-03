<script setup lang="ts">
import { factsApi, type CatFacts } from '@/api/cat-facts'
import { useInfiniteQuery } from '@pinia/colada'
import { onWatcherCleanup, useTemplateRef, watch } from 'vue'

const {
  state: facts,
  loadMore,
  asyncStatus,
  isDelaying,
} = useInfiniteQuery({
  key: ['feed'],
  query: async ({ nextPage }) =>
    nextPage != null ? factsApi.get<CatFacts>({ query: { page: nextPage, limit: 10 } }) : null,
  initialPage: {
    data: new Set<string>(),
    // null for no more pages
    nextPage: 1 as number | null,
  },
  merge(pages, newFacts) {
    // no more pages
    if (!newFacts) return pages
    // ensure we have unique entries even during HMR
    const data = new Set([...pages.data, ...newFacts.data.map((d) => d.fact)])
    return {
      data,
      nextPage: newFacts.next_page_url ? newFacts.current_page + 1 : null,
    }
  },
  // plugins
  retry: 0,
  delay: 0,
})

const loadMoreEl = useTemplateRef('load-more')

watch(loadMoreEl, (el) => {
  if (el) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
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
    <button :disabled="asyncStatus === 'loading' || isDelaying" @click="loadMore()">
      Load more (or scroll down)
    </button>
    <template v-if="facts?.data">
      <p>We have loaded {{ facts.data.data.size }} facts</p>
      <details>
        <summary>Show raw</summary>
        <pre>{{ facts }}</pre>
      </details>

      <blockquote v-for="fact in facts.data.data">
        {{ fact }}
      </blockquote>

      <p v-if="facts.data.nextPage" ref="load-more">Loading more...</p>
    </template>
  </div>
</template>
