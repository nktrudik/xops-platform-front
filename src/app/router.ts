import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'catalog', component: () => import('../views/CatalogView.vue') },
    { path: '/copilots/:id', name: 'copilot', component: () => import('../views/CopilotView.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('../views/NotFoundView.vue') },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

router.afterEach((to) => {
  document.title = to.name === 'copilot' ? 'Copilot — XOps Platform' : 'XOps Platform'
})
