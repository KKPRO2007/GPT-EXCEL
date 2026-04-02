const BASE = 'http://localhost:3001/api'

async function req(method: string, url: string, body?: any, isFormData = false) {
  const opts: RequestInit = { method, headers: isFormData ? {} : { 'Content-Type': 'application/json' } }
  if (body) opts.body = isFormData ? body : JSON.stringify(body)
  const res = await fetch(`${BASE}${url}`, opts)
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText)
    throw new Error(t.slice(0, 120))
  }
  return res.json()
}

export const api = {
  health: () => req('GET', '/health'),

  login: (email: string, password: string) => req('POST', '/auth/login', { email, password }),
  register: (name: string, email: string, department: string) => req('POST', '/auth/register', { name, email, department }),

  uploadFiles: (files: File[], department: string, uploadedBy: string) => {
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    return req('POST', `/files/upload?department=${encodeURIComponent(department)}&uploadedBy=${encodeURIComponent(uploadedBy)}`, fd, true)
  },
  getFiles: (params?: { department?: string; type?: string; search?: string }) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v))).toString()
    return req('GET', `/files${q ? '?' + q : ''}`)
  },
  deleteFile: (id: string) => req('DELETE', `/files/${id}`),
  browseDir: (path: string) => req('GET', `/files/browse?path=${encodeURIComponent(path)}`),
  mkdir: (path: string) => req('POST', '/files/mkdir', { path }),
  searchDisk: (query: string, directory?: string) => {
    const q = `query=${encodeURIComponent(query)}${directory ? '&directory=' + encodeURIComponent(directory) : ''}`
    return req('GET', `/files/search-disk?${q}`)
  },

  analyzeFile: (fileId: string) => req('GET', `/excel/analyze/${fileId}`),
  analyzeUpload: (file: File) => { const fd = new FormData(); fd.append('file', file); return req('POST', '/excel/analyze', fd, true) },
  getRawSheet: (fileId: string) => req('GET', `/excel/raw/${fileId}`),
  compareFiles: (fileId1: string, fileId2: string) => req('POST', '/excel/compare', { fileId1, fileId2 }),
  excelCommand: (fileId: string, command: string) => req('POST', '/excel/command', { fileId, command }),
  generateExcel: (data: any[], filename: string, sheetName?: string, department?: string) =>
    req('POST', '/excel/generate', { data, filename, sheetName, department }),
  saveSheet: (fileId: string, rows: any[], sheetName: string) =>
    req('POST', `/excel/save/${fileId}`, { rows, sheetName }),

  getWorkflows: () => req('GET', '/workflows'),
  createWorkflow: (data: any) => req('POST', '/workflows', data),
  updateWorkflow: (id: string, data: any) => req('PATCH', `/workflows/${id}`, data),
  deleteWorkflow: (id: string) => req('DELETE', `/workflows/${id}`),
  runWorkflow: (id: string) => req('POST', `/workflows/${id}/run`),

  generateDoc: (type: string, data: any, title: string) => req('POST', '/documents/generate', { type, data, title }),

  getDashboardStats: () => req('GET', '/dashboard/stats'),
  getUsers: () => req('GET', '/users'),
}