<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ImagePlus,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut
} from 'lucide-vue-next'
import QRCode from 'qrcode'
import interact from 'interactjs'
import { VueSelecto } from 'vue3-selecto'
import { useRoute } from 'vue-router'
import {
  createPrintTemplate,
  deletePrintTemplate,
  getFileContent,
  listPrintTemplates,
  setDefaultPrintTemplate,
  updatePrintTemplate,
  uploadPrintBackground
} from '@/api/print'
import { getUserProfile } from '@/api/profile'
import { getQslCard } from '@/api/qsl'
import { getQsoLog } from '@/api/qso'
import type {
  PrintTemplate as SavedPrintTemplate,
  PrintTemplatePayload,
  PrintTemplateType,
  QslCard,
  QsoLog,
  UserProfile
} from '@/api/types'
import AppShell from '@/components/AppShell.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PageHeader from '@/components/PageHeader.vue'

type FieldKey =
  | 'callSign'
  | 'qsoTime'
  | 'frequencyMhz'
  | 'bd'
  | 'mode'
  | 'powerW'
  | 'rstSent'
  | 'rstReceived'
  | 'antenna'
  | 'qth'
  | 'contactName'
  | 'contactAddress'
  | 'postalCode'
  | 'senderMailingAddress'
  | 'senderPhone'
  | 'senderRecipient'
  | 'senderPostalCode'
  | 'remark'
  | 'qrCode'

interface PrintField {
  key: FieldKey
  label: string
  x: number
  y: number
  fontSize: number
  visible: boolean
  customValue?: string
  width?: number
  height?: number
  scaleFont?: boolean
  charSpacing?: number
}

interface PrintTemplate {
  widthMm: number
  heightMm: number
  qrHint: string
  fields: PrintField[]
}

const route = useRoute()
const card = ref<QslCard | null>(null)
const qsoLog = ref<QsoLog | null>(null)
const userProfile = ref<UserProfile | null>(null)
const initializing = ref(true)
const templatesLoading = ref(false)
const printDataLoading = ref(false)
const profileLoading = ref(false)
const error = ref('')
const saved = ref(false)
const saving = ref(false)
const uploading = ref(false)
const selectedKey = ref<FieldKey>('callSign')
const selectedKeys = ref<FieldKey[]>(['callSign'])
const cardElement = ref<HTMLElement | null>(null)
const qrDataUrl = ref('')
const template = reactive<PrintTemplate>(defaultTemplate())
const templates = ref<SavedPrintTemplate<PrintTemplate>[]>([])
const currentTemplateId = ref<number | null>(null)
const templateName = ref('QSL 默认配置')
const templateType = ref<PrintTemplateType>('1')
const backgroundFileKey = ref<string | null>(null)
const backgroundUrl = ref('')
const isDefault = ref(false)
let templatesRequestId = 0
let backgroundRequestId = 0

const isPrintMode = computed(() => Boolean(route.query.cardId || route.query.qsoLogId))
const loading = computed(() => initializing.value
  || templatesLoading.value
  || printDataLoading.value
  || profileLoading.value)
const editorBusy = computed(() => initializing.value || templatesLoading.value)
const pageTitle = computed(() => {
  if (!isPrintMode.value) return '打印配置'
  return templateType.value === '1' ? '打印 QSL 卡片' : '打印信封'
})
const selectedField = computed(() => {
  const key = selectedKeys.value[selectedKeys.value.length - 1]
  return key ? template.fields.find((field) => field.key === key) : undefined
})
const keepRatio = ref(true)
const senderFieldKeys: FieldKey[] = [
  'senderMailingAddress',
  'senderPhone',
  'senderRecipient',
  'senderPostalCode'
]
const isSenderField = computed(() => (
  selectedField.value ? senderFieldKeys.includes(selectedField.value.key) : false
))
const cardStyle = computed(() => ({
  '--card-width': `${template.widthMm}mm`,
  '--card-height': `${template.heightMm}mm`,
  '--card-ratio': `${template.widthMm} / ${template.heightMm}`
}))
const qrContent = computed(() => {
  if (!isPrintMode.value) {
    return `${window.location.origin}/public/qsl/DEMO?token=template-preview`
  }
  if (!card.value?.trackingNo) return ''
  return `${window.location.origin}/public/qsl/${card.value.trackingNo}?token=${card.value.confirmToken || ''}`
})

type FieldSnapshot = {
  x: number
  y: number
  width: number
  height: number
  fontSize: number
}

