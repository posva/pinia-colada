<script setup lang="ts"></script>

<template>
  <button
    type="button"
    class="bg-theme-400 hover:bg-theme-600 dark:bg-theme-400 dark:hover:bg-theme-300 font-medium rounded-lg px-5 py-2.5 me-2 mb-2 hover:cursor-pointer focus-visible:outline-theme focus-visible:outline-offset-2 focus-visible:outline-2"
  >
    <slot />
  </button>
</template>
