<script setup lang="ts">
import { LogIn, RefreshCw } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/api/auth'
import { useCaptcha } from '@/composables/useCaptcha'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const {
  captchaId,
  captchaCode,
  captchaImage,
  captchaLoading,
  refreshCaptcha
} = useCaptcha('login')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    const data = await login({
      username: username.value,
      password: password.value,
      captchaId: captchaId.value,
      captchaCode: captchaCode.value
    })
    auth.setAuth(data)
    await router.replace(data.mustChangePassword ? '/change-password' : '/qso-logs')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
    await refreshCaptcha()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <h1>QSL Tracker</h1>
      <p class="muted">登录后台管理系统</p>
      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <span>用户名</span>
          <input v-model.trim="username" class="input" autocomplete="username" required />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="password" class="input" type="password" autocomplete="current-password" required />
        </label>
        <label class="field">
          <span>验证码</span>
          <div class="captcha-row">
            <input
              v-model.trim="captchaCode"
              class="input"
              inputmode="numeric"
              autocomplete="off"
              placeholder="请输入验证码"
              required
            />
            <button class="captcha-image" type="button" :disabled="captchaLoading" @click="refreshCaptcha">
              <img v-if="captchaImage" :src="captchaImage" alt="点击刷新验证码" />
              <RefreshCw v-else :size="20" />
            </button>
          </div>
        </label>
        <button class="button" type="submit" :disabled="loading || captchaLoading || !captchaId">
          <LogIn :size="18" />
          <span>{{ loading ? '登录中' : '登录' }}</span>
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      <p class="auth-switch">还没有账号？<RouterLink to="/register">立即注册</RouterLink></p>
    </section>
  </main>
</template>
