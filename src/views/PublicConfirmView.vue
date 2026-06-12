<script setup lang="ts">
import { CheckCircle2, Search } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { confirmPublicQsl, getPublicQslInfo } from '@/api/qsl'
import type { PublicQslInfo } from '@/api/types'
import StatusBadge from '@/components/StatusBadge.vue'

const route = useRoute()
const trackingNo = computed(() => String(route.params.trackingNo || ''))
const token = ref(String(route.query.token || ''))
const info = ref<PublicQslInfo | null>(null)
const loading = ref(false)
const confirming = ref(false)
const message = ref('')
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    info.value = await getPublicQslInfo(trackingNo.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '查询失败'
  } finally {
    loading.value = false
  }
}

async function confirm() {
  confirming.value = true
  error.value = ''
  message.value = ''
  try {
    await confirmPublicQsl(trackingNo.value, token.value)
    message.value = '确认完成'
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '确认失败'
  } finally {
    confirming.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="public-page">
    <section class="public-card">
      <h1>QSL确认</h1>
      <p class="muted">{{ trackingNo }}</p>

      <div v-if="info" class="stat" style="margin-top: 18px;">
        <span>呼号</span>
        <strong>{{ info.callSign }}</strong>
        <div style="margin-top: 10px;">
          <StatusBadge :value="info.status" />
        </div>
      </div>

      <form class="login-form" @submit.prevent="confirm">
        <label class="field">
          <span>确认令牌</span>
          <input v-model.trim="token" class="input" required />
        </label>
        <button class="button" type="submit" :disabled="confirming || !info?.canConfirm">
          <CheckCircle2 :size="18" />
          <span>{{ confirming ? '确认中' : '确认收件' }}</span>
        </button>
        <button class="button secondary" type="button" :disabled="loading" @click="load">
          <Search :size="18" />
          <span>{{ loading ? '查询中' : '查询' }}</span>
        </button>
      </form>

      <p v-if="message" class="muted">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </main>
</template>
