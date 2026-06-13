<script setup lang="ts">
import { Copy, Link2, Power, RefreshCcw, Save } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  generateQslShare,
  getUserProfile,
  revokeQslShare,
  updateQslShare,
  updateUserProfile
} from '@/api/profile'
import type {
  QslShareExpiryPreset,
  QslShareIssue,
  QslShareRequest,
  QslShareSummary,
  UserProfilePayload
} from '@/api/types'
import AppShell from '@/components/AppShell.vue'
import PageHeader from '@/components/PageHeader.vue'
import SuccessToast from '@/components/SuccessToast.vue'

const loading = ref(false)
const saving = ref(false)
const shareSaving = ref(false)
const shareGenerating = ref(false)
const shareRevoking = ref(false)
const error = ref('')
const successMessage = ref('')
const username = ref('')
const lastLoginAt = ref('')
const generatedToken = ref('')
const generatedEmbedUrl = ref('')
const generatedIframeCode = ref('')
const shareSummary = ref<QslShareSummary | null>(null)
const form = reactive<UserProfilePayload>({
  callSign: '',
  email: '',
  mailingAddress: '',
  phone: '',
  recipient: '',
  postalCode: ''
})
const shareForm = reactive<QslShareRequest>({
  recordLimit: 10,
  expiryPreset: '7d',
  enabled: true
})

const shareStatusText = computed(() => {
  if (!shareSummary.value) return '尚未生成嵌入链接'
  if (!shareSummary.value.hasToken) return '设置已保存，但尚未生成链接'
  if (!shareSummary.value.enabled) return '当前嵌入链接已停用'
  if (shareSummary.value.expired) return '当前嵌入链接已过期'
  return '当前嵌入链接可用'
})

const shareExpiryText = computed(() => {
  if (!shareSummary.value) return '-'
  if (!shareSummary.value.expiresAt) return '永久有效'
  return shareSummary.value.expiresAt.replace('T', ' ').slice(0, 16)
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

    shareSummary.value = profile.qslShare || null
    if (profile.qslShare) {
      shareForm.recordLimit = profile.qslShare.recordLimit || 10
      shareForm.expiryPreset = profile.qslShare.expiryPreset === 'custom'
        ? '7d'
        : (profile.qslShare.expiryPreset as Exclude<QslShareExpiryPreset, 'custom'>)
      shareForm.enabled = profile.qslShare.enabled
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '个人资料加载失败'
  } finally {
    loading.value = false
  }
}

async function submitProfile() {
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

async function saveShareSettings() {
  shareSaving.value = true
  error.value = ''
  try {
    shareSummary.value = await updateQslShare({ ...shareForm })
    successMessage.value = '嵌入分享设置已保存'
    window.setTimeout(() => (successMessage.value = ''), 1800)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '嵌入分享设置保存失败'
  } finally {
    shareSaving.value = false
  }
}

function applyIssuedShare(payload: QslShareIssue) {
  shareSummary.value = payload
  shareForm.recordLimit = payload.recordLimit
  shareForm.expiryPreset = payload.expiryPreset === 'custom'
    ? '7d'
    : (payload.expiryPreset as Exclude<QslShareExpiryPreset, 'custom'>)
  shareForm.enabled = payload.enabled
  generatedToken.value = payload.token
  generatedEmbedUrl.value = payload.embedUrl
  generatedIframeCode.value = payload.iframeCode
}

async function generateShare() {
  shareGenerating.value = true
  error.value = ''
  try {
    const payload = await generateQslShare({ ...shareForm, enabled: true })
    applyIssuedShare(payload)
    successMessage.value = '嵌入链接已生成，可直接复制'
    window.setTimeout(() => (successMessage.value = ''), 1800)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '嵌入链接生成失败'
  } finally {
    shareGenerating.value = false
  }
}

async function revokeShare() {
  shareRevoking.value = true
  error.value = ''
  try {
    shareSummary.value = await revokeQslShare()
    shareForm.enabled = false
    generatedToken.value = ''
    generatedEmbedUrl.value = ''
    generatedIframeCode.value = ''
    successMessage.value = '嵌入链接已停用'
    window.setTimeout(() => (successMessage.value = ''), 1800)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '嵌入链接停用失败'
  } finally {
    shareRevoking.value = false
  }
}

async function copyText(text: string, label: string) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    successMessage.value = `${label}已复制`
    window.setTimeout(() => (successMessage.value = ''), 1800)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '复制失败'
  }
}

function hasGeneratedCode() {
  return Boolean(generatedToken.value && generatedEmbedUrl.value && generatedIframeCode.value)
}

onMounted(loadProfile)
</script>

