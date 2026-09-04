import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/queries' },
    {
      path: '/queries',
      component: () => import('./pages/QueryFixtures.vue'),
    },
    {
      path: '/mutations',
      component: () => import('./pages/MutationFixtures.vue'),
    },
  ],
})
