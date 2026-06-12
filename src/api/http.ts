import axios, { AxiosError } from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { showError } from '@/stores/notification'
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
      const message = payload.message || '请求失败，请稍后重试'
      showError(message)
      return Promise.reject(new Error(message))
    }
    return response
  },
  async (error: AxiosError) => {
    const message = await resolveErrorMessage(error)
    showError(message)

    if (error.response?.status === 401) {
      const auth = useAuthStore()
      auth.clear()
      if (router.currentRoute.value.path !== '/login') {
        await router.replace('/login')
      }
    }

    return Promise.reject(new Error(message))
  }
)

async function resolveErrorMessage(error: AxiosError): Promise<string> {
  const responseData = error.response?.data
  if (responseData instanceof Blob) {
    try {
      const payload = JSON.parse(await responseData.text()) as Partial<ApiResponse<unknown>>
      if (payload.message) {
        return payload.message
      }
    } catch {
      // Ignore non-JSON file responses.
    }
  } else if (responseData && typeof responseData === 'object') {
    const payload = responseData as Partial<ApiResponse<unknown>>
    if (payload.message) {
      return payload.message
    }
  }

  if (error.code === 'ECONNABORTED') {
    return '请求超时，请检查网络后重试'
  }
  if (!error.response) {
    return '无法连接服务器，请检查网络或服务状态'
  }
  if (error.response.status === 401) {
    return '登录状态已失效，请重新登录'
  }
  if (error.response.status === 403) {
    return '无权执行此操作'
  }
  if (error.response.status >= 500) {
    return '系统繁忙，请稍后再试'
  }
  return error.message || '请求失败，请稍后重试'
}

export async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await request
  return response.data.data
}
