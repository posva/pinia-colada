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

const {
  data: contact,
  error,
  asyncStatus,
} = useQuery({
  key: () => ['contacts', route.params.id],
  query: ({ signal }) => getContactById(route.params.id, { signal }),
})

const { mutate: updateContact } = useMutation({
  mutation: (contact: Partial<Contact> & { id: number }) =>
    _updateContact(contact),

  onMutate() {
    return { a: 2, b: 5 }
  },

  onError(_e, { id }, { caches, a, b }) {
    caches.invalidateQueries({ key: ['contacts-search'] })
    caches.invalidateQueries({ key: ['contacts', id] })
    if (a == null) return
    console.log(a.toFixed(2))
    console.log(b.toFixed(2))
  },

  onSettled(_d, _e, { id }, { caches, a }) {
    console.log(a?.toFixed(2))
    caches.invalidateQueries({ key: ['contacts-search'] })
    caches.invalidateQueries({ key: ['contacts', id] })
  },

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
