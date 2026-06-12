import { http, unwrap } from './http'
import type { UserProfile, UserProfilePayload } from './types'

export function getUserProfile() {
  return unwrap<UserProfile>(http.get('/api/profile'))
}

export function updateUserProfile(data: UserProfilePayload) {
  return unwrap<UserProfile>(http.post('/api/profile/update', data))
}
