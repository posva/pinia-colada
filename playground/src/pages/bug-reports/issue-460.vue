<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()

function prefetch() {
  queryCache.refresh(
    queryCache.ensure({
      key: ['issue-460'],
      query: async () => 'ok',
      gcTime: 10_000, // 10 seconds
    }),
  )
}
</script>

<template>
  <main class="max-w-3xl mx-auto p-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-4">Prefetched Query GC Display</h1>

    <p class="text-gray-600 mb-8">
      When a query is prefetched without any active observers, DevTools should display the correct
      garbage collection timing instead of showing an incorrect timestamp like "56 years ago".
    </p>

    <section class="bg-gray-50 rounded-lg p-6 mb-6">
      <p class="text-xl font-semibold text-gray-800 mt-0 mb-3">Steps to Test</p>
      <ol class="list-decimal list-inside space-y-2 text-gray-700">
        <li>Open DevTools and navigate to the Pinia Colada panel</li>
        <li>Click the "Prefetch" button below to create a query without observers</li>
        <li>
          Find the query with key
          <code class="px-1.5 py-0.5 bg-gray-200 rounded text-sm font-mono">["issue-460"]</code> in
          DevTools
        </li>
        <li>Check that the GC time displays <strong>~10 seconds</strong> (not "56 years ago")</li>
      </ol>
    </section>

    <div class="flex gap-3 mb-6">
      <button
        class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
        @click="prefetch"
      >
        Prefetch
      </button>
    </div>
  </main>
</template>
