import { http, unwrap } from './http'
import type {
  CaptchaResponse,
  ChangePasswordPayload,
  LoginPayload,
  LoginResponse,
  RegisterPayload
} from './types'

export function getCaptcha(scene: 'login' | 'register') {
  return unwrap<CaptchaResponse>(http.get('/api/auth/captcha', { params: { scene } }))
}

export function login(data: LoginPayload) {
  return unwrap<LoginResponse>(http.post('/api/auth/login', data))
}

export function register(data: RegisterPayload) {
  return unwrap<void>(http.post('/api/auth/register', data))
}

export function changePassword(data: ChangePasswordPayload) {
  return unwrap<void>(http.post('/api/auth/change-password', data))
}

export function logout() {
  return unwrap<void>(http.post('/api/auth/logout'))
}
