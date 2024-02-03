<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { Contact } from '@/api/contacts'

const props = defineProps<{ contact: Contact }>()
const emit = defineEmits<{
  (e: 'update:contact', newContact: Contact): void
}>()

const fullName = computed(() => `${props.contact.firstName} ${props.contact.lastName}`)

const isEditing = ref(false)
const copy = ref<Contact | null>(null)
function startEdit() {
  isEditing.value = true
  copy.value = { ...props.contact }
}

function saveEdits() {
  emit('update:contact', copy.value!)
  isEditing.value = false
  copy.value = null
}
function cancelEdit() {
  isEditing.value = false
  copy.value = null
}

function randomizeAvatar() {
  if (!copy.value) return
  copy.value.photoURL = `https://i.pravatar.cc/150?u=${Math.round(Math.random() * 1000)}`
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="isEditing && copy" class="mx-auto flex flex-col items-center">
      <img :key="copy.photoURL" class="w-40 h-40 mx-auto rounded-full" :src="copy.photoURL" />
      <button class="mt-1" @click="randomizeAvatar">Randomize photo</button>
    </div>
    <img v-else class="w-40 h-40 mx-auto rounded-full" :src="contact.photoURL" />

    <div class="space-y-2">
      <div class="space-y-1 font-medium leading-6 text-center">
        <form v-if="copy" class="flex flex-col max-w-md mx-auto" @submit.prevent="saveEdits()">
          <label for="contact-edit-first-name"> First Name </label>
          <input id="contact-edit-first-name" v-model="copy.firstName" type="text" />
          <label for="contact-edit-last-name"> Last Name </label>
          <input id="contact-edit-last-name" v-model="copy.lastName" type="text" />
          <label for="contact-edit-bio"> Bio: </label>
          <textarea id="contact-edit-bio" v-model="copy.bio" cols="30" rows="5"></textarea>

          <hr />

          <button>Save</button>
          <button type="button" @click="cancelEdit()">Cancel</button>
        </form>

        <template v-else>
          <h3 class="leading-snug text-md">{{ fullName }}</h3>

          <p class="m-0 text-sm">{{ contact.bio }}</p>
        </template>
      </div>
    </div>

    <template v-if="!isEditing">
      <hr />

      <div class="mx-auto flex space-x-2 px-6 justify-end">
        <button @click="startEdit()">Edit</button>
      </div>
    </template>
  </div>
</template>