type EdgeFlags = {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

type FieldInteractionRecord = {
  element: HTMLElement
  interactable: any
}

const fieldInteractions = new Map<FieldKey, FieldInteractionRecord>()
let syncInteractionsQueued = false
let dragSession:
  | {
      keys: FieldKey[]
      snapshots: Map<FieldKey, FieldSnapshot>
      deltaX: number
      deltaY: number
    }
  | null = null
let resizeSession:
  | {
      key: FieldKey
      snapshot: FieldSnapshot
      edges: EdgeFlags
      deltaX: number
      deltaY: number
    }
  | null = null

function withFieldDefaults(fields: PrintField[]) {
  return fields.map((field) => ({
    scaleFont: true,
    charSpacing: 0,
    ...field
  }))
}

function defaultTemplate(type: PrintTemplateType = '1'): PrintTemplate {
  if (type === '2') {
    return {
      widthMm: 220,
      heightMm: 110,
      qrHint: '',
      fields: withFieldDefaults([
        { key: 'callSign', label: '对方呼号', x: 58, y: 24, fontSize: 22, visible: true },
        { key: 'contactName', label: '联系人', x: 58, y: 42, fontSize: 16, visible: true },
        { key: 'contactAddress', label: '地址', x: 58, y: 58, fontSize: 15, visible: true },
        { key: 'postalCode', label: '邮编', x: 58, y: 76, fontSize: 16, visible: true },
        { key: 'senderRecipient', label: '寄件人收件人', x: 8, y: 60, fontSize: 12, visible: true },
        { key: 'senderPhone', label: '寄件人联系电话', x: 8, y: 70, fontSize: 12, visible: true },
        { key: 'senderMailingAddress', label: '寄件人邮寄地址', x: 8, y: 80, fontSize: 12, visible: true },
        { key: 'senderPostalCode', label: '寄件人邮编', x: 8, y: 90, fontSize: 12, visible: true },
        { key: 'qsoTime', label: '通联时间', x: 8, y: 36, fontSize: 14, visible: false },
        { key: 'frequencyMhz', label: '频率', x: 8, y: 51, fontSize: 14, visible: false },
        { key: 'bd', label: '波段', x: 34, y: 51, fontSize: 14, visible: false },
        { key: 'mode', label: '模式', x: 52, y: 51, fontSize: 14, visible: false },
        { key: 'powerW', label: '功率', x: 70, y: 51, fontSize: 14, visible: false },
        { key: 'rstSent', label: '发送 RST', x: 8, y: 66, fontSize: 14, visible: false },
        { key: 'rstReceived', label: '接收 RST', x: 31, y: 66, fontSize: 14, visible: false },
        { key: 'antenna', label: '天线', x: 70, y: 66, fontSize: 14, visible: false },
        { key: 'qth', label: 'QTH', x: 8, y: 81, fontSize: 12, visible: false },
        { key: 'remark', label: '备注', x: 8, y: 81, fontSize: 12, visible: false },
        { key: 'qrCode', label: '公开确认二维码', x: 76, y: 8, fontSize: 88, visible: false }
      ])
    }
  }
  return {
    widthMm: 140,
    heightMm: 90,
    qrHint: '扫码确认 QSL 卡片',
    fields: withFieldDefaults([
      { key: 'callSign', label: '对方呼号', x: 8, y: 12, fontSize: 28, visible: true },
      { key: 'qsoTime', label: '通联时间', x: 8, y: 36, fontSize: 14, visible: true },
      { key: 'frequencyMhz', label: '频率', x: 8, y: 51, fontSize: 14, visible: true },
      { key: 'bd', label: '波段', x: 34, y: 51, fontSize: 14, visible: true },
      { key: 'mode', label: '模式', x: 52, y: 51, fontSize: 14, visible: true },
      { key: 'rstSent', label: '发送 RST', x: 8, y: 66, fontSize: 14, visible: true },
      { key: 'rstReceived', label: '接收 RST', x: 31, y: 66, fontSize: 14, visible: true },
      { key: 'qth', label: 'QTH', x: 8, y: 81, fontSize: 12, visible: true },
      { key: 'powerW', label: '功率', x: 70, y: 51, fontSize: 14, visible: false },
      { key: 'antenna', label: '天线', x: 70, y: 66, fontSize: 14, visible: false },
      { key: 'contactName', label: '联系人', x: 63, y: 12, fontSize: 14, visible: false },
      { key: 'contactAddress', label: '地址', x: 63, y: 27, fontSize: 12, visible: false },
      { key: 'postalCode', label: '邮编', x: 63, y: 42, fontSize: 12, visible: false },
      { key: 'senderRecipient', label: '寄件人收件人', x: 8, y: 60, fontSize: 12, visible: false },
      { key: 'senderPhone', label: '寄件人联系电话', x: 8, y: 70, fontSize: 12, visible: false },
      { key: 'senderMailingAddress', label: '寄件人邮寄地址', x: 8, y: 80, fontSize: 12, visible: false },
      { key: 'senderPostalCode', label: '寄件人邮编', x: 8, y: 90, fontSize: 12, visible: false },
      { key: 'remark', label: '备注', x: 63, y: 81, fontSize: 12, visible: false },
      { key: 'qrCode', label: '公开确认二维码', x: 76, y: 8, fontSize: 88, visible: true }
    ])
  }
}

function fieldValue(key: FieldKey) {
  if (key === 'qrCode') return ''
  const field = template.fields.find((item) => item.key === key)
  if (!isPrintMode.value) return field?.label || ''
  if (field?.customValue?.trim()) return field.customValue.trim()
  const senderValues: Partial<Record<FieldKey, string>> = {
    senderMailingAddress: userProfile.value?.mailingAddress || '-',
    senderPhone: userProfile.value?.phone || '-',
    senderRecipient: userProfile.value?.recipient || '-',
    senderPostalCode: userProfile.value?.postalCode || '-'
  }
  if (senderFieldKeys.includes(key)) return senderValues[key] || '-'
  const qso = qsoLog.value
  const qsl = card.value
  const values: Record<FieldKey, string> = {
    callSign: qso?.callSign || qsl?.callSign || '-',
    qsoTime: qso?.qsoTime?.replace('T', ' ') || '-',
    frequencyMhz: qso?.frequencyMhz != null ? `${qso.frequencyMhz} MHz` : '-',
    bd: qso?.bd || '-',
    mode: qso?.mode || '-',
    powerW: qso?.powerW != null ? `${qso.powerW} W` : '-',
    rstSent: qso?.rstSent || '-',
    rstReceived: qso?.rstReceived || '-',
    antenna: qso?.antenna || '-',
    qth: [qso?.country, qso?.qthProvince, qso?.qthCity, qso?.qthDistrict, qso?.qthDetail].filter(Boolean).join(' ') || '-',
    contactName: qsl?.contactName || '-',
    contactAddress: qsl?.contactAddress || '-',
    postalCode: qsl?.postalCode || '-',
    senderMailingAddress: userProfile.value?.mailingAddress || '-',
    senderPhone: userProfile.value?.phone || '-',
    senderRecipient: userProfile.value?.recipient || '-',
    senderPostalCode: userProfile.value?.postalCode || '-',
    remark: qsl?.remark || qso?.remark || '-',
    qrCode: ''
  }
  return values[key]
}

function fieldStyle(field: PrintField) {
  return {
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: field.width ? `${field.width}%` : undefined,
    height: field.height ? `${field.height}%` : undefined,
    fontSize: field.key === 'qrCode' ? '12px' : `${field.fontSize}px`,
    letterSpacing: field.charSpacing ? `${field.charSpacing}px` : undefined
  }
}

function setSelectedKeys(keys: FieldKey[]) {
  selectedKeys.value = Array.from(new Set(keys))
  if (selectedKeys.value.length) {
    selectedKey.value = selectedKeys.value[selectedKeys.value.length - 1]
  }
}

function selectField(field: PrintField, event?: MouseEvent) {
  if (event?.shiftKey) {
    setSelectedKeys(selectedKeys.value.includes(field.key)
      ? selectedKeys.value.filter((key) => key !== field.key)
      : [...selectedKeys.value, field.key])
  } else if (!selectedKeys.value.includes(field.key)) {
    setSelectedKeys([field.key])
  }
  selectedKey.value = field.key
}

function onSelect(event: any) {
  const keys = (event.selected as HTMLElement[])
    .map((element: HTMLElement) => element.dataset.fieldKey as FieldKey)
    .filter(Boolean)
  setSelectedKeys(keys)
}

function canStartSelection(event: any) {
  return !event.inputEvent?.target?.closest?.('.print-field')
}

function scheduleFieldInteractionSync() {
  if (syncInteractionsQueued) return
  syncInteractionsQueued = true
  void nextTick().then(() => {
    syncInteractionsQueued = false
    syncFieldInteractions()
  })
}

function syncFieldInteractions() {
  const root = cardElement.value
  if (!root) return
  const visibleKeys = new Set(template.fields.filter((field) => field.visible).map((field) => field.key))
  for (const [key, record] of fieldInteractions) {
    if (!visibleKeys.has(key) || !root.contains(record.element)) {
      record.interactable?.unset?.()
      fieldInteractions.delete(key)
    }
  }
  for (const field of template.fields) {
    if (!field.visible) continue
    const element = root.querySelector<HTMLElement>(`[data-field-key="${field.key}"]`)
    if (!element) continue
    const record = fieldInteractions.get(field.key)
    if (record?.element === element) continue
    record?.interactable?.unset?.()
    const interactable = createFieldInteractable(field.key, element)
    fieldInteractions.set(field.key, { element, interactable })
  }
}

function createFieldInteractable(key: FieldKey, element: HTMLElement) {
  return interact(element)
    .draggable({
      listeners: {
        start: () => onFieldDragStart(key),
        move: (event: any) => onFieldDragMove(key, event),
        end: () => onFieldDragEnd()
      }
    })
    .resizable({
      edges: {
        left: '.resize-handle-left, .resize-handle-top-left, .resize-handle-bottom-left',
        right: '.resize-handle-right, .resize-handle-top-right, .resize-handle-bottom-right',
        top: '.resize-handle-top, .resize-handle-top-left, .resize-handle-top-right',
        bottom: '.resize-handle-bottom, .resize-handle-bottom-left, .resize-handle-bottom-right'
      },
      invert: 'none',
      listeners: {
        start: (event: any) => onFieldResizeStart(key, event),
        move: (event: any) => onFieldResizeMove(key, event),
        end: (event: any) => onFieldResizeEnd(key, event)
      }
    })
}

function fieldSnapshot(field: PrintField): FieldSnapshot {
  const size = fieldSize(field)
  return {
    x: field.x,
    y: field.y,
    width: size.width,
    height: size.height,
    fontSize: field.fontSize
  }
}

function onFieldDragStart(key: FieldKey) {
  const field = template.fields.find((item) => item.key === key)
  if (!field) return
  if (!selectedKeys.value.includes(key)) {
    setSelectedKeys([key])
  } else {
    selectedKey.value = key
  }
  const keys = selectedKeys.value.filter((fieldKey) => template.fields.some((item) => item.key === fieldKey && item.visible))
  dragSession = {
    keys: keys.length ? keys : [key],
    snapshots: new Map(),
    deltaX: 0,
    deltaY: 0
  }
  dragSession.keys.forEach((fieldKey) => {
    const current = template.fields.find((item) => item.key === fieldKey)
    if (current) {
      dragSession?.snapshots.set(fieldKey, fieldSnapshot(current))
    }
  })
}

function onFieldDragMove(key: FieldKey, event: any) {
  const session = dragSession
  if (!session || !cardElement.value) return
  const rect = cardElement.value.getBoundingClientRect()
  session.deltaX += (event.dx || 0) / rect.width * 100
  session.deltaY += (event.dy || 0) / rect.height * 100
  const keys = session.keys.length ? session.keys : [key]
  keys.forEach((fieldKey) => {
    const field = template.fields.find((item) => item.key === fieldKey)
    const snapshot = session.snapshots.get(fieldKey)
    if (!field || !snapshot) return
    field.x = clamp(snapshot.x + session.deltaX, 0, 100 - snapshot.width)
    field.y = clamp(snapshot.y + session.deltaY, 0, 100 - snapshot.height)
  })
}

function onFieldDragEnd() {
  dragSession = null
}

function onFieldResizeStart(key: FieldKey, event: any) {
  const field = template.fields.find((item) => item.key === key)
  if (!field) return
  if (!selectedKeys.value.includes(key)) {
    setSelectedKeys([key])
  } else {
    selectedKey.value = key
  }
  resizeSession = {
    key,
    snapshot: fieldSnapshot(field),
    edges: {
      left: Boolean(event.edges?.left),
      right: Boolean(event.edges?.right),
      top: Boolean(event.edges?.top),
      bottom: Boolean(event.edges?.bottom)
    },
    deltaX: 0,
    deltaY: 0
  }
}

function onFieldResizeMove(key: FieldKey, event: any) {
  if (!resizeSession || resizeSession.key !== key || !cardElement.value) return
  const field = template.fields.find((item) => item.key === key)
  if (!field) return
  const rect = cardElement.value.getBoundingClientRect()
  if (resizeSession.edges.left) {
    resizeSession.deltaX += (event.deltaRect?.left || 0) / rect.width * 100
  }
  if (resizeSession.edges.top) {
    resizeSession.deltaY += (event.deltaRect?.top || 0) / rect.height * 100
  }
  const nextX = resizeSession.edges.left
    ? clamp(resizeSession.snapshot.x + resizeSession.deltaX, 0, 99)
    : resizeSession.snapshot.x
  const nextY = resizeSession.edges.top
    ? clamp(resizeSession.snapshot.y + resizeSession.deltaY, 0, 99)
    : resizeSession.snapshot.y
  const widthChanged = resizeSession.edges.left || resizeSession.edges.right
  const heightChanged = resizeSession.edges.top || resizeSession.edges.bottom
  field.x = nextX
  field.y = nextY
  field.width = widthChanged
    ? clamp(event.rect.width / rect.width * 100, 1, 100 - nextX)
    : resizeSession.snapshot.width
  field.height = heightChanged
    ? clamp(event.rect.height / rect.height * 100, 1, 100 - nextY)
    : resizeSession.snapshot.height
}

function onFieldResizeEnd(key: FieldKey, event: any) {
  if (!resizeSession || resizeSession.key !== key) {
    resizeSession = null
    return
  }
  const field = template.fields.find((item) => item.key === key)
  if (!field) {
    resizeSession = null
    return
  }
  const edgesCount = Number(resizeSession.edges.left) + Number(resizeSession.edges.right) + Number(resizeSession.edges.top) + Number(resizeSession.edges.bottom)
  if (field.scaleFont === false || edgesCount !== 2 || !cardElement.value) {
    resizeSession = null
    return
  }
  const rect = cardElement.value.getBoundingClientRect()
  if (resizeSession.snapshot.width <= 0 || resizeSession.snapshot.height <= 0) {
    resizeSession = null
    return
  }
  const widthRatio = (event.rect.width / rect.width * 100) / resizeSession.snapshot.width
  const heightRatio = (event.rect.height / rect.height * 100) / resizeSession.snapshot.height
  const ratio = keepRatio.value ? widthRatio : Math.sqrt(widthRatio * heightRatio)
  field.fontSize = Math.max(8, Number((resizeSession.snapshot.fontSize * ratio).toFixed(1)))
  resizeSession = null
}

function fieldByElement(element: HTMLElement) {
  return template.fields.find((field) => field.key === element.dataset.fieldKey)
}

function fieldSize(field: PrintField) {
  const element = cardElement.value?.querySelector<HTMLElement>(`[data-field-key="${field.key}"]`)
  const cardRect = cardElement.value?.getBoundingClientRect()
  if (!element || !cardRect) {
    return { width: field.width || 10, height: field.height || 8 }
  }
  const rect = element.getBoundingClientRect()
  return {
    width: field.width || rect.width / cardRect.width * 100,
    height: field.height || rect.height / cardRect.height * 100
  }
}

async function alignSelected(direction: 'left' | 'top' | 'right' | 'bottom') {
  const fields = template.fields.filter((field) => selectedKeys.value.includes(field.key))
  if (fields.length < 2) return
  const sized = fields.map((field) => ({ field, ...fieldSize(field) }))
  if (direction === 'left') {
    const target = Math.min(...fields.map((field) => field.x))
    fields.forEach((field) => (field.x = target))
  } else if (direction === 'top') {
    const target = Math.min(...fields.map((field) => field.y))
    fields.forEach((field) => (field.y = target))
  } else if (direction === 'right') {
    const target = Math.max(...sized.map((item) => item.field.x + item.width))
    sized.forEach((item) => (item.field.x = clamp(target - item.width, 0, 99)))
  } else {
    const target = Math.max(...sized.map((item) => item.field.y + item.height))
    sized.forEach((item) => (item.field.y = clamp(target - item.height, 0, 99)))
  }
}

async function scaleSelected(factor: number) {
  const fields = template.fields.filter((field) => selectedKeys.value.includes(field.key))
  fields.forEach((field) => {
    const size = fieldSize(field)
    field.width = clamp(size.width * factor, 1, 100 - field.x)
    field.height = clamp(size.height * factor, 1, 100 - field.y)
    if (field.scaleFont !== false) {
      field.fontSize = Math.max(8, Number((field.fontSize * factor).toFixed(1)))
    }
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number(value.toFixed(2))))
}

async function saveTemplate() {
  if (!templateName.value.trim()) {
    error.value = '请输入配置名称'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload: PrintTemplatePayload<PrintTemplate> = {
      id: currentTemplateId.value,
      templateName: templateName.value.trim(),
      templateType: templateType.value,
      backgroundFileKey: backgroundFileKey.value,
      configJson: JSON.parse(JSON.stringify(template)),
      enabled: true,
      isDefault: isDefault.value,
      sortOrder: 0,
      remark: ''
    }
    const result = currentTemplateId.value
      ? await updatePrintTemplate(payload)
      : await createPrintTemplate(payload)
    currentTemplateId.value = result.id
    await loadTemplates(result.id)
    saved.value = true
    window.setTimeout(() => (saved.value = false), 1600)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存打印配置失败'
  } finally {
    saving.value = false
  }
}

function resetTemplate() {
  Object.assign(template, defaultTemplate(templateType.value))
  scheduleFieldInteractionSync()
}

function printCard() {
  updatePrintPageStyle()
  window.print()
}

function newTemplate() {
  currentTemplateId.value = null
  templateName.value = templateType.value === '1' ? 'QSL 新配置' : '信封新配置'
  backgroundFileKey.value = null
  isDefault.value = false
  clearBackgroundUrl()
  Object.assign(template, defaultTemplate(templateType.value))
  scheduleFieldInteractionSync()
}

async function loadTemplates(preferredId?: number) {
  const requestId = ++templatesRequestId
  const requestedType = templateType.value
  templatesLoading.value = true
  error.value = ''
  try {
    const loadedTemplates = await listPrintTemplates(requestedType) as SavedPrintTemplate<PrintTemplate>[]
    if (requestId !== templatesRequestId || requestedType !== templateType.value) return
    templates.value = loadedTemplates
    const selected = loadedTemplates.find((item) => item.id === preferredId)
      || loadedTemplates.find((item) => item.id === currentTemplateId.value)
      || loadedTemplates.find((item) => item.isDefault)
      || loadedTemplates[0]
    if (selected) {
      await selectTemplate(selected.id)
    } else {
      newTemplate()
    }
    scheduleFieldInteractionSync()
  } catch (err) {
    if (requestId !== templatesRequestId) return
    templates.value = []
    newTemplate()
    error.value = err instanceof Error ? err.message : '打印配置加载失败'
  } finally {
    if (requestId === templatesRequestId) {
      templatesLoading.value = false
    }
  }
}

async function selectTemplate(id: number) {
  const selected = templates.value.find((item) => item.id === id)
  if (!selected) return
  currentTemplateId.value = selected.id
  templateName.value = selected.templateName
  templateType.value = selected.templateType
  backgroundFileKey.value = selected.backgroundFileKey ?? null
  isDefault.value = selected.isDefault
  applyTemplateConfig(selected.templateType, selected.configJson)
  await loadBackground()
  scheduleFieldInteractionSync()
}

function applyTemplateConfig(type: PrintTemplateType, config: PrintTemplate) {
  const defaults = defaultTemplate(type)
  const configuredFields = new Map((config.fields || []).map((field) => [field.key, field]))
  Object.assign(template, {
    ...defaults,
    ...config,
    fields: defaults.fields.map((field) => ({
      ...field,
      ...configuredFields.get(field.key),
      scaleFont: configuredFields.get(field.key)?.scaleFont ?? true,
      charSpacing: configuredFields.get(field.key)?.charSpacing ?? 0
    }))
  })
  scheduleFieldInteractionSync()
}

async function onTemplateSelect(event: Event) {
  if (templatesLoading.value) return
  const id = Number((event.target as HTMLSelectElement).value)
  templatesLoading.value = true
  error.value = ''
  try {
    if (id) await selectTemplate(id)
    else newTemplate()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '打印配置加载失败'
  } finally {
    templatesLoading.value = false
  }
}

async function changeTemplateType() {
  currentTemplateId.value = null
  await loadTemplates()
}

async function removeTemplate() {
  if (!currentTemplateId.value || !window.confirm(`删除打印配置“${templateName.value}”吗？`)) return
  try {
    await deletePrintTemplate(currentTemplateId.value)
    currentTemplateId.value = null
    await loadTemplates()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除打印配置失败'
  }
}

async function makeDefault() {
  if (!currentTemplateId.value) return
  try {
    await setDefaultPrintTemplate(currentTemplateId.value)
    await loadTemplates(currentTemplateId.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '设置默认配置失败'
  }
}

async function uploadBackground(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const result = await uploadPrintBackground(file)
    backgroundFileKey.value = result.fileKey
    await loadBackground()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '背景图片上传失败'
  } finally {
    uploading.value = false
  }
}

async function loadBackground() {
  const requestId = ++backgroundRequestId
  const requestedFileKey = backgroundFileKey.value
  clearBackgroundUrl()
  if (!requestedFileKey) return
  try {
    const blob = await getFileContent(requestedFileKey)
    if (requestId !== backgroundRequestId || requestedFileKey !== backgroundFileKey.value) return
    backgroundUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    if (requestId !== backgroundRequestId) return
    error.value = err instanceof Error ? err.message : '背景图片加载失败'
  }
}

function removeBackground() {
  backgroundRequestId += 1
  backgroundFileKey.value = null
  clearBackgroundUrl()
}

function clearBackgroundUrl() {
  if (backgroundUrl.value) URL.revokeObjectURL(backgroundUrl.value)
  backgroundUrl.value = ''
}

function updatePrintPageStyle() {
  const id = 'qsl-dynamic-page-size'
  let style = document.getElementById(id) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = id
    document.head.appendChild(style)
  }
  style.textContent = `
    :root {
      --card-width: ${template.widthMm}mm;
      --card-height: ${template.heightMm}mm;
    }
    @page { size: ${template.widthMm}mm ${template.heightMm}mm; margin: 0; }
    @media print {
      html, body, #app {
        width: ${template.widthMm}mm !important;
        height: ${template.heightMm}mm !important;
        min-width: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
    }
  `
}

