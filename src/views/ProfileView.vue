<script setup lang="ts">
import { Copy, Link2, Power, RefreshCcw, Save, X } from 'lucide-vue-next'
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
const previewVisible = ref(false)
const revokeConfirmVisible = ref(false)

const form = reactive<UserProfilePayload>({
  callSign: '',
  email: '',
  mailingAddress: '',
  phone: '',
  recipient: '',
  postalCode: ''
})

const shareForm = reactive({
  recordLimit: 10,
  expiryPreset: '7d' as Exclude<QslShareExpiryPreset, 'custom'>
})

const hasShareLink = computed(() => Boolean(generatedToken.value && generatedEmbedUrl.value && generatedIframeCode.value))

const shareStatusText = computed(() => {
  if (!shareSummary.value) return '尚未生成嵌入链接'
  if (!shareSummary.value.hasToken) return '尚未生成嵌入链接'
  if (shareSummary.value.expired) return '当前嵌入链接已过期'
  return '当前嵌入链接可用'
})

const shareExpiryText = computed(() => {
  if (!shareSummary.value) return '-'
  if (!shareSummary.value.expiresAt) return '永久有效'
  return shareSummary.value.expiresAt.replace('T', ' ').slice(0, 16)
})

function applyShareSnapshot(payload: QslShareSummary | QslShareIssue | null) {
  shareSummary.value = payload
  if (payload?.token && payload.embedUrl && payload.iframeCode) {
    generatedToken.value = payload.token
    generatedEmbedUrl.value = payload.embedUrl
    generatedIframeCode.value = payload.iframeCode
    return
  }
  generatedToken.value = ''
  generatedEmbedUrl.value = ''
  generatedIframeCode.value = ''
}

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

    applyShareSnapshot(profile.qslShare || null)
    if (profile.qslShare) {
      shareForm.recordLimit = profile.qslShare.recordLimit || 10
      shareForm.expiryPreset = profile.qslShare.expiryPreset === 'custom'
        ? '7d'
        : (profile.qslShare.expiryPreset as Exclude<QslShareExpiryPreset, 'custom'>)
    } else {
      shareForm.recordLimit = 10
      shareForm.expiryPreset = '7d'
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
  if (!hasShareLink.value) return
  shareSaving.value = true
  error.value = ''
  try {
    applyShareSnapshot(await updateQslShare({ ...shareForm }))
    successMessage.value = '嵌入分享设置已保存'
    window.setTimeout(() => (successMessage.value = ''), 1800)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '嵌入分享设置保存失败'
  } finally {
    shareSaving.value = false
  }
}

