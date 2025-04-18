<script lang="ts" setup>
import { useQueryCache } from '@pinia/colada'
import { useContactSearch } from '../composables/contacts'
import { getContactById } from '../api/contacts'

const { data: searchResult, asyncStatus, searchText } = useContactSearch()

const queryCache = useQueryCache()

async function prefetchContact(id: number) {
  queryCache.setQueryData(['contacts', id], await getContactById(id))
}
</script>

<template>
  <main class="big-layout">
    <h1 class="mb-12">
      📇 My Contacts
    </h1>

    <div>
      <button @click="prefetchContact(2)">
        Prefetch Contact 2
      </button>
    </div>

    <div class="gap-4 contacts-search md:flex">
      <div>
        <form class="space-x-2" @submit.prevent>
          <input v-model="searchText" autofocus type="search" placeholder="Eduardo">
          <div v-if="asyncStatus === 'loading'">
            <span class="spinner" /><span> Fetching...</span>
          </div>
        </form>

        <ul>
          <li v-for="contact in searchResult?.results" :key="contact.id">
            <router-link :to="`/contacts/${contact.id}`">
              <img
                v-if="contact.photoURL"
                :src="contact.photoURL"
                class="inline-block w-8 rounded-full"
              >
              {{ contact.firstName }} {{ contact.lastName }}
            </router-link>
          </li>
        </ul>
      </div>

      <router-view />
    </div>
  </main>
</template>

<style>
.spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-left-color: currentColor;
  border-radius: 50%;
  animation: spinner 1s linear infinite;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}
</style>
