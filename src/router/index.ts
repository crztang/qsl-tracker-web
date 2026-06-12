import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/qso-logs' },
    { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    { path: '/qso-logs', component: () => import('@/views/QsoLogsView.vue') },
    { path: '/qsl-cards', component: () => import('@/views/QslCardsView.vue') },
    { path: '/qsl-print', component: () => import('@/views/QslPrintView.vue') },
    { path: '/profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/public/qsl/:trackingNo', component: () => import('@/views/PublicConfirmView.vue'), meta: { public: true } }
  ]
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.restore()
  if (!to.meta.public && !auth.isLoggedIn) {
    return '/login'
  }
  if (to.path === '/login' && auth.isLoggedIn) {
    return '/'
  }
})

export default router
