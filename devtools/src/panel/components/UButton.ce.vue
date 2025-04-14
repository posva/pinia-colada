<script setup lang="ts"></script>

<template>
  <button
    type="button"
    class="bg-theme-400 hover:bg-theme-600 dark:bg-theme-400 dark:hover:bg-theme-300 font-medium rounded-lg px-2 py-2 hover:cursor-pointer focus-visible:outline-theme focus-visible:outline-offset-2 focus-visible:outline-2 transition-colors"
  >
    <slot />
  </button>
</template>
