import { http, unwrap } from './http'
import type { IdPayload, PageResponse, QsoLog, QsoLogPayload } from './types'

export interface QsoLogQuery {
  pageNo: number
  pageSize: number
  callSign?: string
  mode?: string
  country?: string
  startTime?: string
  endTime?: string
}

export function listQsoLogs(params: QsoLogQuery) {
  return unwrap<PageResponse<QsoLog>>(http.get('/api/qso-logs', { params }))
}

export function createQsoLog(data: QsoLogPayload) {
  return unwrap<QsoLog>(http.post('/api/qso-logs', data))
}

export function getQsoLog(id: number) {
  return unwrap<QsoLog>(http.get('/api/qso-logs/detail', { params: { id } }))
}

export function updateQsoLog(data: QsoLogPayload) {
  return unwrap<QsoLog>(http.post('/api/qso-logs/update', data))
}

export function deleteQsoLog(data: IdPayload) {
  return unwrap<void>(http.post('/api/qso-logs/delete', data))
}
