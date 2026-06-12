import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from './types'

export const http = axios.create({
  baseURL: '',
  timeout: 15000
})

http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.authorization) {
    config.headers.Authorization = auth.authorization
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse<unknown>
    if (payload && typeof payload.code === 'number' && payload.code !== 0) {
      return Promise.reject(new Error(payload.message || '请求失败'))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore()
      auth.clear()
      router.replace('/login')
    }
    return Promise.reject(error)
  }
)

export async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await request
  return response.data.data
}
