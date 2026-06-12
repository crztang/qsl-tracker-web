import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LoginResponse } from '@/api/types'

const STORAGE_KEY = 'qsl-tracker-auth'

export const useAuthStore = defineStore('auth', () => {
  const tokenName = ref('')
  const tokenValue = ref('')
  const username = ref('')
  const mustChangePassword = ref(false)

  const authorization = computed(() => tokenValue.value ? `Bearer ${tokenValue.value}` : '')
  const isLoggedIn = computed(() => Boolean(tokenValue.value))

  function restore() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const data = JSON.parse(raw) as LoginResponse
      tokenName.value = data.tokenName
      tokenValue.value = data.tokenValue
      username.value = data.username
      mustChangePassword.value = Boolean(data.mustChangePassword)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function setAuth(data: LoginResponse) {
    tokenName.value = data.tokenName
    tokenValue.value = data.tokenValue
    username.value = data.username
    mustChangePassword.value = Boolean(data.mustChangePassword)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function markPasswordChanged() {
    mustChangePassword.value = false
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as LoginResponse
    data.mustChangePassword = false
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function requirePasswordChange() {
    mustChangePassword.value = true
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as LoginResponse
    data.mustChangePassword = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function clear() {
    tokenName.value = ''
    tokenValue.value = ''
    username.value = ''
    mustChangePassword.value = false
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    tokenName,
    tokenValue,
    username,
    mustChangePassword,
    authorization,
    isLoggedIn,
    restore,
    setAuth,
    markPasswordChanged,
    requirePasswordChange,
    clear
  }
})
