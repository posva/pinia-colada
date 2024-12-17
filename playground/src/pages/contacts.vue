<script lang="ts" setup>
import { ref } from 'vue'
import { faker } from '@faker-js/faker'
import { useContactCreation, useContactSearch, useContactsRemoval } from '@/composables/contacts'
import { useDebugData } from '@pinia/colada-plugin-debug'
import { useQueryCache } from '@pinia/colada'
import type { Contact } from '@/api/contacts'

interface IPaginated<T> {
  results: T
  total: number
}

const queryCache = useQueryCache()

const { data: searchResult, asyncStatus, searchText } = useContactSearch()

const { mutate: removeContact } = useContactsRemoval(
  {
    onMutate(contactId) {
      const oldContacts = queryCache.getQueryData<IPaginated<Array<Contact>>>(['contacts-search', { searchText: searchText.value }])?.results || []
      const updatedContacts = oldContacts.filter((contact) => contact.id !== contactId)
      queryCache.setQueryData(['contacts-search', { searchText: searchText.value }], updatedContacts)
      return { oldContacts }
    },
    onError(err, contactId, { oldContacts }) {
      if (oldContacts) {
        queryCache.setQueryData(['contacts-search', { searchText: searchText.value }], oldContacts)
      }
      console.error(`Failed to remove contact with ID: ${contactId}`, err)
    },
    onSettled(_data, _error) {
      queryCache.invalidateQueries({ key: ['contacts-search'] })
    },
  },
)

const { mutate: createContact, data: createdContactsMemo, remove: clearCreationKey } = useContactCreation({
  onMutate(newContactData) {
    const oldContacts = queryCache.getQueryData<IPaginated<Array<Contact>>>(['contacts-search', { searchText: searchText.value }])?.results || []
    const optimisticContact: Contact = {
      ...newContactData,
      id: Math.floor(Math.random() * 1000000),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    queryCache.setQueryData(['contacts-search', { searchText: searchText.value }], [...oldContacts, optimisticContact])
    return { oldContacts, optimisticContact }
  },
  onError(err, _newContactData, { oldContacts }) {
    if (oldContacts) {
      queryCache.setQueryData(['contacts-search', { searchText: searchText.value }], oldContacts)
    }
    console.error('Failed to create contact', err)
  },
  onSettled(_data, _error, _variables, { optimisticContact }) {
    if (optimisticContact) {
      queryCache.invalidateQueries({ key: ['contacts-search'] })
    }
    refetchContactsMemo()
  },
})

const creationKeyCount = ref(0)
const contactsMemo = ref(createdContactsMemo())

const refetchContactsMemo = () => {
  contactsMemo.value = createdContactsMemo()
}

const generateRandomContact = () => {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  return {
    firstName,
    lastName,
    bio: faker.person.bio(),
    photoURL: `https://i.pravatar.cc/150?u=${firstName}${lastName}`,
    isFavorite: faker.datatype.boolean(),
  }
}

const debugData = useDebugData()

// TODO: tip in tests if they are reading data, error or other as they are computed properties, on the server they won't
// update so they will keep their initial undefined value
</script>

<template>
  <main class="big-layout">
    <h1 class="mb-12">
      📇 My Contacts
    </h1>

    <details open>
      <summary>Debug</summary>

      <p>
        Total entries fetched: {{ debugData.totalRefetches }}
        <br>
        Total success: {{ debugData.totalSuccess }}
        <br>
        Total errors: {{ debugData.totalErrors }}
      </p>
      <p>Refetching entries: {{ debugData.refetchingEntries.size }}</p>
    </details>

    <div class="gap-4 contacts-search">
      <div class="flex flex-col">
        <form class="space-x-2" @submit.prevent>
          <input
            v-model="searchText"
            autofocus
            type="search"
            placeholder="Eduardo"
          >
          <!-- NOTE: ensure no fetch is done on client while hydrating or this will cause
           a Hydration mismatch -->
          <div v-if="asyncStatus === 'loading'">
            <span class="spinner"/><span> Fetching...</span>
          </div>
        </form>

        <button
          class="my-4 ml-auto"
          @click="createContact(`key-${creationKeyCount++}`, generateRandomContact())"
        >
          Generate contact
        </button>

        <ul>
          <li v-for="contact in searchResult?.results" :key="contact.id" class="flex">
            <RouterLink
              :to="{
                name: '/contacts/[id]',
                params: { id: contact.id },
              }"
            >
              <img
                v-if="contact.photoURL"
                :src="contact.photoURL"
                class="inline-block w-8 rounded-full"
              >
              {{ contact.firstName }} {{ contact.lastName }}
            </RouterLink>
            <button
              class="ml-auto"
              @click="removeContact(`key-${contact.id}`, contact.id)"
            >
              Delete
            </button>
          </li>
        </ul>

        <p> Creation history </p>

        <ul>
          <li v-for="contact in contactsMemo" :key="contact.data.id" class="flex">
            <div>
              <img
                v-if="contact.data.photoURL"
                :src="contact.data.photoURL"
                class="inline-block w-8 rounded-full"
                alt=""
              />
              {{ contact.data.firstName }} {{ contact.data.lastName }}
            </div>
            <button
              class="ml-auto"
              @click="() => {
                clearCreationKey(contact.key)
                refetchContactsMemo()
              }"
            >
              Clear key
            </button>
          </li>
        </ul>
      </div>

      <RouterView/>
    </div>
  </main>
</template>
