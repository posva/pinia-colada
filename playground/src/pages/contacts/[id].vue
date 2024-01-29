<script lang="ts" setup>
import ContactCard from '@/components/ContactCard.vue'
import { getContactById, updateContact as _updateContact } from '@/api/contacts'
import { useRoute } from 'vue-router/auto'
import { useQuery, useMutation } from '@pinia/colada'

const route = useRoute('/contacts/[id]')
const { data: contact } = useQuery({
  key: () => 'contact/' + route.params.id,
  fetcher: () => getContactById(route.params.id),
})

const { mutate: updateContact } = useMutation({
  keys: ({ id }) => ['contacts', id],
  mutator: _updateContact,
})
</script>

<template>
  <section class="pt-6">
    <ContactCard
      v-if="contact"
      :key="contact.id"
      :contact="contact"
      @update:contact="updateContact"
    />
  </section>
</template>