async function loadData() {
  const cardId = Number(route.query.cardId)
  const routeQsoLogId = Number(route.query.qsoLogId)
  if (!cardId && !routeQsoLogId) return
  printDataLoading.value = true
  error.value = ''
  try {
    if (cardId) card.value = await getQslCard(cardId)
    const qsoLogId = routeQsoLogId || card.value?.qsoLogId
    if (qsoLogId) {
      qsoLog.value = await getQsoLog(qsoLogId)
    } else {
      error.value = '当前 QSL 卡片未关联通联日志，仅显示卡片信息。'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '打印数据加载失败'
  } finally {
    printDataLoading.value = false
  }
}

async function loadUserProfile() {
  if (!isPrintMode.value) return
  profileLoading.value = true
  try {
    userProfile.value = await getUserProfile()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '个人资料加载失败'
  } finally {
    profileLoading.value = false
  }
}

onMounted(async () => {
  document.body.classList.add('qsl-print-page')
  try {
    await Promise.all([loadData(), loadTemplates(), loadUserProfile()])
  } finally {
    initializing.value = false
    scheduleFieldInteractionSync()
  }
})

watch(
  qrContent,
  async (content) => {
    qrDataUrl.value = content
      ? await QRCode.toDataURL(content, {
          width: 360,
          margin: 0,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M'
        })
      : ''
  },
  { immediate: true }
)

watch(
  () => template.fields.map((field) => `${field.key}:${field.visible}`).join('|'),
  () => scheduleFieldInteractionSync()
)

onBeforeUnmount(() => {
  for (const record of fieldInteractions.values()) {
    record.interactable?.unset?.()
  }
  fieldInteractions.clear()
  clearBackgroundUrl()
  document.body.classList.remove('qsl-print-page')
  document.getElementById('qsl-dynamic-page-size')?.remove()
})
</script>

<template>
  <AppShell>
    <PageHeader :title="pageTitle" eyebrow="QSL PRINT">
      <button class="button secondary" type="button" :disabled="editorBusy" @click="newTemplate">
        <Plus :size="17" />
        <span>新建配置</span>
      </button>
      <button class="button secondary" type="button" :disabled="editorBusy" @click="resetTemplate">
        <RotateCcw :size="17" />
        <span>恢复默认</span>
      </button>
      <button class="button secondary" type="button" :disabled="editorBusy || saving" @click="saveTemplate">
        <Save :size="17" />
        <span>{{ saving ? '保存中' : saved ? '已保存' : '保存配置' }}</span>
      </button>
      <button v-if="isPrintMode" class="button" type="button" :disabled="loading" @click="printCard">
        <Printer :size="17" />
        <span>打印</span>
      </button>
    </PageHeader>

    <LoadingOverlay
      v-if="initializing"
      :active="true"
      :overlay="false"
      label="正在加载打印配置"
    />
    <Transition name="print-editor" appear>
      <div v-if="!initializing" class="print-editor loading-host">
        <div class="print-editor-content" :inert="editorBusy || undefined">
          <p v-if="error" class="print-notice">{{ error }}</p>
          <div class="print-layout">
      <section class="print-workspace">
        <div class="alignment-toolbar">
          <span class="selection-count">{{ selectedKeys.length }} 项已选择</span>
          <div class="toolbar-group" aria-label="对齐">
            <button
              class="icon-button"
              type="button"
              title="左对齐"
              aria-label="左对齐"
              :disabled="selectedKeys.length < 2"
              @click="alignSelected('left')"
            >
              <AlignHorizontalJustifyStart :size="17" />
            </button>
            <button
              class="icon-button"
              type="button"
              title="上对齐"
              aria-label="上对齐"
              :disabled="selectedKeys.length < 2"
              @click="alignSelected('top')"
            >
              <AlignVerticalJustifyStart :size="17" />
            </button>
            <button
              class="icon-button"
              type="button"
              title="右对齐"
              aria-label="右对齐"
              :disabled="selectedKeys.length < 2"
              @click="alignSelected('right')"
            >
              <AlignHorizontalJustifyEnd :size="17" />
            </button>
            <button
              class="icon-button"
              type="button"
              title="下对齐"
              aria-label="下对齐"
              :disabled="selectedKeys.length < 2"
              @click="alignSelected('bottom')"
            >
              <AlignVerticalJustifyEnd :size="17" />
            </button>
          </div>
          <div class="toolbar-group" aria-label="缩放">
            <button
              class="icon-button"
              type="button"
              title="缩小"
              aria-label="缩小"
              :disabled="!selectedKeys.length"
              @click="scaleSelected(0.9)"
            >
              <ZoomOut :size="17" />
            </button>
            <button
              class="icon-button"
              type="button"
              title="放大"
              aria-label="放大"
              :disabled="!selectedKeys.length"
              @click="scaleSelected(1.1)"
            >
              <ZoomIn :size="17" />
            </button>
          </div>
          <label v-if="selectedField" class="toolbar-field">
            <span>X</span>
            <input
              v-model.number="selectedField.x"
              type="number"
              min="0"
              max="96"
              step="0.1"
              title="横向位置"
            />
          </label>
          <label v-if="selectedField" class="toolbar-field">
            <span>Y</span>
            <input
              v-model.number="selectedField.y"
              type="number"
              min="0"
              max="94"
              step="0.1"
              title="纵向位置"
            />
          </label>
          <label v-if="selectedField" class="toolbar-field font-size-field">
            <span>{{ selectedField.key === 'qrCode' ? '尺寸' : '字号' }}</span>
            <input
              v-model.number="selectedField.fontSize"
              type="number"
              :min="selectedField.key === 'qrCode' ? 40 : 8"
              :max="selectedField.key === 'qrCode' ? 240 : 48"
            />
          </label>
          <label v-if="selectedField && selectedField.key !== 'qrCode'" class="toolbar-field char-spacing-field">
            <span>字符间距</span>
            <input
              v-model.number="selectedField.charSpacing"
              type="number"
              min="0"
              max="20"
              step="0.1"
              title="字符间距(px)"
            />
          </label>
          <label class="ratio-option">
            <input v-model="keepRatio" type="checkbox" />
            <span>等比缩放</span>
          </label>
        </div>
        <div
          ref="cardElement"
          class="print-card"
          :class="{ 'is-configuring': !isPrintMode }"
          :style="cardStyle"
        >
          <img
            v-if="backgroundUrl"
            class="preview-background"
            :src="backgroundUrl"
            alt="定位背景"
          />
          <button
            v-for="field in template.fields.filter((item) => item.visible)"
            :key="field.key"
            class="print-field"
            :class="{
              selected: selectedKeys.includes(field.key),
              'wrap-field': field.key === 'senderMailingAddress'
            }"
            :data-field-key="field.key"
            :style="fieldStyle(field)"
            type="button"
            @click.stop="selectField(field, $event)"
          >
            <span v-if="field.key === 'qrCode'" class="qr-field">
              <img v-if="qrDataUrl" :src="qrDataUrl" :style="{ width: `${field.fontSize}px`, height: `${field.fontSize}px` }" alt="公开确认二维码" />
              <span v-else class="qr-empty">暂无追踪号</span>
              <strong v-if="template.qrHint">{{ template.qrHint }}</strong>
            </span>
            <strong v-else>{{ fieldValue(field.key) }}</strong>
            <span class="resize-handle resize-handle-left" aria-hidden="true"></span>
            <span class="resize-handle resize-handle-right" aria-hidden="true"></span>
            <span class="resize-handle resize-handle-top" aria-hidden="true"></span>
            <span class="resize-handle resize-handle-bottom" aria-hidden="true"></span>
            <span class="resize-handle resize-handle-top-left" aria-hidden="true"></span>
            <span class="resize-handle resize-handle-top-right" aria-hidden="true"></span>
            <span class="resize-handle resize-handle-bottom-left" aria-hidden="true"></span>
            <span class="resize-handle resize-handle-bottom-right" aria-hidden="true"></span>
          </button>
          <VueSelecto
            v-if="cardElement"
            :container="cardElement"
            :drag-container="cardElement"
            :selectable-targets="['.print-field']"
            :select-by-click="true"
            :select-from-inside="false"
            :continue-select="false"
            :toggle-continue-select="'shift'"
            :hit-rate="10"
            :drag-condition="canStartSelection"
            @select="onSelect"
          />
        </div>
        <p class="preview-caption">
          预览按 {{ template.widthMm }} × {{ template.heightMm }} mm 比例显示。可拖动字段，按 Shift 多选，边缘手柄调整尺寸，角点可联动字号。
        </p>
      </section>

      <aside class="print-settings">
        <h2>打印配置</h2>
        <div class="template-settings">
            <label class="field">
              <span>类型</span>
              <select v-model="templateType" class="select" @change="changeTemplateType">
              <option value="1">QSL 卡片</option>
              <option value="2">信封</option>
              </select>
            </label>
            <label class="field">
              <span>已有配置</span>
            <select
              :value="currentTemplateId ?? ''"
              class="select"
              @change="onTemplateSelect"
            >
            <option value="">新配置</option>
            <option v-for="item in templates" :key="item.id" :value="item.id">
                {{ item.templateName }}{{ item.isDefault ? '（默认）' : '' }}
              </option>
            </select>
          </label>
          <label class="field full">
            <span>配置名称</span>
            <input v-model.trim="templateName" class="input" maxlength="128" />
          </label>
          <div class="template-actions full">
            <button
              class="button secondary"
              type="button"
              :disabled="!currentTemplateId || isDefault"
              @click="makeDefault"
            >
              设为默认
            </button>
            <button
              class="button danger"
              type="button"
              :disabled="!currentTemplateId"
              @click="removeTemplate"
            >
              <Trash2 :size="16" />
              <span>删除</span>
            </button>
          </div>
        </div>

        <h2>定位背景</h2>
        <div class="background-actions">
          <label class="button secondary upload-button">
            <ImagePlus :size="17" />
            <span>{{ uploading ? '上传中' : '上传图片' }}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              :disabled="uploading"
              @change="uploadBackground"
            />
          </label>
          <button
            v-if="backgroundFileKey"
            class="button secondary"
            type="button"
            @click="removeBackground"
          >
            移除背景
          </button>
        </div>
        <p class="settings-hint">背景图片仅用于定位预览，不会打印。</p>

        <h2>卡片尺寸</h2>
        <div class="size-grid">
          <label class="field">
            <span>宽度(mm)</span>
            <input v-model.number="template.widthMm" class="input" type="number" min="40" max="400" />
          </label>
          <label class="field">
            <span>高度(mm)</span>
            <input v-model.number="template.heightMm" class="input" type="number" min="40" max="400" />
          </label>
        </div>

        <h2>打印字段</h2>
        <div class="field-list">
          <label
            v-for="field in template.fields"
            :key="field.key"
            class="field-option"
            :class="{ active: selectedKeys.includes(field.key) }"
            @click="selectField(field, $event)"
          >
            <input v-model="field.visible" type="checkbox" />
            <span>{{ field.label }}</span>
          </label>
        </div>

        <template v-if="selectedField">
          <h2>当前字段</h2>
          <div class="size-grid">
            <label v-if="selectedField.key === 'qrCode'" class="field full">
              <span>扫码提示文字</span>
              <input v-model.trim="template.qrHint" class="input" maxlength="80" placeholder="例如：扫码确认 QSL 卡片" />
            </label>
            <label class="field full check-field">
              <input v-model="selectedField.scaleFont" type="checkbox" />
              <span>拖动四角时同步缩放字号</span>
            </label>
            <label v-if="isSenderField" class="field full">
              <span>自定义内容</span>
              <textarea
                v-model.trim="selectedField.customValue"
                class="textarea"
                maxlength="500"
                placeholder="留空时使用当前用户个人资料"
              ></textarea>
            </label>
          </div>
        </template>
            </aside>
          </div>
        </div>
        <LoadingOverlay :active="templatesLoading" label="正在切换打印配置" />
      </div>
    </Transition>
  </AppShell>
