<script setup lang="ts">
import { Copy, Edit3, Printer, Search, Trash2, X } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deleteQslCard, listQslCards, updateQslCard } from '@/api/qsl'
import { listQsoLogs } from '@/api/qso'
import type { CardStatus, CardType, PageResponse, QslCard, QslCardPayload, QsoLog } from '@/api/types'
import AppShell from '@/components/AppShell.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import SuccessToast from '@/components/SuccessToast.vue'

const loading = ref(false)
const hasLoaded = ref(false)
const router = useRouter()
const saving = ref(false)
const drawerOpen = ref(false)
const editing = ref<QslCard | null>(null)
const error = ref('')
const copied = ref('')
const successMessage = ref('')
let successTimer: number | undefined
const qsoOptions = ref<QsoLog[]>([])
const page = reactive<PageResponse<QslCard>>({ total: 0, pageNo: 1, pageSize: 10, records: [] })
const query = reactive<{ pageNo: number; pageSize: number; callSign: string; cardType: CardType | ''; status: CardStatus | '' }>({
  pageNo: 1,
  pageSize: 10,
  callSign: '',
  cardType: '',
  status: ''
})
const form = reactive<QslCardPayload>(blankForm())

const totalPages = computed(() => Math.max(1, Math.ceil(page.total / page.pageSize)))
const sentCount = computed(() => page.records.filter((item) => item.cardType === '1').length)
const receivedCount = computed(() => page.records.filter((item) => item.cardType === '2').length)
const pendingCount = computed(() => page.records.filter((item) => item.status === '1').length)

function blankForm(): QslCardPayload {
  return {
    id: null,
    cardType: '1',
    qsoLogId: null,
    callSign: '',
    contactName: '',
    contactAddress: '',
    postalCode: '',
    status: undefined,
    publicConfirmEnabled: true,
    sentAt: null,
    receivedAt: null,
    remark: ''
  }
}

function normalizeDateTime(value?: string | null) {
  if (!value) return null
  return value.length === 16 ? `${value}:00` : value
}

function showSuccess(message: string) {
  successMessage.value = message
  window.clearTimeout(successTimer)
  successTimer = window.setTimeout(() => {
    successMessage.value = ''
  }, 2400)
}

async function fillForm(row: QslCard) {
  Object.assign(form, blankForm())
  editing.value = row
  Object.assign(form, {
    id: row.id,
    cardType: row.cardType,
    qsoLogId: row.qsoLogId ?? null,
    callSign: row.callSign,
    contactName: row.contactName || '',
    contactAddress: row.contactAddress || '',
    postalCode: row.postalCode || '',
    status: row.status,
    publicConfirmEnabled: row.publicConfirmEnabled,
    sentAt: row.sentAt?.slice(0, 16) || null,
    receivedAt: row.receivedAt?.slice(0, 16) || null,
    remark: row.remark || ''
  })
  drawerOpen.value = true
  try {
    const data = await listQsoLogs({ pageNo: 1, pageSize: 1000 })
    qsoOptions.value = data.records
  } catch (err) {
    error.value = err instanceof Error ? err.message : '通联日志加载失败'
  }
}

function selectQsoLog() {
  const qso = qsoOptions.value.find((item) => item.id === form.qsoLogId)
  if (qso) form.callSign = qso.callSign
}

async function fetchData() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await listQslCards({ ...query })
    Object.assign(page, data)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

async function submit() {
  saving.value = true
  try {
    const payload = {
      ...form,
      sentAt: normalizeDateTime(form.sentAt),
      receivedAt: normalizeDateTime(form.receivedAt)
    }
    await updateQslCard(payload)
    drawerOpen.value = false
    showSuccess('QSL 卡片已修改')
    await fetchData()
  } finally {
    saving.value = false
  }
}

async function remove(row: QslCard) {
  if (!window.confirm(`删除 ${row.callSign} 的QSL卡片？`)) return
  await deleteQslCard({ id: row.id })
  await fetchData()
}

function openPrint(row: QslCard) {
  router.push({
    path: '/qsl-print',
    query: {
      cardId: String(row.id),
      ...(row.qsoLogId ? { qsoLogId: String(row.qsoLogId) } : {})
    }
  })
}

function publicUrl(row: QslCard) {
  if (!row.trackingNo) return ''
  return `${window.location.origin}/public/qsl/${row.trackingNo}?token=${row.confirmToken || ''}`
}

async function copyUrl(row: QslCard) {
  const url = publicUrl(row)
  if (!url) return
  await navigator.clipboard.writeText(url)
  copied.value = row.trackingNo || ''
  window.setTimeout(() => {
    copied.value = ''
  }, 1800)
}

