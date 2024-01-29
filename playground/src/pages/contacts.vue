<script lang="ts" setup>
import { getAllContacts } from '@/api/contacts'
import { useFuse } from '@vueuse/integrations/useFuse'
import { useRouteQuery } from '@vueuse/router'
import { useQuery } from '@pinia/colada'

const searchText = useRouteQuery('search', '', { mode: 'push' })

const { data: contactList } = useQuery({
  key: () => ['contacts', { searchText: searchText.value }],
  fetcher: () => getAllContacts(),
})

const { results } = useFuse(searchText, () => contactList.value || [], {
  fuseOptions: {
    keys: ['firstName', 'lastName', 'bio'],
  },
  matchAllWhenSearchEmpty: true,
})

// TODO: tip in tests if they are reading data, error or other as they are computed properties, on the server they won't
// update so they will keep their initial undefined value
</script>

<template>
  <main class="big-layout">
    <h1 class="mb-12">📇 My Contacts</h1>

    <div class="contacts-search">
      <div>
        <form class="space-x-2" @submit.prevent>
          <input v-model="searchText" type="search" />
        </form>

        <ul>
          <li v-for="{ item: contact } in results" :key="contact.id">
            <RouterLink
              :to="{
                name: '/contacts/[id]',
                params: {
                  id: contact.id,
                },
              }"
            >
              <img
                v-if="contact.photoURL"
                :src="contact.photoURL"
                class="rounded-full inline-block w-8"
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
