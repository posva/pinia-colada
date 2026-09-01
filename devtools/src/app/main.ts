import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { PiniaColada } from '@pinia/colada'
import App from './App.vue'
import router from './router.ts'
import './style.css'

createApp(App).use(createPinia()).use(PiniaColada).use(router).mount('#app')
