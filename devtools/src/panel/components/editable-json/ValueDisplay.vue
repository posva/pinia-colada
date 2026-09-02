<script setup lang="ts">
import { computed } from 'vue'
import { getValueDisplayTokens } from '@pinia/colada-devtools/shared'

const { value } = defineProps<{ value: unknown }>()

const tokens = computed(() => getValueDisplayTokens(value))
</script>

<template>
  <span v-for="(token, index) in tokens" :key="index" :class="token.class">{{ token.text }}</span>
</template>
