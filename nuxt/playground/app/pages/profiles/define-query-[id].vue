<script setup lang="ts">
import { useProfileInfo } from '~/queries/contacts'
import { useRoute as vrUseRoute } from 'vue-router'

const vrRoute = vrUseRoute()
const route = useRoute()
console.log('🥒 mounting!', route.fullPath, vrRoute.fullPath)
const { data } = useProfileInfo()
</script>

<template>
  <div>
    <pre>{{ data }}</pre>
  </div>
</template>
