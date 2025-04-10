<script setup lang="ts">

</script>

<template>
  <button class="btn">
    <slot />
  </button>
</template>

<style>
.btn {
  --bg-color: var(--ui-success);
  background-color: var(--bg-color);
  color: var(--color-slate-900);
  padding: 0.5em 1em;
  border-radius: 0.25em;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: color-mix(in lch, var(--bg-color), var(--color-slate-100) 5%);
  }

  &:active {
    background-color: color-mix(in hsl, var(--bg-color), var(--color-slate-900) 10%);
  }
}
</style>
