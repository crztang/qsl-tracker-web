<script setup lang="ts">
import { RefreshCw, UserPlus } from 'lucide-vue-next'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/auth'
import { useCaptcha } from '@/composables/useCaptcha'

const router = useRouter()
const form = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})
const loading = ref(false)
const error = ref('')
const {
  captchaId,
  captchaCode,
  captchaImage,
  captchaLoading,
  refreshCaptcha
} = useCaptcha('register')

async function submit() {
  error.value = ''
  if (form.password !== form.confirmPassword) {
    error.value = '两次输入的密码不一致'
    await refreshCaptcha()
    return
  }
  loading.value = true
  try {
    await register({
      ...form,
      captchaId: captchaId.value,
      captchaCode: captchaCode.value
    })
    await router.replace('/login')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '注册失败'
    await refreshCaptcha()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <h1>创建账号</h1>
      <p class="muted">注册后返回登录页自行登录</p>
      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <span>用户名</span>
          <input v-model.trim="form.username" class="input" maxlength="64" autocomplete="username" required />
        </label>
        <label class="field">
          <span>密码</span>
          <input
            v-model="form.password"
            class="input"
            type="password"
            minlength="8"
            maxlength="64"
            autocomplete="new-password"
            required
          />
        </label>
        <label class="field">
          <span>确认密码</span>
          <input
            v-model="form.confirmPassword"
            class="input"
            type="password"
            minlength="8"
            maxlength="64"
            autocomplete="new-password"
            required
          />
        </label>
        <p class="form-hint">密码需为 8-64 位，并同时包含字母和数字。</p>
        <label class="field">
          <span>验证码</span>
          <div class="captcha-row">
            <input
              v-model.trim="captchaCode"
              class="input"
              inputmode="numeric"
              autocomplete="off"
              placeholder="请输入计算结果"
              required
            />
            <button class="captcha-image" type="button" :disabled="captchaLoading" @click="refreshCaptcha">
              <img v-if="captchaImage" :src="captchaImage" alt="点击刷新验证码" />
              <RefreshCw v-else :size="20" />
            </button>
          </div>
        </label>
        <button class="button" type="submit" :disabled="loading || captchaLoading || !captchaId">
          <UserPlus :size="18" />
          <span>{{ loading ? '注册中' : '注册' }}</span>
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      <p class="auth-switch">已有账号？<RouterLink to="/login">返回登录</RouterLink></p>
    </section>
  </main>
</template>
