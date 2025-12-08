<script lang="ts" setup>
import { searchContacts } from '@/api/contacts'
import { useRouteQuery } from '@vueuse/router'
import { onErrorCaptured, shallowRef, watch } from 'vue'

const searchText = useRouteQuery('search', '', { mode: 'push' })

const searchResult = shallowRef<Awaited<ReturnType<typeof searchContacts>>>(
  await searchContacts(searchText.value),
)
watch(searchText, async () => {
  searchResult.value = await searchContacts(searchText.value)
})

const error = shallowRef<Error | null>(null)
onErrorCaptured((err) => {
  console.error('💥 Captured nested error in /suspense/contacts/', err)
  error.value = err
})
</script>

<template>
  <main class="big-layout">
    <h1 class="mb-12">📇 My Contacts</h1>

    <div class="gap-4 contacts-search md:flex">
      <div>
        <form class="space-x-2" @submit.prevent>
          <input v-model="searchText" autofocus type="search" placeholder="Eduardo" />
          <!-- NOTE: ensure no fetch is done on client while hydrating or this will cause
           a Hydration mismatch -->
          <!-- <div v-if="asyncStatus === 'loading'"> -->
          <!--   <span class="spinner" /><span> Fetching...</span> -->
          <!-- </div> -->
        </form>

        <ul>
          <li v-for="contact in searchResult?.results" :key="contact.id">
            <RouterLink
              :to="{
                name: '/suspense/contacts/[id]',
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

      <RouterView v-slot="{ Component }">
        <Suspense suspensible @resolve="error = null">
          <component :is="Component" :key="$route.path" />

          <template #fallback>
            <p>Loading (nested)...</p>
          </template>
        </Suspense>
      </RouterView>
    </div>
  </main>
</template>