function changePage(delta: number) {
  query.pageNo = Math.min(totalPages.value, Math.max(1, query.pageNo + delta))
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <AppShell>
    <SuccessToast :message="successMessage" />
    <PageHeader title="QSL卡片" eyebrow="QSL CARD" />

    <div class="stat-grid">
      <div class="stat">
        <span>当前页发出</span>
        <strong>{{ hasLoaded ? sentCount : '—' }}</strong>
      </div>
      <div class="stat">
        <span>当前页收到</span>
        <strong>{{ hasLoaded ? receivedCount : '—' }}</strong>
      </div>
      <div class="stat">
        <span>当前页待发</span>
        <strong>{{ hasLoaded ? pendingCount : '—' }}</strong>
      </div>
    </div>

    <section class="panel loading-host">
      <LoadingOverlay v-if="!hasLoaded" :active="true" :overlay="false" label="正在加载 QSL 卡片" />
      <template v-else>
      <div class="toolbar">
        <label class="field">
          <span>呼号</span>
          <input v-model.trim="query.callSign" class="input" :disabled="loading" />
        </label>
        <label class="field">
          <span>类型</span>
          <select v-model="query.cardType" class="select" :disabled="loading">
            <option value="">全部</option>
            <option value="1">发出</option>
            <option value="2">收到</option>
          </select>
        </label>
        <label class="field">
          <span>状态</span>
          <select v-model="query.status" class="select" :disabled="loading">
            <option value="">全部</option>
            <option value="1">待发出</option>
            <option value="2">已发出</option>
            <option value="3">已收到</option>
            <option value="4">已确认</option>
          </select>
        </label>
        <label class="field">
          <span>每页</span>
          <select v-model.number="query.pageSize" class="select" :disabled="loading">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </label>
        <button class="button secondary" type="button" :disabled="loading" @click="query.pageNo = 1; fetchData()">
          <Search :size="18" />
          <span>查询</span>
        </button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>呼号</th>
              <th>类型</th>
              <th>状态</th>
              <th>地址</th>
              <th>追踪号</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in page.records" :key="row.id">
              <td><strong>{{ row.callSign }}</strong></td>
              <td><StatusBadge :value="row.cardType" :label="row.cardTypeStr" /></td>
              <td><StatusBadge :value="row.status" :label="row.statusStr" /></td>
              <td>{{ [row.contactName, row.contactAddress, row.postalCode].filter(Boolean).join('，') || '-' }}</td>
              <td>
                <div v-if="row.trackingNo" class="row-actions">
                  <span>{{ row.trackingNo }}</span>
                  <button class="icon-button" type="button" :title="copied === row.trackingNo ? '已复制' : '复制公开链接'" @click="copyUrl(row)">
                    <Copy :size="16" />
                  </button>
                </div>
                <span v-else>-</span>
              </td>
              <td>{{ (row.sentAt || row.receivedAt || row.createdAt)?.replace('T', ' ') }}</td>
              <td>
                <div class="row-actions">
                  <button class="icon-button" type="button" title="打印" @click="openPrint(row)">
                    <Printer :size="16" />
                  </button>
                  <button class="icon-button" type="button" title="编辑" @click="fillForm(row)">
                    <Edit3 :size="16" />
                  </button>
                  <button class="icon-button" type="button" title="删除" @click="remove(row)">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && page.records.length === 0" class="empty">暂无数据</div>
      </div>
      <div class="pagination">
        <span class="muted">共 {{ page.total }} 条</span>
        <button class="button secondary" type="button" :disabled="loading || query.pageNo <= 1" @click="changePage(-1)">上一页</button>
        <span>{{ query.pageNo }} / {{ totalPages }}</span>
        <button class="button secondary" type="button" :disabled="loading || query.pageNo >= totalPages" @click="changePage(1)">下一页</button>
      </div>
      <LoadingOverlay :active="loading" label="正在加载 QSL 卡片" />
      </template>
    </section>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="drawerOpen" class="drawer-mask">
      <form class="drawer" @submit.prevent="submit">
        <div class="drawer-header">
          <h2>{{ editing ? '编辑卡片' : '新增卡片' }}</h2>
          <button class="icon-button" type="button" title="关闭" @click="drawerOpen = false">
            <X :size="18" />
          </button>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>类型</span>
            <select v-model="form.cardType" class="select">
              <option value="1">发出</option>
              <option value="2">收到</option>
            </select>
          </label>
          <label class="field">
            <span>状态</span>
            <select v-model="form.status" class="select">
              <option :value="undefined">自动</option>
              <option value="1">待发出</option>
              <option value="2">已发出</option>
              <option value="3">已收到</option>
              <option value="4">已确认</option>
            </select>
          </label>
          <label class="field">
            <span>通联日志</span>
            <select v-model="form.qsoLogId" class="select" @change="selectQsoLog">
              <option :value="null">未关联</option>
              <option v-for="qso in qsoOptions" :key="qso.id" :value="qso.id">
                {{ qso.callSign }} · {{ qso.qsoTime.replace('T', ' ') }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>呼号</span>
            <input v-model.trim="form.callSign" class="input" required />
          </label>
          <label class="field">
            <span>联系人</span>
            <input v-model.trim="form.contactName" class="input" />
          </label>
          <label class="field">
            <span>邮编</span>
            <input v-model.trim="form.postalCode" class="input" />
          </label>
          <label class="field">
            <span>发出时间</span>
            <input v-model="form.sentAt" class="input" type="datetime-local" />
          </label>
          <label class="field">
            <span>收到时间</span>
            <input v-model="form.receivedAt" class="input" type="datetime-local" />
          </label>
          <label class="field full">
            <span>地址</span>
            <input v-model.trim="form.contactAddress" class="input" />
          </label>
          <label class="field">
            <span>公开确认</span>
            <select v-model="form.publicConfirmEnabled" class="select">
              <option :value="true">开启</option>
              <option :value="false">关闭</option>
            </select>
          </label>
          <label class="field full">
            <span>备注</span>
            <textarea v-model.trim="form.remark" class="textarea" />
          </label>
        </div>
        <div class="form-actions">
          <button class="button secondary" type="button" @click="drawerOpen = false">取消</button>
          <button class="button" type="submit" :disabled="saving">{{ saving ? '保存中' : '保存' }}</button>
        </div>
      </form>
    </div>
  </AppShell>
</template>
