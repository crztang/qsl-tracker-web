import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/qso-logs' },
    { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    { path: '/register', component: () => import('@/views/RegisterView.vue'), meta: { public: true } },
    { path: '/change-password', component: () => import('@/views/ChangePasswordView.vue') },
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
  if (auth.isLoggedIn && auth.mustChangePassword && to.path !== '/change-password') {
    return '/change-password'
  }
  if (auth.isLoggedIn && !auth.mustChangePassword && to.path === '/change-password') {
    return '/'
  }
  if ((to.path === '/login' || to.path === '/register') && auth.isLoggedIn) {
    return '/'
  }
})

export default router
