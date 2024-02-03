<script lang="ts" setup>
import { getAllContacts, searchContacts } from '@/api/contacts'
import { useFuse } from '@vueuse/integrations/useFuse'
import { useRouteQuery } from '@vueuse/router'
import { useQuery } from '@pinia/colada'

const searchText = useRouteQuery('search', '', { mode: 'push' })

const { data: searchResult } = useQuery({
  key: () => ['contacts', { searchText: searchText.value }],
  fetcher: () => searchContacts(searchText.value),
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

        <ol>
          <li v-for="contact in searchResult?.results" :key="contact.id">
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
                class="search-avatar"
              />
              {{ contact.firstName }} {{ contact.lastName }}
            </RouterLink>
          </li>
        </ol>
      </div>

      <RouterView />
    </div>
  </main>
</template>

<style scoped>
.search-avatar {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
}

.contacts-search {
  display: flex;
  gap: 2rem;
}
</style>
