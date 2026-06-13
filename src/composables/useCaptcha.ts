import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getCaptcha } from '@/api/auth'

export function useCaptcha(scene: 'login' | 'register') {
  const captchaId = ref('')
  const captchaCode = ref('')
  const captchaImage = ref('')
  const captchaLoading = ref(false)
  const captchaExpired = ref(false)
  let expiryTimer: ReturnType<typeof globalThis.setTimeout> | null = null

  function clearExpiryTimer() {
    if (expiryTimer !== null) {
      clearTimeout(expiryTimer)
      expiryTimer = null
    }
  }

  function scheduleExpiry(expiresInSeconds: number) {
    clearExpiryTimer()
    if (expiresInSeconds <= 0) {
      captchaExpired.value = true
      return
    }
    captchaExpired.value = false
    expiryTimer = globalThis.setTimeout(() => {
      captchaExpired.value = true
      expiryTimer = null
    }, expiresInSeconds * 1000)
  }

  async function refreshCaptcha() {
    if (captchaLoading.value) return
    captchaLoading.value = true
    captchaCode.value = ''
    captchaId.value = ''
    captchaImage.value = ''
    try {
      const data = await getCaptcha(scene)
      captchaId.value = data.captchaId
      captchaImage.value = data.captchaImage
      scheduleExpiry(data.expiresIn)
    } finally {
      captchaLoading.value = false
    }
  }

  onMounted(refreshCaptcha)
  onBeforeUnmount(clearExpiryTimer)

  return {
    captchaId,
    captchaCode,
    captchaImage,
    captchaLoading,
    captchaExpired,
    refreshCaptcha
  }
}