<template>
  <AppShell>
    <SuccessToast :message="successMessage" />
    <PageHeader title="个人资料" eyebrow="PROFILE" />

    <div class="profile-layout">
      <form class="profile-panel" @submit.prevent="submitProfile">
        <div class="panel-title">
          <h2>基础资料</h2>
          <p>这些信息会用于你的公开资料和收件信息。</p>
        </div>

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

        <p class="profile-hint">邮寄地址、联系电话、收件人和邮编将作为信封寄件人的默认信息。</p>
        <p v-if="error" class="error">{{ error }}</p>

        <div class="profile-actions">
          <button class="button" type="submit" :disabled="loading || saving">
            <Save :size="18" />
            <span>{{ saving ? '保存中' : '保存资料' }}</span>
          </button>
        </div>
      </form>

      <section class="profile-panel share-panel">
        <div class="panel-title">
          <h2>嵌入分享</h2>
          <p>生成一个可直接嵌入其他网站的只读通联记录页面。</p>
        </div>

        <div class="share-status" :data-active="shareSummary?.enabled && !shareSummary?.expired && shareSummary?.hasToken">
          <div class="share-status-main">
            <strong>{{ shareStatusText }}</strong>
            <span>记录条数：{{ shareSummary?.recordLimit ?? shareForm.recordLimit }}</span>
          </div>
          <div class="share-status-meta">
            <span>有效期：{{ shareExpiryText }}</span>
            <span>状态：{{ shareSummary?.enabled ? '启用' : '停用' }}</span>
          </div>
        </div>

        <div class="share-form">
          <label class="field">
            <span>展示条数</span>
            <input v-model.number="shareForm.recordLimit" class="input" type="number" min="1" max="50" />
          </label>
          <label class="field">
            <span>有效期</span>
            <select v-model="shareForm.expiryPreset" class="select">
              <option value="permanent">永久有效</option>
              <option value="1d">1 天</option>
              <option value="7d">7 天</option>
              <option value="30d">30 天</option>
            </select>
          </label>
          <label class="field toggle-field full">
            <input v-model="shareForm.enabled" type="checkbox" />
            <span>生成后保持启用</span>
          </label>
        </div>

        <div class="share-actions">
          <button
            class="button"
            type="button"
            :disabled="shareGenerating || loading"
            @click="generateShare"
          >
            <RefreshCcw :size="18" />
            <span>{{ hasGeneratedCode() ? '重新生成链接' : '生成链接' }}</span>
          </button>
          <button
            class="button secondary"
            type="button"
            :disabled="shareSaving || loading"
            @click="saveShareSettings"
          >
            <Save :size="18" />
            <span>{{ shareSaving ? '保存中' : '保存设置' }}</span>
          </button>
          <button
            class="button danger"
            type="button"
            :disabled="shareRevoking || loading || !shareSummary?.enabled"
            @click="revokeShare"
          >
            <Power :size="18" />
            <span>{{ shareRevoking ? '停用中' : '停用链接' }}</span>
          </button>
        </div>

        <div v-if="hasGeneratedCode()" class="code-blocks">
          <label class="field full">
            <span>分享链接</span>
            <div class="copy-row">
              <input :value="generatedEmbedUrl" class="input" readonly />
              <button class="icon-button" type="button" title="复制链接" @click="copyText(generatedEmbedUrl, '分享链接')">
                <Copy :size="16" />
              </button>
            </div>
          </label>
          <label class="field full">
            <span>iframe 代码</span>
            <div class="copy-stack">
              <textarea :value="generatedIframeCode" class="textarea code-area" readonly />
              <button class="button secondary copy-button" type="button" @click="copyText(generatedIframeCode, 'iframe 代码')">
                <Link2 :size="18" />
                <span>复制 iframe 代码</span>
              </button>
            </div>
          </label>
        </div>

        <p v-else class="share-hint">
          当前没有可复制的 iframe 代码。请先生成一次链接；重新打开页面后如需再次复制，可再次生成。
        </p>
      </section>
    </div>
  </AppShell>
</template>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 460px);
  gap: 20px;
  align-items: start;
}

.profile-panel {
  padding: 22px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.panel-title {
  margin-bottom: 18px;
}

.panel-title h2 {
  margin: 0;
  font-size: 18px;
}

.panel-title p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.profile-grid,
.share-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.profile-grid .full,
.share-form .full {
  grid-column: 1 / -1;
}

.profile-hint,
.share-hint {
  margin: 16px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.profile-actions,
.share-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 18px;
}

.share-status {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
}

.share-status[data-active="true"] {
  border-color: #bbf7d0;
  background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
}

.share-status-main,
.share-status-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  justify-content: space-between;
  color: #374151;
  font-size: 13px;
}

.share-status strong {
  font-size: 14px;
}

.share-status-main span,
.share-status-meta span {
  color: #6b7280;
}

.toggle-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 4px;
}

.code-blocks {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.copy-row,
.copy-stack {
  display: grid;
  gap: 10px;
}

.copy-row {
  grid-template-columns: minmax(0, 1fr) 42px;
}

.copy-button {
  width: 100%;
  justify-content: center;
}

.icon-button {
  display: inline-grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  color: #374151;
}

.code-area {
  min-height: 120px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 1080px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .profile-grid,
  .share-form {
    grid-template-columns: 1fr;
  }

  .profile-actions,
  .share-actions {
    justify-content: stretch;
  }

  .profile-actions .button,
  .share-actions .button {
    width: 100%;
  }

  .copy-row {
    grid-template-columns: 1fr;
  }

  .icon-button {
    width: 100%;
  }
}
</style>
