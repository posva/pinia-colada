<script setup lang="ts">
import { computed } from 'vue'
import ILucideCircleAlert from '~icons/lucide/circle-alert'
import ILucideSparkles from '~icons/lucide/sparkles'

const { type } = defineProps<{
  type: 'data' | 'error'
}>()

const title = computed(() => (type === 'error' ? 'New error' : 'New data'))
</script>

<template>
  <!-- Sit above UCollapse's checkbox overlay so the native title appears on hover. -->
  <span
    class="relative z-2 inline-flex cursor-help"
    :class="
      type === 'error' ? 'text-error-600 dark:text-error-400' : 'text-info-600 dark:text-info-400'
    "
    :title
    role="status"
  >
    <ILucideCircleAlert v-if="type === 'error'" class="size-3.5" aria-hidden />
    <ILucideSparkles v-else class="size-3.5" aria-hidden />
    <span class="sr-only">{{ title }}</span>
  </span>
</template>
