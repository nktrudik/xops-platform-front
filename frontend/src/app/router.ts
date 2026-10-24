import { createRouter, createWebHistory } from 'vue-router'
import { restoreSession, session } from '../services/api'
import { localPreview } from './local-preview'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/CatalogView.vue'),
      props: { overview: true },
    },
    { path: '/catalog', name: 'catalog', component: () => import('../views/CatalogView.vue') },
    { path: '/copilots/:id', name: 'copilot', component: () => import('../views/CopilotView.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('../views/NotFoundView.vue') },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

router.beforeEach(async (to) => {
  if (localPreview) return to.name === 'login' ? { name: 'home' } : undefined
  await restoreSession()
  if (!session.value && to.name !== 'login') return { name: 'login', query: { next: to.fullPath } }
  if (session.value && to.name === 'login') return { name: 'catalog' }
})

router.afterEach((to) => {
  document.title = to.name === 'copilot' ? 'Copilot — XOps Platform' : 'XOps Platform'
})