async function generateShare() {
  shareGenerating.value = true
  error.value = ''
  try {
    const payload = await generateQslShare({ ...shareForm })
    applyShareSnapshot(payload)
    shareForm.recordLimit = payload.recordLimit
    shareForm.expiryPreset = payload.expiryPreset === 'custom'
      ? '7d'
      : (payload.expiryPreset as Exclude<QslShareExpiryPreset, 'custom'>)
    successMessage.value = '嵌入链接已生成'
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
    applyShareSnapshot(await revokeQslShare())
    revokeConfirmVisible.value = false
    successMessage.value = '嵌入链接已取消'
    window.setTimeout(() => (successMessage.value = ''), 1800)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '嵌入链接取消失败'
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

function openPreview() {
  if (!hasShareLink.value) return
  previewVisible.value = true
}

function closePreview() {
  previewVisible.value = false
}

function askRevoke() {
  if (!hasShareLink.value) return
  revokeConfirmVisible.value = true
}

function closeRevokeConfirm() {
  revokeConfirmVisible.value = false
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

        <div class="share-status" :data-active="hasShareLink">
          <div class="share-status-main">
            <strong>{{ shareStatusText }}</strong>
            <span>记录条数：{{ shareSummary?.recordLimit ?? shareForm.recordLimit }}</span>
          </div>
          <div class="share-status-meta">
            <span>有效期：{{ shareExpiryText }}</span>
            <span>状态：{{ hasShareLink ? '启用' : '未生成' }}</span>
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
        </div>

        <div class="share-actions">
          <button
            v-if="!hasShareLink"
            class="button"
            type="button"
            :disabled="shareGenerating || loading"
            @click="generateShare"
          >
            <RefreshCcw :size="18" />
            <span>生成链接</span>
          </button>

          <template v-else>
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
              class="button secondary"
              type="button"
              :disabled="!hasShareLink"
              @click="openPreview"
            >
              <Link2 :size="18" />
              <span>预览</span>
            </button>
            <button
              class="button danger"
              type="button"
              :disabled="shareRevoking || loading"
              @click="askRevoke"
            >
              <Power :size="18" />
              <span>{{ shareRevoking ? '取消中' : '取消分享' }}</span>
            </button>
          </template>
        </div>

        <div v-if="hasShareLink" class="code-blocks">
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
                <Copy :size="18" />
                <span>复制 iframe 代码</span>
              </button>
            </div>
          </label>
        </div>

        <p v-else class="share-hint">
          先生成一次链接，之后刷新页面也会保留，方便继续复制分享。
        </p>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="previewVisible" class="modal-backdrop" @click.self="closePreview">
        <section class="modal-card preview-card" role="dialog" aria-modal="true" aria-label="预览当前 iframe 效果">
          <header class="modal-header">
            <div>
              <h3>预览当前 iframe 效果</h3>
              <p>以下内容就是其他网站嵌入后看到的页面。</p>
            </div>
            <button class="icon-button modal-close" type="button" aria-label="关闭预览" @click="closePreview">
              <X :size="16" />
            </button>
          </header>
          <div class="preview-frame-wrap">
            <iframe
              v-if="generatedEmbedUrl"
              :src="generatedEmbedUrl"
              class="preview-frame"
              title="通联记录预览"
              loading="lazy"
            />
          </div>
        </section>
      </div>

      <div v-if="revokeConfirmVisible" class="modal-backdrop" @click.self="closeRevokeConfirm">
        <section class="modal-card confirm-card" role="dialog" aria-modal="true" aria-label="确认取消分享">
          <header class="modal-header">
            <div>
              <h3>取消分享</h3>
              <p>取消后会删除当前分享记录，链接将立即失效。</p>
            </div>
            <button class="icon-button modal-close" type="button" aria-label="关闭确认框" @click="closeRevokeConfirm">
              <X :size="16" />
            </button>
          </header>
          <div class="confirm-actions">
            <button class="button secondary" type="button" :disabled="shareRevoking" @click="closeRevokeConfirm">
              取消
            </button>
            <button class="button danger" type="button" :disabled="shareRevoking" @click="revokeShare">
              <Power :size="18" />
              <span>{{ shareRevoking ? '取消中' : '确认取消' }}</span>
            </button>
          </div>
        </section>
      </div>
    </Teleport>
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

.share-status[data-active='true'] {
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

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.62);
}

.modal-card {
  width: min(100%, 1060px);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: #fff;
  box-shadow: 0 40px 80px rgba(15, 23, 42, 0.35);
  overflow: hidden;
}

.preview-card {
  display: grid;
}

.confirm-card {
  width: min(100%, 560px);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 18px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.modal-header p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.modal-close {
  flex: 0 0 auto;
}

.preview-frame-wrap {
  min-height: min(72vh, 760px);
  background: #f8fafc;
}

.preview-frame {
  display: block;
  width: 100%;
  height: min(72vh, 760px);
  border: 0;
  background: #fff;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
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
  .share-actions,
  .confirm-actions {
    justify-content: stretch;
  }

  .profile-actions .button,
  .share-actions .button,
  .confirm-actions .button {
    width: 100%;
  }

  .copy-row {
    grid-template-columns: 1fr;
  }

  .icon-button {
    width: 100%;
  }

  .modal-card {
    width: 100%;
  }

  .modal-header {
    flex-direction: column;
  }
}
</style>