</template>

<style scoped>
.print-editor-enter-active,
.print-editor-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.print-editor-enter-from,
.print-editor-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.print-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.print-workspace,
.print-settings {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 18px;
}

.print-workspace {
  min-width: 0;
  overflow: auto;
}

.alignment-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 9px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #f9fafb;
  font-size: 13px;
}

.selection-count {
  color: #6b7280;
  white-space: nowrap;
}

.alignment-toolbar button {
  display: inline-grid;
  place-items: center;
  min-height: 30px;
  padding: 0 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #374151;
  cursor: pointer;
}

.alignment-toolbar .icon-button {
  width: 32px;
  padding: 0;
}

.alignment-toolbar button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.toolbar-group {
  display: inline-flex;
  gap: 4px;
  padding-right: 8px;
  border-right: 1px solid #e5e7eb;
}

.alignment-toolbar label,
.check-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-field {
  min-width: 0;
  color: #4b5563;
  white-space: nowrap;
}

.toolbar-field input {
  box-sizing: border-box;
  width: 68px;
  height: 30px;
  padding: 0 6px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #111827;
}

.font-size-field input {
  width: 64px;
}

.char-spacing-field input {
  width: 64px;
}

.ratio-option {
  margin-left: auto;
  white-space: nowrap;
}

.print-card {
  position: relative;
  width: min(100%, 900px);
  aspect-ratio: var(--card-ratio);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #111827;
  background: #fff;
}

