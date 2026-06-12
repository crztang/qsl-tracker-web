import { onMounted, ref } from 'vue'
import { getCaptcha } from '@/api/auth'

export function useCaptcha(scene: 'login' | 'register') {
  const captchaId = ref('')
  const captchaCode = ref('')
  const captchaImage = ref('')
  const captchaLoading = ref(false)

  async function refreshCaptcha() {
    if (captchaLoading.value) return
    captchaLoading.value = true
    captchaCode.value = ''
    try {
      const data = await getCaptcha(scene)
      captchaId.value = data.captchaId
      captchaImage.value = data.captchaImage
    } finally {
      captchaLoading.value = false
    }
  }

  onMounted(refreshCaptcha)

  return {
    captchaId,
    captchaCode,
    captchaImage,
    captchaLoading,
    refreshCaptcha
  }
}
