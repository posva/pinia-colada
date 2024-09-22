<script lang="ts" setup>
import {
  updateContact as _updateContact,
  type Contact,
  getContactById,
} from '@/api/contacts'
import ContactCard from '@/components/ContactCard.vue'
import { useMutation, useQuery } from '@pinia/colada'
import { useRoute } from 'vue-router/auto'

const route = useRoute('/warnings/usage-one-[contactId]')

const { data: contact, error, asyncStatus } = useQuery({
  key: () => ['contacts', route.params.contactId],
  query: ({ signal }) => getContactById(route.params.contactId, { signal }),
})

const { mutate: updateContact } = useMutation({
  // TODO: adapt with plugin
  keys: ({ id }) => [['contacts-search'], ['contacts', id]],
  mutation: (contact: Partial<Contact> & { id: number }) =>
    _updateContact(contact),
})
</script>

<template>
  <RouterLink :to="{ name: '/warnings/usage-two-[contactId]' }">
    Go to other page
  </RouterLink>

  <section class="flex-grow pt-6 md:pt-0">
    <pre>{{ asyncStatus }}</pre>
    <template v-if="error">
      <div>Error: {{ error }}</div>
    </template>

    <template v-if="asyncStatus === 'loading'">
      <p>Loading...</p>
    </template>

    <ContactCard
      v-if="contact"
      :key="contact.id"
      :contact="contact"
      @update:contact="updateContact"
    />
  </section>
</template>
