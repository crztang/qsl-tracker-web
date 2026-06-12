<script setup lang="ts">
import { KeyRound, LogOut } from 'lucide-vue-next'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { changePassword, logout } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (form.newPassword !== form.confirmPassword) {
    error.value = '两次输入的新密码不一致'
    return
  }
  loading.value = true
  try {
    await changePassword({ ...form })
    auth.markPasswordChanged()
    await router.replace('/qso-logs')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '密码修改失败'
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  try {
    await logout()
  } finally {
    auth.clear()
    await router.replace('/login')
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="auth-heading">
        <div>
          <h1>修改初始密码</h1>
          <p class="muted">当前账号使用固定初始密码，修改后才可继续。</p>
        </div>
        <KeyRound :size="28" />
      </div>
      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <span>当前密码</span>
          <input v-model="form.currentPassword" class="input" type="password" autocomplete="current-password" required />
        </label>
        <label class="field">
          <span>新密码</span>
          <input v-model="form.newPassword" class="input" type="password" minlength="8" maxlength="64" autocomplete="new-password" required />
        </label>
        <label class="field">
          <span>确认新密码</span>
          <input v-model="form.confirmPassword" class="input" type="password" minlength="8" maxlength="64" autocomplete="new-password" required />
        </label>
        <p class="form-hint">新密码需为 8-64 位，并同时包含字母和数字。</p>
        <button class="button" type="submit" :disabled="loading">
          <KeyRound :size="18" />
          <span>{{ loading ? '修改中' : '修改密码' }}</span>
        </button>
        <button class="button secondary" type="button" :disabled="loading" @click="handleLogout">
          <LogOut :size="18" />
          <span>退出登录</span>
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </section>
  </main>
</template>