.preview-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  opacity: 0.65;
  pointer-events: none;
  user-select: none;
}

.print-field {
  position: absolute;
  z-index: 1;
  box-sizing: border-box;
  display: grid;
  gap: 1px;
  padding: 3px 5px;
  border: 1px solid transparent;
  background: transparent;
  color: #111827;
  text-align: left;
  line-height: 1.1;
  white-space: nowrap;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.print-field:hover,
.print-field.selected {
  border-color: #6366f1;
  background: rgba(238, 242, 255, 0.78);
}

.print-field.wrap-field {
  max-width: 42%;
  white-space: normal;
}

.resize-handle {
  position: absolute;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.12s ease;
  background: rgba(99, 102, 241, 0.14);
  pointer-events: auto;
}

.print-field:hover .resize-handle,
.print-field.selected .resize-handle {
  opacity: 1;
}

.resize-handle-left,
.resize-handle-right {
  top: 8px;
  bottom: 8px;
  width: 4px;
  cursor: ew-resize;
}

.resize-handle-left {
  left: -2px;
}

.resize-handle-right {
  right: -2px;
}

.resize-handle-top,
.resize-handle-bottom {
  left: 8px;
  right: 8px;
  height: 4px;
  cursor: ns-resize;
}

.resize-handle-top {
  top: -2px;
}

.resize-handle-bottom {
  bottom: -2px;
}

.resize-handle-top-left,
.resize-handle-top-right,
.resize-handle-bottom-left,
.resize-handle-bottom-right {
  width: 10px;
  height: 10px;
}

.resize-handle-top-left {
  top: -4px;
  left: -4px;
  cursor: nwse-resize;
}

.resize-handle-top-right {
  top: -4px;
  right: -4px;
  cursor: nesw-resize;
}

.resize-handle-bottom-left {
  bottom: -4px;
  left: -4px;
  cursor: nesw-resize;
}

.resize-handle-bottom-right {
  right: -4px;
  bottom: -4px;
  cursor: nwse-resize;
}

.qr-field {
  display: grid;
  justify-items: center;
  gap: 4px;
}

.qr-field img {
  display: block;
  max-width: none;
}

.qr-field strong {
  max-width: 140px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.25;
  text-align: center;
  white-space: normal;
}

.qr-empty {
  display: grid;
  width: 88px;
  height: 88px;
  place-items: center;
  border: 1px dashed #9ca3af;
  color: #6b7280;
  font-size: 11px;
}

.preview-caption {
  margin: 14px 0 0;
  color: #6b7280;
  font-size: 13px;
  text-align: center;
}

.print-settings h2 {
  margin: 0 0 12px;
  font-size: 16px;
}

.print-settings h2:not(:first-child) {
  margin-top: 22px;
}

.template-settings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.template-settings .full {
  grid-column: 1 / -1;
}

.template-actions,
.background-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.upload-button {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.upload-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.settings-hint {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.check-field {
  min-height: 36px;
  padding: 0 4px;
}

.size-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.size-grid .full {
  grid-column: 1 / -1;
}

.field-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.field-option {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 9px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  font-size: 13px;
  cursor: pointer;
}

.field-option.active {
  border-color: #6366f1;
  background: #eef2ff;
}

.print-notice {
  margin: 0 0 14px;
  padding: 10px 12px;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
}

@media (max-width: 1100px) {
  .print-layout {
    grid-template-columns: 1fr;
  }
}

@media print {
  .print-editor-enter-active,
  .print-editor-leave-active {
    transition: none;
  }

  :global(body.qsl-print-page) {
    margin: 0;
    background: #fff;
    overflow: hidden;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  :global(body.qsl-print-page .sidebar),
  :global(body.qsl-print-page .page-header),
  :global(body.qsl-print-page .print-settings),
  :global(body.qsl-print-page .alignment-toolbar),
  :global(body.qsl-print-page .preview-caption),
  :global(body.qsl-print-page .print-notice) {
    display: none !important;
  }

  .preview-background {
    display: none !important;
  }

  :global(body.qsl-print-page .selecto-selection) {
    display: none !important;
  }

  :global(body.qsl-print-page .shell) {
    display: block;
    width: var(--card-width);
    height: var(--card-height);
    min-height: 0;
  }

  :global(body.qsl-print-page .main),
  .print-workspace {
    width: var(--card-width);
    height: var(--card-height);
    margin: 0;
    padding: 0;
    border: 0;
    overflow: hidden;
  }

  .print-layout {
    display: block;
    width: var(--card-width);
    height: var(--card-height);
  }

  .print-card {
    position: fixed;
    inset: 0;
    width: var(--card-width);
    height: var(--card-height);
    margin: 0;
    border: 0;
    background: #fff;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .print-field,
  .print-field:hover,
  .print-field.selected {
    appearance: none;
    padding: 0;
    border-color: transparent;
    background: transparent;
  }

}

@media (prefers-reduced-motion: reduce) {
  .print-editor-enter-active,
  .print-editor-leave-active {
    transition: none;
  }
}
</style>
