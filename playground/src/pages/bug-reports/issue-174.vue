<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import { getCurrentInstance, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'

getCurrentInstance()!.appContext.app.provide('a', 'root')
provide('a', 'app.vue')

const queryCache = useQueryCache()
queryCache.$onAction(({ name, args }) => {
  // if (name === "track" || name === "untrack" || name === "remove") {
  //   console.warn("➡️", name, args);
  // }

  if (name === 'track') {
    const [entry, _effect] = args
    console.warn(
      '🐾 Track',
      entry.key,
      'active:',
      entry.active,
      'deps size:',
      entry.deps.size,
      'when:',
      entry.when,
      'stale:',
      entry.stale,
    )
  } else if (name === 'untrack') {
    const [entry] = args
    console.warn('🚫 Untrack', entry.key, 'deps size:', entry.deps.size)
  } else if (name === 'remove') {
    const [entry] = args
    console.warn('🗑 Remove', entry.key, 'deps size:', entry.deps.size)
  }
})

const router = useRouter()
const route = useRoute('/bug-reports/issue-174/[slug]')
function togglePage() {
  const slug = route.params.slug === 'page1' ? 'page2' : 'page1'
  router.push({ name: '/bug-reports/issue-174/[slug]', params: { slug } })
}
</script>

<template>
  <nav>
    <button @click="togglePage()">
      Toggle Page
    </button>
  </nav>

  <pre>{{ route.fullPath }}</pre>

  <RouterView />
</template>
