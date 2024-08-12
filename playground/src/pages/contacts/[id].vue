<script lang="ts" setup>
import { useRoute } from 'vue-router/auto'
import { useMutation, useQuery } from '@pinia/colada'
import ContactCard from '@/components/ContactCard.vue'
import {
  type Contact,
  updateContact as _updateContact,
  getContactById,
} from '@/api/contacts'

const route = useRoute('/contacts/[id]')

const { data: contact, error, asyncStatus } = useQuery({
  key: () => ['contacts', route.params.id],
  query: ({ signal }) => getContactById(route.params.id, { signal }),
})

const { mutate: updateContact } = useMutation({
  // TODO: adapt with plugin
  keys: ({ id }) => [['contacts-search'], ['contacts', id]],
  mutation: (contact: Partial<Contact> & { id: number }) =>
    _updateContact(contact),
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

    <ContactCard
      v-if="contact"
      :key="contact.id"
      :contact="contact"
      @update:contact="updateContact"
    />
  </section>
</template>
