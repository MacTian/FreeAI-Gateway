/**
 * API Client - replaces window.electron.ipcRenderer
 * All calls map to REST endpoints on the Express backend
 */

// 开发时 VITE_API_URL=http://localhost:3013，生产时为空（同源）
const BASE = import.meta.env.VITE_API_URL || ''

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>('GET', path)
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
const put = <T>(path: string, body?: unknown) => request<T>('PUT', path, body)
const del = <T>(path: string) => request<T>('DELETE', path)

export const api = {
  // App
  getVersion: () => get<{ version: string }>('/api/app/version'),

  // Config
  getConfig: () => get<any>('/api/config'),
  updateConfig: (patch: any) => put<any>('/api/config', patch),

  // Providers
  getProviders: () => get<any[]>('/api/providers'),
  addProvider: (data: any) => post<any>('/api/providers', data),
  updateProvider: (id: string, data: any) => put<any>(`/api/providers/${id}`, data),
  deleteProvider: (id: string) => del<any>(`/api/providers/${id}`),

  // Accounts
  getAccounts: () => get<any[]>('/api/accounts'),
  getAccountById: (id: string) => get<any>(`/api/accounts/${id}`),
  addAccount: (data: any) => post<any>('/api/accounts', data),
  updateAccount: (id: string, data: any) => put<any>(`/api/accounts/${id}`, data),
  deleteAccount: (id: string) => del<any>(`/api/accounts/${id}`),

  // Proxy
  startProxy: (port?: number, host?: string) => post<any>('/api/proxy/start', { port, host }),
  stopProxy: () => post<any>('/api/proxy/stop'),
  getProxyStatus: () => get<any>('/api/proxy/status'),
  getStatistics: () => get<any>('/api/proxy/statistics'),
  resetStatistics: () => post<any>('/api/proxy/reset-statistics'),

  // Models
  getModels: () => get<any>('/api/models'),

  // API Keys
  getKeys: () => get<any[]>('/api/keys'),
  createKey: (name: string, description?: string) => post<any>('/api/keys', { name, description }),
  deleteKey: (id: string) => del<any>(`/api/keys/${id}`),

  // Logs
  getLogs: (limit?: number) => get<any[]>(`/api/logs${limit ? '?limit=' + limit : ''}`),
  clearLogs: () => del<any>('/api/logs'),
  getLogStats: () => get<any>('/api/logs/stats'),
  getLogTrend: (days?: number) => get<any[]>(`/api/logs/trend${days ? '?days=' + days : ''}`),
}

// Polyfill window.electron for legacy code
// (window as any).electron = { ipcRenderer: { invoke: electronCompat, on: () => {} } }
