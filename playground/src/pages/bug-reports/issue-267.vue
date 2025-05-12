<script setup lang="ts">
import RepeatedComponent from '@/components/bug-reports/issue-267.vue'
</script>

<template>
  <div>
    <RepeatedComponent v-for="i in 10" :id="i" :key="i" />
  </div>
</template>
