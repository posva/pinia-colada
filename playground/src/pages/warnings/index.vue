<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const contactId = computed(() => {
  if ('contactId' in route.params) {
    return route.params.contactId
  }
  return '1'
})
</script>

<template>
  <nav>
    <RouterLink
      :to="{ name: '/warnings/duped-[contactId]', params: { contactId } }"
    >
      Duplicated usage within component
    </RouterLink>
    |
    <RouterLink
      :to="{ name: '/warnings/usage-one-[contactId]', params: { contactId } }"
    >
      Duplicated usage across components
    </RouterLink>
  </nav>
</template>
