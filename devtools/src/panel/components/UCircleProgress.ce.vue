<script setup lang="ts">
import { computed } from 'vue'

const {
  value,
  min = 0,
  max = 100,
} = defineProps<{
  value: number
  min?: number
  max?: number
}>()

const valuePercentage = computed(() => Math.round(((value - min) / (max - min)) * 100))
</script>

<template>
  <div class="progress-bar">
    <progress :min :max :value />
  </div>
</template>

<style scoped>
.progress-bar {
  --width: 67%;
  --progress-value: v-bind(valuePercentage);

  border-radius: 50%;

  background:
    radial-gradient(
      closest-side,
      var(--ui-bg) var(--width),
      transparent calc(var(--width) + 1%) 100%
    ),
    conic-gradient(
      currentColor calc(var(--progress-value) * 1%),
      color-mix(in hsl, currentColor 20%, transparent) 0
    );
}

progress {
  visibility: hidden;
  width: 0;
  height: 0;
}
</style>
