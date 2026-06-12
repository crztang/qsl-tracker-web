import { http, unwrap } from './http'
import type {
  PrintTemplate,
  PrintTemplatePayload,
  PrintTemplateType,
  StorageFile
} from './types'

export function listPrintTemplates(templateType?: PrintTemplateType) {
  return unwrap<PrintTemplate[]>(http.get('/api/print-templates', {
    params: templateType ? { templateType } : undefined
  }))
}

export function createPrintTemplate(data: PrintTemplatePayload) {
  return unwrap<PrintTemplate>(http.post('/api/print-templates', data))
}

export function updatePrintTemplate(data: PrintTemplatePayload) {
  return unwrap<PrintTemplate>(http.post('/api/print-templates/update', data))
}

export function deletePrintTemplate(id: number) {
  return unwrap<void>(http.post('/api/print-templates/delete', { id }))
}

export function setDefaultPrintTemplate(id: number) {
  return unwrap<void>(http.post('/api/print-templates/default', { id }))
}

export function uploadPrintBackground(file: File) {
  const form = new FormData()
  form.append('file', file)
  return unwrap<StorageFile>(http.post('/api/files/upload', form))
}

export async function getFileContent(fileKey: string) {
  const response = await http.get<Blob>(`/api/files/${fileKey}/content`, { responseType: 'blob' })
  return response.data
}
