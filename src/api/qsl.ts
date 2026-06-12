import { http, unwrap } from './http'
import type { CardStatus, CardType, IdPayload, PageResponse, PublicQslInfo, QslCard, QslCardPayload } from './types'

export interface QslCardQuery {
  pageNo: number
  pageSize: number
  callSign?: string
  cardType?: CardType | ''
  status?: CardStatus | ''
}

export function listQslCards(params: QslCardQuery) {
  return unwrap<PageResponse<QslCard>>(http.get('/api/qsl-cards', { params }))
}

export function createQslCard(data: QslCardPayload) {
  return unwrap<QslCard>(http.post('/api/qsl-cards', data))
}

export function getQslCard(id: number) {
  return unwrap<QslCard>(http.get('/api/qsl-cards/detail', { params: { id } }))
}

export function updateQslCard(data: QslCardPayload) {
  return unwrap<QslCard>(http.post('/api/qsl-cards/update', data))
}

export function deleteQslCard(data: IdPayload) {
  return unwrap<void>(http.post('/api/qsl-cards/delete', data))
}

export function getPublicQslInfo(trackingNo: string) {
  return unwrap<PublicQslInfo>(http.get(`/api/public/qsl-cards/${trackingNo}`))
}

export function confirmPublicQsl(trackingNo: string, token: string) {
  return unwrap<void>(http.post(`/api/public/qsl-cards/${trackingNo}/confirm`, { token }))
}
