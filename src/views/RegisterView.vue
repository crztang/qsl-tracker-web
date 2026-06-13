<script setup lang="ts">
import { CheckCircle2, Circle, RefreshCw, UserPlus } from 'lucide-vue-next'
import { computed, reactive, ref } from 'vue'
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

const isUsernameAllowed = (value: string) => /^[A-Za-z0-9]+$/.test(value)

const usernameRules = computed(() => [
  {
    label: '用户名不少于 5 个字符',
    ok: form.username.trim().length >= 5
  },
  {
    label: '用户名只能包含英文字母和数字',
    ok: isUsernameAllowed(form.username.trim())
  }
])

const passwordRules = computed(() => [
  {
    label: '不能少于6位',
    ok: form.password.length >= 6 && form.password.length <= 64
  },
  {
    label: '必须包含字母',
    ok: /[A-Za-z]/.test(form.password)
  },
  {
    label: '必须包含数字',
    ok: /\d/.test(form.password)
  }
])

const canSubmit = computed(() => {
  const usernameOk = usernameRules.value.every((rule) => rule.ok)
  const passwordOk = passwordRules.value.every((rule) => rule.ok)
  return usernameOk && passwordOk && form.password === form.confirmPassword
})

async function submit() {
  error.value = ''
  if (!usernameRules.value.every((rule) => rule.ok)) {
    error.value = '请先完成用户名规则'
    return
  }
  if (!passwordRules.value.every((rule) => rule.ok)) {
    error.value = '请先完成密码规则'
    return
  }
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
          <input
            v-model.trim="form.username"
            class="input"
            minlength="5"
            maxlength="64"
            pattern="[A-Za-z0-9]+"
            autocomplete="username"
            required
          />
          <ul class="rule-list">
            <li
              v-for="rule in usernameRules"
              :key="rule.label"
              class="rule-item"
              :data-ok="rule.ok"
            >
              <CheckCircle2 v-if="rule.ok" :size="16" />
              <Circle v-else :size="16" />
              <span>{{ rule.label }}</span>
            </li>
          </ul>
        </label>
        <label class="field">
          <span>密码</span>
          <input
            v-model="form.password"
            class="input"
            type="password"
            minlength="6"
            maxlength="64"
            autocomplete="new-password"
            required
          />
          <p class="form-hint">密码要求：</p>
          <ul class="rule-list">
            <li
              v-for="rule in passwordRules"
              :key="rule.label"
              class="rule-item"
              :data-ok="rule.ok"
            >
              <CheckCircle2 v-if="rule.ok" :size="16" />
              <Circle v-else :size="16" />
              <span>{{ rule.label }}</span>
            </li>
          </ul>
        </label>
        <label class="field">
          <span>确认密码</span>
          <input
            v-model="form.confirmPassword"
            class="input"
            type="password"
            minlength="6"
            maxlength="64"
            autocomplete="new-password"
            required
          />
          <p class="form-hint" :class="{ 'form-hint--error': form.confirmPassword && form.password !== form.confirmPassword }">
            {{ form.confirmPassword && form.password !== form.confirmPassword ? '两次输入的密码不一致' : '请再次输入密码进行确认' }}
          </p>
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
        <button class="button" type="submit" :disabled="loading || captchaLoading || !captchaId || !canSubmit">
          <UserPlus :size="18" />
          <span>{{ loading ? '注册中' : '注册' }}</span>
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
      <p class="auth-switch">已有账号？<RouterLink to="/login">返回登录</RouterLink></p>
    </section>
  </main>
</template>
