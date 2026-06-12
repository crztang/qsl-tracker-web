import { http, unwrap } from './http'
import type { DictItem } from './types'

export function listDictItems(code: string) {
  return unwrap<DictItem[]>(http.get(`/api/dicts/${code}/items`))
}
