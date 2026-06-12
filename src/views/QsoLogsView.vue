<script setup lang="ts">
import { Edit3, Mail, Plus, Search, Trash2, X } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { listDictItems } from '@/api/dict'
import { createQslCard } from '@/api/qsl'
import { createQsoLog, deleteQsoLog, listQsoLogs, updateQsoLog } from '@/api/qso'
import type { DictItem, PageResponse, QslCardPayload, QsoLog, QsoLogPayload } from '@/api/types'
import AppShell from '@/components/AppShell.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PageHeader from '@/components/PageHeader.vue'
import SuccessToast from '@/components/SuccessToast.vue'

const MODE_DICT_CODE = 'QSO_MODE'
const FALLBACK_MODE_OPTIONS: DictItem[] = ['FM', 'SSTV', 'SSB', 'RTTY', 'CW', 'FT8'].map((itemCode, index) => ({
  id: index + 1,
  dictId: 0,
  itemCode,
  itemName: itemCode,
  sortOrder: index + 1,
  enabled: true,
  createdAt: '',
  updatedAt: ''
}))

const loading = ref(false)
const hasLoaded = ref(false)
const saving = ref(false)
const drawerOpen = ref(false)
const cardDrawerOpen = ref(false)
const editing = ref<QsoLog | null>(null)
const selectedQso = ref<QsoLog | null>(null)
const error = ref('')
const successMessage = ref('')
const modeOptions = ref<DictItem[]>(FALLBACK_MODE_OPTIONS)
let successTimer: number | undefined
const page = reactive<PageResponse<QsoLog>>({ total: 0, pageNo: 1, pageSize: 10, records: [] })
const query = reactive({ pageNo: 1, pageSize: 10, callSign: '', mode: '', qth: '' })
const form = reactive<QsoLogPayload>(blankForm())
const cardForm = reactive<QslCardPayload>(blankCardForm())

const totalPages = computed(() => Math.max(1, Math.ceil(page.total / page.pageSize)))

function blankForm(): QsoLogPayload {
  return {
    id: null,
    callSign: '',
    qsoTime: new Date().toISOString().slice(0, 16),
    timezoneOffset: '+08:00',
    frequencyMhz: null,
    bd: '',
    mode: 'SSB',
    powerW: null,
    rstSent: '59',
    rstReceived: '59',
    antenna: '',
    qth: '',
    antennaHeight: '',
    device: '',
    remark: ''
  }
}

function blankCardForm(): QslCardPayload {
  return {
    id: null,
    cardType: '1',
    qsoLogId: null,
    callSign: '',
    contactName: '',
    contactAddress: '',
    postalCode: '',
    status: '1',
    publicConfirmEnabled: true,
    sentAt: null,
    receivedAt: null,
    remark: ''
  }
}

function normalizeDateTime(value: string) {
  return value.length === 16 ? `${value}:00` : value
}

function showSuccess(message: string) {
  successMessage.value = message
  window.clearTimeout(successTimer)
  successTimer = window.setTimeout(() => {
    successMessage.value = ''
  }, 2400)
}

function normalizeMode(value?: string) {
  return value?.trim().toUpperCase() || ''
}

function fillForm(row?: QsoLog) {
  Object.assign(form, blankForm())
  editing.value = row || null
  if (row) {
    Object.assign(form, {
      ...row,
      qsoTime: row.qsoTime?.slice(0, 16),
      frequencyMhz: row.frequencyMhz ?? null,
      powerW: row.powerW ?? null,
      mode: normalizeMode(row.mode) || form.mode
    })
  }
  drawerOpen.value = true
}

async function loadModeOptions() {
  try {
    const items = await listDictItems(MODE_DICT_CODE)
    if (items.length > 0) {
      modeOptions.value = items
    }
  } catch {
    modeOptions.value = FALLBACK_MODE_OPTIONS
  }
  if (modeOptions.value.length > 0 && !modeOptions.value.some((item) => item.itemCode === form.mode)) {
    form.mode = modeOptions.value[0].itemCode
  }
}

async function fetchData() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await listQsoLogs({ ...query })
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
    const payload = { ...form, qsoTime: normalizeDateTime(form.qsoTime), mode: normalizeMode(form.mode) || form.mode }
    if (payload.id != null) {
      await updateQsoLog(payload)
      showSuccess('通联日志已修改')
    } else {
      await createQsoLog(payload)
      showSuccess('通联日志已新增')
    }
    drawerOpen.value = false
    await fetchData()
  } finally {
    saving.value = false
  }
}

async function remove(row: QsoLog) {
  if (!window.confirm(`删除 ${row.callSign} 的通联记录？`)) return
  await deleteQsoLog({ id: row.id })
  await fetchData()
}

