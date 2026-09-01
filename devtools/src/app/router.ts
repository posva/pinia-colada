import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
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
