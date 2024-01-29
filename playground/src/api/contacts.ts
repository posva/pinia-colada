import { mande } from 'mande'

export const contacts = mande('http://localhost:7777/contacts', {})

export interface _UpdateInfo {
  createdAt: string
  updatedAt: string
}

interface ContactInfo {
  id: number
  firstName: string
  lastName: string
  bio: string
  photoURL: string
  isFavorite: boolean
}

export interface Contact extends ContactInfo, _UpdateInfo {}

/**
 * Retrieve all the contact list.
 */
export async function getAllContacts() {
  // await new Promise(resolve => setTimeout(resolve, 2000))
  return contacts.get<Contact[]>('/')
}

/**
 * Get the information of a contact by using its id.
 *
 * @param id id of the contact
 */
export function getContactById(id: string | number) {
  return contacts.get<Contact>(id)
}

/**
 * Create a new contact.
 *
 * @param contact - The contact to create
 * @returns the created contact
 */
export function createContact(contact: Omit<ContactInfo, 'photoURL'>) {
  return contacts.post<Contact>('/', {
    photoURL: `https://i.pravatar.cc/150?u=${contact.firstName}${contact.lastName}`,
    ...contact,
    registeredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Update a contact.
 *
 * @param contact - The contact to update
 * @returns the updated contact
 */
export function updateContact(contact: Partial<ContactInfo> & { id: number }) {
  return contacts.patch<Contact>(`/${contact.id}`, contact)
}

/**
 * Search the contacts database.
 *
 * @param options search, page, number per page, and other filtering options
 * @returns an object with the total of results and an array with at most `perPage` (defaults to 10) elements in it
 */
export function searchContacts(
  searchText: string,
  page?: number,
  {
    perPage,
    ...filterInfo
  }: {
    perPage?: number | string
  } & Partial<Contact> = {}
): Promise<{ total: number; results: Contact[] }> {
  const query: Record<string, string | null | undefined | number | boolean> =
    filterInfo as Record<string, string | boolean | number | null>
  if (searchText) query.q = searchText
  if (page) query._page = page
  if (perPage) query._limit = perPage

  return contacts
    .get('/', { query, responseAs: 'response' })
    .then(async (res) => ({
      total: Number(res.headers.get('x-total-count')) || 0,
      results: (await res.json()) as Contact[],
    }))
}
