<script setup lang="ts">
import { LogOut, Printer, RadioTower, SquareStack, UserRound } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { logout } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

async function handleLogout() {
  try {
    await logout()
  } finally {
    auth.clear()
    router.replace('/login')
  }
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">Q</div>
        <div>
          <strong>QSL Tracker</strong>
          <span>{{ auth.username || 'admin' }}</span>
        </div>
      </div>
      <nav class="nav">
        <RouterLink to="/qso-logs">
          <RadioTower :size="18" />
          <span>通联日志</span>
        </RouterLink>
        <RouterLink to="/qsl-cards">
          <SquareStack :size="18" />
          <span>QSL卡片</span>
        </RouterLink>
        <RouterLink to="/qsl-print">
          <Printer :size="18" />
          <span>打印配置</span>
        </RouterLink>
        <RouterLink to="/profile">
          <UserRound :size="18" />
          <span>个人资料</span>
        </RouterLink>
      </nav>
      <button class="ghost-button sidebar-action" type="button" @click="handleLogout">
        <LogOut :size="18" />
        <span>退出</span>
      </button>
    </aside>
    <main class="main">
      <slot />
    </main>
  </div>
</template>
