<script setup lang="ts">
import { computed } from 'vue'

const {
  value,
  min = 0,
  max = 100,
  strokeWidth = 2,
} = defineProps<{
  value: number
  min?: number
  max?: number
  strokeWidth?: number
}>()

const valuePercentage = computed(() => Math.round(((value - min) / (max - min)) * 100))
</script>

<template>
  <div class="progress-bar" aria-hidden>
    <svg>
      <circle class="bg" />
      <circle class="fg" />
    </svg>
  </div>
</template>

<style scoped>
.progress-bar > svg {
  --progress-value: v-bind(valuePercentage);
  --size: 1em;
  --half-size: calc(var(--size) / 2);
  --stroke-width: calc(v-bind(strokeWidth) * var(--size) / 10);
  --radius: calc((var(--size) - var(--stroke-width)) / 2);
  --circumference: calc(var(--radius) * pi * 2);
  --dash: calc((var(--progress-value) * var(--circumference)) / 100);
  animation: progress-animation 100s linear 0s 1 forwards;

  width: var(--size);
  height: var(--size);
}

.progress-bar circle {
  cx: var(--half-size);
  cy: var(--half-size);
  r: var(--radius);
  stroke-width: var(--stroke-width);
  fill: none;
  stroke-linecap: butt;
}

.progress-bar circle.bg {
  stroke: color-mix(in hsl, currentColor 25%, var(--ui-bg));
}

.progress-bar circle.fg {
  transform: rotate(-90deg);
  transform-origin: var(--half-size) var(--half-size);
  stroke-dasharray: var(--dash) calc(var(--circumference) - var(--dash));
  transition: stroke-dasharray 0.3s linear 0s;
  stroke: currentColor;
}
</style>
