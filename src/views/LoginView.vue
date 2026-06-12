<script setup lang="ts">
import { LogIn } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const username = ref('admin')
const password = ref('admin123')
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    const data = await login(username.value, password.value)
    auth.setAuth(data)
    router.replace('/qso-logs')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <h1>QSL Tracker</h1>
      <p class="muted">后台管理</p>
      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <span>用户名</span>
          <input v-model.trim="username" class="input" autocomplete="username" required />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="password" class="input" type="password" autocomplete="current-password" required />
        </label>
        <button class="button" type="submit" :disabled="loading">
          <LogIn :size="18" />
          <span>{{ loading ? '登录中' : '登录' }}</span>
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </section>
  </main>
</template>
