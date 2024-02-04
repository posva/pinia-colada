<script lang="ts" setup>
import { getAllContacts, searchContacts } from '@/api/contacts'
import { useFuse } from '@vueuse/integrations/useFuse'
import { useRouteQuery } from '@vueuse/router'
import { useQuery } from '@pinia/colada'

const searchText = useRouteQuery('search', '', { mode: 'push' })

const { data: searchResult, status } = useQuery({
  key: () => ['contacts', { searchText: searchText.value }],
  query: () => searchContacts(searchText.value),
})

// TODO: tip in tests if they are reading data, error or other as they are computed properties, on the server they won't
// update so they will keep their initial undefined value
</script>

<template>
  <main class="big-layout">
    <h1 class="mb-12">📇 My Contacts</h1>

    <div class="gap-4 contacts-search md:flex">
      <div>
        <form class="space-x-2" @submit.prevent>
          <input
            v-model="searchText"
            autofocus
            type="search"
            placeholder="Eduardo"
          />
          <!-- NOTE: ensure no fetch is done on client while hydrating or this will cause
           a Hydration mismatch -->
          <div v-if="status === 'loading'">
            <span class="spinner"></span><span> Fetching</span>
          </div>
        </form>

        <ul>
          <li v-for="contact in searchResult?.results" :key="contact.id">
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
              />
              {{ contact.firstName }} {{ contact.lastName }}
            </RouterLink>
          </li>
        </ul>
      </div>

      <RouterView />
    </div>
  </main>
</template>
