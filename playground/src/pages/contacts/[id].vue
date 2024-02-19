<script lang="ts" setup>
import ContactCard from '@/components/ContactCard.vue'
import { getContactById, updateContact as _updateContact } from '@/api/contacts'
import { useRoute } from 'vue-router/auto'
import { useQuery, useMutation } from '@pinia/colada'

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
