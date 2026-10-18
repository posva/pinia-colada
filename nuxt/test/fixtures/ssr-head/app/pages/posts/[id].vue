<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { defineStore } from 'pinia'

defineOptions({ name: 'SsrHeadPostPage' })
definePageMeta({ name: 'ssr-head-post' })

const usePayloadProbeStore = defineStore('ssr-head-payload-probe', () => ({
  marker: ref('unrelated-store-preserved'),
}))

const route = useRoute()
const postId = computed(() => String(route.params.id))
const hydrated = ref(false)
const fetches = ref(0)
const payloadProbe = usePayloadProbeStore()
const posts = {
  one: { id: 'one', content: 'Post one body', user: { public_name: 'Author One' } },
  two: { id: 'two', content: 'Post two body', user: { public_name: 'Author Two' } },
} as const

const { data: post } = useQuery(() => ({
  key: ['ssr-head-post', { id: postId.value }],
  query: async () => {
    fetches.value++
    await Promise.resolve()
    const result = posts[postId.value as keyof typeof posts]
    if (!result) throw createError({ statusCode: 404, statusMessage: 'Post not found' })
    return result
  },
  staleTime: Infinity,
}))

useSeoMeta({
  title: () => post.value?.user.public_name,
  description: () => post.value?.content,
  ogTitle: () => post.value?.user.public_name,
  ogDescription: () => post.value?.content,
})

onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <main
    v-if="post"
    :data-post-id="post.id"
    :data-fetches="fetches"
    :data-hydrated="hydrated"
    :data-pinia-marker="payloadProbe.marker"
  >
    <h1>{{ post.user.public_name }}</h1>
    <p>{{ post.content }}</p>
    <NuxtLink :to="post.id === 'one' ? '/posts/two' : '/posts/one'">
      {{ post.id === 'one' ? 'Next post' : 'Previous post' }}
    </NuxtLink>
  </main>
</template>
