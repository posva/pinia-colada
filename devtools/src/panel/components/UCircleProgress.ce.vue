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

const valuePercentage = computed(() =>
  Math.min(100, Math.max(0, Math.round(((value - min) / (max - min)) * 100))),
)
</script>

<template>
  <div class="progress-bar" aria-hidden>
    <svg viewBox="0 0 10 10">
      <circle class="bg" cx="5" cy="5" r="4" :stroke-width />
      <circle
        class="fg"
        cx="5"
        cy="5"
        r="4"
        pathLength="100"
        :stroke-width
        :stroke-dasharray="`${valuePercentage} ${100 - valuePercentage}`"
      />
    </svg>
  </div>
</template>

<style scoped>
.progress-bar > svg {
  display: block;
  width: 1em;
  height: 1em;
}

.progress-bar circle {
  fill: none;
  stroke-linecap: butt;
}

.progress-bar circle.bg {
  stroke: color-mix(in hsl, currentColor 25%, var(--ui-bg));
}

.progress-bar circle.fg {
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dasharray 0.3s linear 0s;
  stroke: currentColor;
}
</style>
