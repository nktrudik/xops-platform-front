import { createRouter, createWebHistory } from 'vue-router'
import { restoreSession, session } from '../services/api'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/', name: 'catalog', component: () => import('../views/CatalogView.vue') },
    { path: '/copilots/:id', name: 'copilot', component: () => import('../views/CopilotView.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('../views/NotFoundView.vue') },
  ],
  scrollBehavior: (to, from, saved) => saved ?? (to.path === from.path ? false : { top: 0 }),
})

router.beforeEach(async (to) => {
  await restoreSession()
  if (!session.value && to.name !== 'login') return { name: 'login', query: { next: to.fullPath } }
  if (session.value && to.name === 'login') return { name: 'catalog' }
})

router.afterEach((to) => {
  document.title = to.name === 'copilot' ? 'Copilot — XOps Platform' : 'XOps Platform'
})
