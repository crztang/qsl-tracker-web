import { http, unwrap } from './http'
import type { QslShareIssue, QslShareRequest, QslShareSummary, UserProfile, UserProfilePayload } from './types'

export function getUserProfile() {
  return unwrap<UserProfile>(http.get('/api/profile'))
}

export function updateUserProfile(data: UserProfilePayload) {
  return unwrap<UserProfile>(http.post('/api/profile/update', data))
}

export function getQslShare() {
  return unwrap<QslShareSummary>(http.get('/api/profile/embed-share'))
}

export function generateQslShare(data: QslShareRequest) {
  return unwrap<QslShareIssue>(http.post('/api/profile/embed-share/generate', data))
}

export function updateQslShare(data: QslShareRequest) {
  return unwrap<QslShareSummary>(http.post('/api/profile/embed-share/update', data))
}

export function revokeQslShare() {
  return unwrap<QslShareSummary>(http.post('/api/profile/embed-share/revoke', {}))
}
