<script lang="ts" setup>
import { useRoute } from 'vue-router/auto'
import { useMutation, useQuery } from '@pinia/colada'
import ContactCard from '@/components/ContactCard.vue'
import { updateContact as _updateContact, getContactById } from '@/api/contacts'

const route = useRoute('/contacts/[id]')

const { data: contact } = useQuery({
  key: () => ['contacts', route.params.id],
  query: ({ signal }) => getContactById(route.params.id, { signal }),
})

const { mutate: updateContact } = useMutation({
  keys: ({ id }) => [['contacts-search'], ['contacts', id]],
  mutation: _updateContact,
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
</template>
