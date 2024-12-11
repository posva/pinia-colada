<script lang="ts" setup>
import { useContactSearch, useContactsRemoval } from '@/composables/contacts'
import { useDebugData } from '@pinia/colada-plugin-debug'
import { useQueryCache } from '@pinia/colada'
import type { Contact } from '@/api/contacts'

const queryCache = useQueryCache()

const { data: searchResult, asyncStatus, searchText } = useContactSearch()
const { mutate: removeContact } = useContactsRemoval(
  {
    onMutate(contactId) {
      const oldContacts = queryCache.getQueryData<Array<Contact>>(['contacts']) || []
      const updatedContacts = oldContacts.filter((contact) => contact.id !== contactId)
      queryCache.setQueryData(['contacts'], updatedContacts)
      queryCache.cancelQueries({ key: ['contact', contactId] })
      return { oldContacts }
    },
    onError(err, contactId, { oldContacts }) {
      if (oldContacts) {
        queryCache.setQueryData(['contacts'], oldContacts)
      }
      console.error(`Failed to remove contact with ID: ${contactId}`, err)
    },
    onSettled(_data, _error) {
      queryCache.invalidateQueries({ key: ['contacts'] })
    },
  },
)
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

    <div class="gap-4 contacts-search md:flex">
      <div>
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

        <ul>
          <li class="flex" v-for="contact in searchResult?.results" :key="contact.id" >
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
              class="ml-auto -mr-36"
              @click="removeContact(`key-${contact.id}`, contact.id)"
            >
              Delete
            </button>
          </li>
        </ul>
      </div>

      <RouterView/>
    </div>
  </main>
</template>
