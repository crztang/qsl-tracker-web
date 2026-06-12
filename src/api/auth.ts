import { http, unwrap } from './http'
import type { LoginResponse } from './types'

export function login(username: string, password: string) {
  return unwrap<LoginResponse>(http.post('/api/auth/login', { username, password }))
}

export function logout() {
  return unwrap<void>(http.post('/api/auth/logout'))
}
