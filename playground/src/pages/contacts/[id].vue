<script lang="ts" setup>
import { useRoute } from 'vue-router/auto'
import { useMutation, useQuery } from '@pinia/colada'
import ContactCard from '@/components/ContactCard.vue'
import { type Contact, updateContact as _updateContact, getContactById } from '@/api/contacts'

const route = useRoute('/contacts/[id]')

const { data: contact, state } = useQuery({
  key: () => ['contacts', route.params.id],
  query: ({ signal }) => getContactById(route.params.id, { signal }),
})

const { mutate: updateContact } = useMutation({
  keys: ({ id }) => [['contacts-search'], ['contacts', id]],
  mutation: (contact: Partial<Contact> & { id: number }) => _updateContact(contact),
})
</script>

<template>
  <section class="flex-grow pt-6 md:pt-0">
    <ContactCard
      v-if="contact"
      :key="contact.id"
      :contact="contact"
      @update:contact="updateContact"
    />
  </section>

  <template v-if="state.status === 'pending'">
    Loading...
  </template>
  <template v-else-if="state.status === 'error'">
    <div>Error: {{ state.error }}</div>
  </template>
  <template v-else>
    <ContactCard :contact="state.data" />
  </template>
</template>
