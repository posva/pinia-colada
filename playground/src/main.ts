import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router/auto'
import { routes } from 'vue-router/auto-routes'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import './style.css'
import 'water.css'
import { PiniaColadaRetry } from '@pinia/colada-plugin-retry'

import App from './App.vue'
import { PiniaColadaDebugPlugin } from '@pinia/colada-plugin-debug'

const app = createApp(App)
const router = createRouter({
  history: createWebHistory(),
  routes,
})

app.use(createPinia())
app.use(PiniaColada, {
  plugins: [PiniaColadaDebugPlugin(), PiniaColadaRetry()],
})
app.use(router)

app.mount('#app')

/**
 * NOTE: idea allow extending an interface to infer keys and data types. Either one would write this manually first or this could be generated from the source code.
 */

// declare module '@pinia/colada' {
//   interface UseQueryKeyList {
//     contactList: [key: ['contacts'], data: ReturnType<typeof getAllContacts>]

//     contactSearch: [
//       key: ['contacts-search', { searchText: string }],
//       data: ReturnType<typeof searchContacts>,
//     ]
//   }
// }

// function newUseQuery<
//   Entry extends UseQueryKeyList[keyof UseQueryKeyList],
// >(options: {
//   key: MaybeRefOrGetter<Entry[0]>
//   query: (context: { signal: AbortSignal }) => Entry[1]
// }) {
//   return {} as any
// }

// newUseQuery({
//   key: ['contacts'],
//   query: () => getAllContacts(),
// })

// newUseQuery({
//   key: () => ['contacts-search', {searchText: ''}],
//   query: () => searchContacts(''),
// })
