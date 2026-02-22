<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import ContactCard from '@/components/ContactCard.vue'
import { updateContact as _updateContact } from '@/api/contacts'
import type { Contact } from '@/api/contacts'
import { contactByIdQuery } from '@/queries/contacts'

const route = useRoute('/contacts/[id]')
const queryCache = useQueryCache()

// const isLoading = computed(() => queryCache.getEntries({ predicate: (entry) => entry.asyncStatus.value === 'loading' }))

// const {
//   data: contact,
//   error,
//   asyncStatus,
// } = useQuery({
//   key: () => ['contacts', route.params.id],
//   query: ({ signal }) => getContactById(route.params.id, { signal }),
// })

const { data: contact, error, asyncStatus } = useQuery(() => contactByIdQuery(route.params.id))

const { mutate: updateContact } = useMutation({
  mutation: (contact: Partial<Contact> & { id: number }) => _updateContact(contact),

  onMutate() {
    return { a: 2, b: 5 }
  },

  onError(_e, { id }, { a, b }) {
    queryCache.invalidateQueries({ key: ['contacts-search'] })
    queryCache.invalidateQueries({ key: ['contacts', id] })
    if (a == null) return
    console.log(a.toFixed(2))
    console.log(b.toFixed(2))
  },

  onSettled(_d, _e, { id }, { a }) {
    console.log(a?.toFixed(2))
    queryCache.invalidateQueries({ key: ['contacts-search'] })
    queryCache.invalidateQueries({ key: ['contacts', id] })
  },
})
</script>

<template>
  <section class="grow pt-6 md:pt-0">
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
