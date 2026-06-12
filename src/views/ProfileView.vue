<script setup lang="ts">
import { Save } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { getUserProfile, updateUserProfile } from '@/api/profile'
import type { UserProfilePayload } from '@/api/types'
import AppShell from '@/components/AppShell.vue'
import PageHeader from '@/components/PageHeader.vue'
import SuccessToast from '@/components/SuccessToast.vue'

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const successMessage = ref('')
const username = ref('')
const lastLoginAt = ref('')
const form = reactive<UserProfilePayload>({
  callSign: '',
  email: '',
  mailingAddress: '',
  phone: '',
  recipient: '',
  postalCode: ''
})

async function loadProfile() {
  loading.value = true
  error.value = ''
  try {
    const profile = await getUserProfile()
    username.value = profile.username
    lastLoginAt.value = profile.lastLoginAt || ''
    Object.assign(form, {
      callSign: profile.callSign || '',
      email: profile.email || '',
      mailingAddress: profile.mailingAddress || '',
      phone: profile.phone || '',
      recipient: profile.recipient || '',
      postalCode: profile.postalCode || ''
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '个人资料加载失败'
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  error.value = ''
  try {
    await updateUserProfile({ ...form })
    successMessage.value = '个人资料已保存'
    window.setTimeout(() => (successMessage.value = ''), 1800)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '个人资料保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <AppShell>
    <SuccessToast :message="successMessage" />
    <PageHeader title="个人资料" eyebrow="PROFILE" />

    <form class="profile-panel" @submit.prevent="submit">
      <div class="profile-grid">
        <label class="field">
          <span>用户名</span>
          <input :value="username" class="input" disabled />
        </label>
        <label class="field">
          <span>上次登录时间</span>
          <input :value="lastLoginAt ? lastLoginAt.replace('T', ' ') : '-'" class="input" disabled />
        </label>
        <label class="field">
          <span>呼号</span>
          <input v-model.trim="form.callSign" class="input" maxlength="32" />
        </label>
        <label class="field">
          <span>电子邮箱</span>
          <input v-model.trim="form.email" class="input" type="email" maxlength="128" />
        </label>
        <label class="field">
          <span>联系电话</span>
          <input v-model.trim="form.phone" class="input" maxlength="32" />
        </label>
        <label class="field">
          <span>收件人</span>
          <input v-model.trim="form.recipient" class="input" maxlength="128" />
        </label>
        <label class="field">
          <span>邮编</span>
          <input v-model.trim="form.postalCode" class="input" maxlength="32" />
        </label>
        <label class="field full">
          <span>邮寄地址</span>
          <textarea v-model.trim="form.mailingAddress" class="textarea" maxlength="500" />
        </label>
      </div>
      <p class="profile-hint">邮寄地址、联系电话、收件人和邮编将作为信封寄件人默认信息。</p>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="profile-actions">
        <button class="button" type="submit" :disabled="loading || saving">
          <Save :size="18" />
          <span>{{ saving ? '保存中' : '保存' }}</span>
        </button>
      </div>
    </form>
  </AppShell>
</template>

<style scoped>
.profile-panel {
  max-width: 880px;
  padding: 22px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.profile-grid .full {
  grid-column: 1 / -1;
}

.profile-hint {
  margin: 16px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 720px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-grid .full {
    grid-column: auto;
  }
}
</style>
