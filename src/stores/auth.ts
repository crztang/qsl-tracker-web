import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LoginResponse } from '@/api/types'

const STORAGE_KEY = 'qsl-tracker-auth'

export const useAuthStore = defineStore('auth', () => {
  const tokenName = ref('')
  const tokenValue = ref('')
  const username = ref('')

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
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function setAuth(data: LoginResponse) {
    tokenName.value = data.tokenName
    tokenValue.value = data.tokenValue
    username.value = data.username
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function clear() {
    tokenName.value = ''
    tokenValue.value = ''
    username.value = ''
    localStorage.removeItem(STORAGE_KEY)
  }

  return { tokenName, tokenValue, username, authorization, isLoggedIn, restore, setAuth, clear }
})
