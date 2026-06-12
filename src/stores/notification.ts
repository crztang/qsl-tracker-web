import { readonly, ref } from 'vue'

const errorMessage = ref('')
let clearTimer: ReturnType<typeof setTimeout> | undefined
let lastMessage = ''
let lastShownAt = 0

export function showError(message: string) {
  const normalized = message.trim() || '请求失败，请稍后重试'
  const now = Date.now()
  if (normalized === lastMessage && now - lastShownAt < 1500) {
    return
  }

  lastMessage = normalized
  lastShownAt = now
  errorMessage.value = normalized
  if (clearTimer) {
    clearTimeout(clearTimer)
  }
  clearTimer = setTimeout(() => {
    errorMessage.value = ''
  }, 5000)
}

export function clearError() {
  errorMessage.value = ''
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = undefined
  }
}

export function useNotification() {
  return {
    errorMessage: readonly(errorMessage),
    clearError
  }
}
