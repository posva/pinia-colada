<script lang="ts" setup>
import {
  getContactById,
} from '@/api/contacts'
import { useQuery } from '@pinia/colada'
import { useRoute } from 'vue-router/auto'

const route = useRoute('/warnings/duped-[contactId]')

const { data: contact, error, asyncStatus } = useQuery({
  key: () => ['contacts', route.params.contactId],
  query: ({ signal }) => getContactById(route.params.contactId, { signal }),
})

// oops
useQuery({
  key: () => ['contacts', route.params.contactId],
  query: ({ signal }) => getContactById(route.params.contactId, { signal }),
})
</script>

<template>
  <section class="flex-grow pt-6 md:pt-0">
    <pre>{{ asyncStatus }}</pre>
    <template v-if="error">
      <div>Error: {{ error }}</div>
    </template>

    <template v-if="asyncStatus === 'loading'">
      <p>Loading...</p>
    </template>
    <pre>{{ contact }}</pre>
  </section>
</template>
