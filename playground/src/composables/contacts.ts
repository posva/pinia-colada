import { defineQuery, useQuery, useMultiMutation, type UseMutationOptions } from '@pinia/colada'
import { useRouteQuery } from '@vueuse/router'
import { deleteContactById, searchContacts, createContact, type Contact } from '@/api/contacts'

export const useContactSearch = defineQuery(() => {
  const searchText = useRouteQuery('search', '', { mode: 'push' })

  const { ...query } = useQuery({
    key: () => ['contacts-search', { searchText: searchText.value }],
    query: async ({ signal }) => searchContacts(searchText.value, {}, { signal }),
    staleTime: 0,
    // avoids flickering when the search text changes
    placeholderData: (previousData) => previousData,
    // avoids displaying the "Loading..." too quickly
    // makes your app look more responsive
    delay: 200,
  })

  return { ...query, searchText }
})

export const useContactsRemoval = (
  options: Partial<Omit<UseMutationOptions<void, number, unknown, {
    oldContacts: Array<Contact>
  }>, 'mutation' | 'key'>>) =>
  useMultiMutation({
    key: ['contacts-removal'],
    mutation: async (id: number) => {
      return await deleteContactById(id)
    },
    ...options,
  })

export const useContactCreation = (
  options: Partial<Omit<UseMutationOptions<Contact, Omit<Contact, 'id' | 'updatedAt' | 'createdAt'>, unknown, {
    oldContacts: Array<Contact>
    optimisticContact: Contact
  }>, 'mutation' | 'key'>>) =>
  useMultiMutation({
    key: ['contact-creation'],
    mutation: async (contact: Omit<Contact, 'id' | 'updatedAt' | 'createdAt'>) => {
      return await createContact(contact)
    },
    ...options,
  })
