<script setup lang="ts">
import { HomeIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'

const navigation = [
  { name: 'Product', href: '#' },
  { name: 'Features', href: '#' },
  { name: 'Marketplace', href: '#' },
  { name: 'Company', href: '#' },
]

const open = ref(false)
</script>

<template>
  <nav class="flex items-center justify-between p-6 mx-auto lg:px-8" aria-label="Global">
    <div class="flex lg:flex-1">
      <RouterLink to="/" class="-m-1.5 p-1.5">
        <HomeIcon class="w-6 h-6" aria-hidden="true" />
      </RouterLink>
    </div>
    <div class="flex lg:hidden">
      <button
        type="button"
        class="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
      >
        <span class="sr-only">Open main menu</span>
        <SparklesIcon class="w-6 h-6" aria-hidden="true" />
      </button>
    </div>
    <div class="hidden lg:flex lg:gap-x-12">
      <a
        v-for="item in navigation"
        :key="item.name"
        :href="item.href"
        class="text-sm font-semibold leading-6 text-gray-900"
      >{{ item.name }}</a>
      <a href="/about"> A propos </a>
    </div>
    <div class="hidden lg:flex lg:flex-1 lg:justify-end">
      <button class="text-sm font-semibold leading-6 text-gray-900" @click="open = true">
        Basket<span aria-hidden="true">&rarr;</span>
      </button>
    </div>
  </nav>
  <TheSlideOver :open="open" />
</template>
