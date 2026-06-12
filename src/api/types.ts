export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageResponse<T> {
  total: number
  pageNo: number
  pageSize: number
  records: T[]
}

export interface LoginResponse {
  tokenName: string
  tokenValue: string
  userId: number
  username: string
  mustChangePassword: boolean
}

export interface CaptchaResponse {
  captchaId: string
  captchaImage: string
  expiresIn: number
}

export interface LoginPayload {
  username: string
  password: string
  captchaId: string
  captchaCode: string
}

export interface RegisterPayload {
  username: string
  password: string
  confirmPassword: string
  captchaId: string
  captchaCode: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UserProfile {
  id: number
  username: string
  lastLoginAt?: string
  callSign?: string
  email?: string
  mailingAddress?: string
  phone?: string
  recipient?: string
  postalCode?: string
}

export interface UserProfilePayload {
  callSign?: string
  email?: string
  mailingAddress?: string
  phone?: string
  recipient?: string
  postalCode?: string
}

export interface QsoLog {
  id: number
  callSign: string
  qsoTime: string
  timezoneOffset: string
  frequencyMhz?: number
  bd?: string
  mode?: string
  powerW?: number
  rstSent?: string
  rstReceived?: string
  antenna?: string
  country?: string
  qthProvince?: string
  qthCity?: string
  qthDistrict?: string
  qthDetail?: string
  remark?: string
  qslCardExists?: boolean
  qslCardId?: number
  createdAt: string
  updatedAt: string
}

export interface QsoLogPayload {
  id: number | null
  callSign: string
  qsoTime: string
  timezoneOffset: string
  frequencyMhz?: number | null
  bd?: string
  mode?: string
  powerW?: number | null
  rstSent?: string
  rstReceived?: string
  antenna?: string
  country?: string
  qthProvince?: string
  qthCity?: string
  qthDistrict?: string
  qthDetail?: string
  remark?: string
}

export type CardType = '1' | '2'
export type CardStatus = '1' | '2' | '3' | '4'

export interface QslCard {
  id: number
  cardType: CardType
  cardTypeStr: string
  qsoLogId?: number
  callSign: string
  contactName?: string
  contactAddress?: string
  postalCode?: string
  status: CardStatus
  statusStr: string
  trackingNo?: string
  confirmToken?: string
  publicConfirmEnabled: boolean
  sentAt?: string
  receivedAt?: string
  confirmedAt?: string
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface QslCardPayload {
  id: number | null
  cardType: CardType
  qsoLogId?: number | null
  callSign: string
  contactName?: string
  contactAddress?: string
  postalCode?: string
  status?: CardStatus
  publicConfirmEnabled: boolean
  sentAt?: string | null
  receivedAt?: string | null
  remark?: string
}

export interface IdPayload {
  id: number
}

export interface PublicQslInfo {
  trackingNo: string
  callSign: string
  status: CardStatus
  canConfirm: boolean
}

export interface StorageFile {
  fileKey: string
  originalName: string
  contentType: string
  fileSize: number
}

export type PrintTemplateType = '1' | '2'

export interface PrintTemplate<T = unknown> {
  id: number
  templateName: string
  templateType: PrintTemplateType
  backgroundFileKey?: string | null
  configJson: T
  enabled: boolean
  isDefault: boolean
  sortOrder: number
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface PrintTemplatePayload<T = unknown> {
  id: number | null
  templateName: string
  templateType: PrintTemplateType
  backgroundFileKey?: string | null
  configJson: T
  enabled: boolean
  isDefault: boolean
  sortOrder: number
  remark?: string
}