function openSendCard(row: QsoLog) {
  selectedQso.value = row
  Object.assign(cardForm, blankCardForm(), {
    qsoLogId: row.id,
    callSign: row.callSign
  })
  cardDrawerOpen.value = true
}

async function saveCard() {
  saving.value = true
  try {
    await createQslCard({
      ...cardForm,
      sentAt: cardForm.sentAt ? normalizeDateTime(cardForm.sentAt) : null
    })
    cardDrawerOpen.value = false
    showSuccess('QSL 卡片已新增')
    await fetchData()
  } finally {
    saving.value = false
  }
}

function changePage(delta: number) {
  query.pageNo = Math.min(totalPages.value, Math.max(1, query.pageNo + delta))
  void fetchData()
}

onMounted(() => {
  void loadModeOptions()
  void fetchData()
})
</script>

<template>
  <AppShell>
    <SuccessToast :message="successMessage" />
    <PageHeader title="通联日志" eyebrow="QSO LOG">
      <button class="button" type="button" @click="fillForm()">
        <Plus :size="18" />
        <span>新增</span>
      </button>
    </PageHeader>

    <section class="panel loading-host">
      <LoadingOverlay v-if="!hasLoaded" :active="true" :overlay="false" label="正在加载通联日志" />
      <template v-else>
        <div class="toolbar">
          <label class="field">
            <span>呼号</span>
            <input v-model.trim="query.callSign" class="input" :disabled="loading" />
          </label>
          <label class="field">
            <span>模式</span>
            <select v-model="query.mode" class="select" :disabled="loading">
              <option value="">全部</option>
              <option v-for="item in modeOptions" :key="item.itemCode" :value="item.itemCode">
                {{ item.itemName }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>QTH</span>
            <input v-model.trim="query.qth" class="input" :disabled="loading" />
          </label>
          <label class="field">
            <span>每页</span>
            <select v-model.number="query.pageSize" class="select" :disabled="loading">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </label>
          <button class="button secondary" type="button" :disabled="loading" @click="query.pageNo = 1; void fetchData()">
            <Search :size="18" />
            <span>查询</span>
          </button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>呼号</th>
                <th>通联时间</th>
                <th>频率</th>
                <th>模式</th>
                <th>QTH</th>
                <th>RST</th>
                <th>QSL卡片</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in page.records" :key="row.id">
                <td><strong>{{ row.callSign }}</strong></td>
                <td>{{ row.qsoTime?.replace('T', ' ') }}</td>
                <td>{{ row.frequencyMhz ?? '-' }} MHz</td>
                <td>{{ row.mode || '-' }}</td>
                <td>{{ row.qth || '-' }}</td>
                <td>{{ row.rstSent || '-' }} / {{ row.rstReceived || '-' }}</td>
                <td>
                  <span class="badge" :data-tone="row.qslCardExists ? 'CONFIRMED' : 'PENDING_SEND'">
                    {{ row.qslCardExists ? '已有卡片' : '未创建' }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <button
                      class="icon-button"
                      type="button"
                      :disabled="row.qslCardExists"
                      :title="row.qslCardExists ? '该通联已有QSL卡片' : '发送卡片'"
                      @click="openSendCard(row)"
                    >
                      <Mail :size="16" />
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
        <LoadingOverlay :active="loading" label="正在加载通联日志" />
      </template>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="drawerOpen" class="drawer-mask">
      <form class="drawer" @submit.prevent="submit">
        <div class="drawer-header">
          <h2>{{ editing ? '编辑通联' : '新增通联' }}</h2>
          <button class="icon-button" type="button" title="关闭" @click="drawerOpen = false">
            <X :size="18" />
          </button>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>呼号</span>
            <input v-model.trim="form.callSign" class="input" required />
          </label>
          <label class="field">
            <span>通联时间</span>
            <input v-model="form.qsoTime" class="input" type="datetime-local" required />
          </label>
          <label class="field">
            <span>时区</span>
            <input v-model.trim="form.timezoneOffset" class="input" />
          </label>
          <label class="field">
            <span>频率 MHz</span>
            <input v-model.number="form.frequencyMhz" class="input" type="number" step="0.000001" required />
          </label>
          <label class="field">
            <span>波段</span>
            <input v-model.trim="form.bd" class="input" />
          </label>
          <div class="field full">
            <span>模式</span>
            <div class="radio-group">
              <label v-for="item in modeOptions" :key="item.itemCode" class="radio-pill">
                <input v-model="form.mode" type="radio" :value="item.itemCode" />
                <span>{{ item.itemName }}</span>
              </label>
            </div>
          </div>
          <label class="field">
            <span>功率 W</span>
            <input v-model.number="form.powerW" class="input" type="number" step="0.01" />
          </label>
          <label class="field">
            <span>天线</span>
            <input v-model.trim="form.antenna" class="input" />
          </label>
          <label class="field">
            <span>QTH</span>
            <input v-model.trim="form.qth" class="input" />
          </label>
          <label class="field">
            <span>天线高度</span>
            <input v-model.trim="form.antennaHeight" class="input" />
          </label>
          <label class="field">
            <span>设备</span>
            <input v-model.trim="form.device" class="input" />
          </label>
          <label class="field">
            <span>RST 发送</span>
            <input v-model.trim="form.rstSent" class="input" />
          </label>
          <label class="field">
            <span>RST 接收</span>
            <input v-model.trim="form.rstReceived" class="input" />
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

    <div v-if="cardDrawerOpen && selectedQso" class="drawer-mask">
      <form class="drawer card-drawer" @submit.prevent="saveCard">
        <div class="drawer-header">
          <h2>发送 QSL 卡片</h2>
          <button class="icon-button" type="button" title="关闭" @click="cardDrawerOpen = false">
            <X :size="18" />
          </button>
        </div>

        <section class="detail-section">
          <h3>通联记录</h3>
          <dl class="detail-grid">
            <div><dt>对方呼号</dt><dd>{{ selectedQso.callSign }}</dd></div>
            <div><dt>通联时间</dt><dd>{{ selectedQso.qsoTime.replace('T', ' ') }}</dd></div>
            <div><dt>频率</dt><dd>{{ selectedQso.frequencyMhz ?? '-' }} MHz</dd></div>
            <div><dt>波段</dt><dd>{{ selectedQso.bd || '-' }}</dd></div>
            <div><dt>模式</dt><dd>{{ selectedQso.mode || '-' }}</dd></div>
            <div><dt>功率</dt><dd>{{ selectedQso.powerW ?? '-' }} W</dd></div>
            <div><dt>RST</dt><dd>{{ selectedQso.rstSent || '-' }} / {{ selectedQso.rstReceived || '-' }}</dd></div>
            <div><dt>天线</dt><dd>{{ selectedQso.antenna || '-' }}</dd></div>
            <div><dt>QTH</dt><dd>{{ selectedQso.qth || '-' }}</dd></div>
            <div><dt>天线高度</dt><dd>{{ selectedQso.antennaHeight || '-' }}</dd></div>
            <div><dt>设备</dt><dd>{{ selectedQso.device || '-' }}</dd></div>
            <div class="full"><dt>备注</dt><dd>{{ selectedQso.remark || '-' }}</dd></div>
          </dl>
        </section>

        <section class="detail-section">
          <div class="form-grid">
            <label class="field">
              <span>对方呼号</span>
              <input v-model.trim="cardForm.callSign" class="input" required />
            </label>
            <label class="field">
              <span>状态</span>
              <select v-model="cardForm.status" class="select">
                <option value="1">待发出</option>
                <option value="2">已发出</option>
              </select>
            </label>
            <label class="field">
              <span>联系人</span>
              <input v-model.trim="cardForm.contactName" class="input" />
            </label>
            <label class="field">
              <span>邮编</span>
              <input v-model.trim="cardForm.postalCode" class="input" />
            </label>
            <label class="field full">
              <span>通信地址</span>
              <input v-model.trim="cardForm.contactAddress" class="input" />
            </label>
            <label class="field">
              <span>发出时间</span>
              <input v-model="cardForm.sentAt" class="input" type="datetime-local" />
            </label>
            <label class="field">
              <span>公开确认</span>
              <select v-model="cardForm.publicConfirmEnabled" class="select">
                <option :value="true">开启</option>
                <option :value="false">关闭</option>
              </select>
            </label>
            <label class="field full">
              <span>备注</span>
              <textarea v-model.trim="cardForm.remark" class="textarea" />
            </label>
          </div>
        </section>

        <div class="form-actions">
          <button class="button secondary" type="button" @click="cardDrawerOpen = false">取消</button>
          <button class="button" type="submit" :disabled="saving">{{ saving ? '保存中' : '保存卡片' }}</button>
        </div>
      </form>
    </div>
  </AppShell>
</template>

<style scoped>
.card-drawer {
  width: min(760px, 100%);
}

.detail-section + .detail-section {
  margin-top: 24px;
}

.detail-section h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 14px;
  border-radius: 8px;
  background: #f6f7f9;
}

.detail-grid div {
  min-width: 0;
}

.detail-grid .full {
  grid-column: 1 / -1;
}

.detail-grid dt {
  color: #6b7280;
  font-size: 12px;
}

.detail-grid dd {
  margin: 3px 0 0;
  color: #111827;
  word-break: break-word;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 8px;
}

.radio-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
}

.radio-pill:has(input:checked) {
  border-color: #6366f1;
  background: #eef2ff;
}

.radio-pill input {
  margin: 0;
}
</style>
