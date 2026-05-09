/**
 * Web Store - JSON file-based storage (replaces electron-store + safeStorage)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type {
  Account, Provider, ApiKey, AppConfig, LogEntry, SessionConfig
} from './types.js'

// 本地补充类型
interface RequestLogEntry {
  id: string
  timestamp: number
  level: string
  message: string
  accountId?: string
  providerId?: string
  requestId?: string
  data?: Record<string, unknown>
}

interface PersistentStatistics {
  totalRequests: number
  successRequests: number
  failedRequests: number
  avgLatency: number
  requestsPerMinute: number
  activeConnections: number
  modelUsage: Record<string, number>
  providerUsage: Record<string, number>
  accountUsage: Record<string, number>
}

interface SessionRecord {
  id: string
  providerId: string
  accountId: string
  model?: string
  createdAt: number
  updatedAt: number
  messages: any[]
}

const DATA_DIR = process.env.CHAT2API_DATA || join(homedir(), '.chat2api')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

function readJson<T>(file: string, fallback: T): T {
  const path = join(DATA_DIR, file)
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

function writeJson(file: string, data: unknown): void {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8')
}

const DEFAULT_CONFIG: AppConfig = {
  proxyPort: 8080,
  proxyHost: '127.0.0.1',
  loadBalanceStrategy: 'round-robin',
  modelMappings: {},
  theme: 'system',
  autoStart: false,
  autoStartProxy: false,
  minimizeToTray: false,
  logLevel: 'info',
  logRetentionDays: 7,
  requestTimeout: 30000,
  retryCount: 3,
  apiKeys: [],
  enableApiKey: false,
  oauthProxyMode: 'none',
  sessionConfig: { maxSessions: 10, sessionTimeout: 3600000, cleanupInterval: 300000 } as any,
  toolPromptConfig: {} as any,
}

export const store = {
  // Config
  getConfig(): AppConfig {
    return { ...DEFAULT_CONFIG, ...readJson<Partial<AppConfig>>('config.json', {}) }
  },
  updateConfig(patch: Partial<AppConfig>): AppConfig {
    const current = this.getConfig()
    const updated = { ...current, ...patch }
    writeJson('config.json', updated)
    return updated
  },

  // Providers
  getProviders(): Provider[] {
    return readJson<Provider[]>('providers.json', [])
  },
  addProvider(data: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>): Provider {
    const providers = this.getProviders()
    const p: Provider = { ...data as any, id: randomUUID(), createdAt: Date.now(), updatedAt: Date.now() }
    providers.push(p)
    writeJson('providers.json', providers)
    return p
  },
  updateProvider(id: string, patch: Partial<Provider>): Provider | null {
    const providers = this.getProviders()
    const idx = providers.findIndex(p => p.id === id)
    if (idx === -1) return null
    providers[idx] = { ...providers[idx], ...patch, updatedAt: Date.now() }
    writeJson('providers.json', providers)
    return providers[idx]
  },
  deleteProvider(id: string): boolean {
    const providers = this.getProviders()
    const filtered = providers.filter(p => p.id !== id)
    if (filtered.length === providers.length) return false
    writeJson('providers.json', filtered)
    return true
  },

  // Accounts
  getAccounts(): Account[] {
    return readJson<Account[]>('accounts.json', [])
  },
  addAccount(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    const accounts = this.getAccounts()
    const a: Account = { status: 'active', ...data as any, id: randomUUID(), createdAt: Date.now(), updatedAt: Date.now() }
    accounts.push(a)
    writeJson('accounts.json', accounts)
    return a
  },
  updateAccount(id: string, patch: Partial<Account>): Account | null {
    const accounts = this.getAccounts()
    const idx = accounts.findIndex(a => a.id === id)
    if (idx === -1) return null
    accounts[idx] = { ...accounts[idx], ...patch, updatedAt: Date.now() }
    writeJson('accounts.json', accounts)
    return accounts[idx]
  },
  deleteAccount(id: string): boolean {
    const accounts = this.getAccounts()
    const filtered = accounts.filter(a => a.id !== id)
    if (filtered.length === accounts.length) return false
    writeJson('accounts.json', filtered)
    return true
  },

  // API Keys
  getApiKeys(): ApiKey[] {
    return this.getConfig().apiKeys
  },
  addApiKey(name: string, description?: string): ApiKey {
    const key: ApiKey = {
      id: randomUUID(),
      name,
      key: 'c2a-' + randomUUID().replace(/-/g, ''),
      enabled: true,
      createdAt: Date.now(),
      usageCount: 0,
      description,
    }
    const config = this.getConfig()
    config.apiKeys.push(key)
    writeJson('config.json', config)
    return key
  },
  deleteApiKey(id: string): boolean {
    const config = this.getConfig()
    const filtered = config.apiKeys.filter(k => k.id !== id)
    if (filtered.length === config.apiKeys.length) return false
    config.apiKeys = filtered
    writeJson('config.json', config)
    return true
  },

  // Statistics
  getStatistics() {
    return readJson<any>('statistics.json', {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      requestsPerMinute: 0,
      activeConnections: 0,
      modelUsage: {},
      providerUsage: {},
      accountUsage: {},
    })
  },
  resetStatistics() {
    writeJson('statistics.json', {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      requestsPerMinute: 0,
      activeConnections: 0,
      modelUsage: {},
      providerUsage: {},
      accountUsage: {},
    })
  },

  // Request Logs
  getLogs(limit = 100): RequestLogEntry[] {
    const logs = readJson<RequestLogEntry[]>('logs.json', [])
    return logs.slice(-limit)
  },
  addLog(entry: RequestLogEntry): void {
    const logs = readJson<RequestLogEntry[]>('logs.json', [])
    logs.push(entry)
    // keep last 1000
    if (logs.length > 1000) logs.splice(0, logs.length - 1000)
    writeJson('logs.json', logs)
  },
  clearLogs(): void {
    writeJson('logs.json', [])
  },

  // 增加账户使用次数
  incrementAccountUsage(accountId: string): void {
    const accounts = this.getAccounts()
    const idx = accounts.findIndex(a => a.id === accountId)
    if (idx !== -1) {
      accounts[idx].requestCount = (accounts[idx].requestCount || 0) + 1
      accounts[idx].lastUsed = Date.now()
      writeJson('accounts.json', accounts)
    }
  },

  // 增加请求统计
  incrementStats(durationMs: number, success: boolean): void {
    const stats = this.getStatistics()
    stats.totalRequests = (stats.totalRequests || 0) + 1
    if (success) stats.successRequests = (stats.successRequests || 0) + 1
    else stats.failedRequests = (stats.failedRequests || 0) + 1
    // 滑动平均延迟
    const prev = stats.avgLatency || 0
    const count = stats.totalRequests
    stats.avgLatency = Math.round((prev * (count - 1) + durationMs) / count)
    writeJson('statistics.json', stats)
  },

  // 增加带 ID 返回的日志方法（给 v1Router 用）
  addLogWithId(entry: Omit<RequestLogEntry, 'id'>): string {
    const id = randomUUID()
    const logs = readJson<RequestLogEntry[]>('logs.json', [])
    logs.push({ ...entry, id } as RequestLogEntry)
    if (logs.length > 1000) logs.splice(0, logs.length - 1000)
    writeJson('logs.json', logs)
    return id
  },

  // 增加请求日志（精简版，只存关键字段）
  addRequestLog(entry: { id: string; providerId: string; accountId: string; model: string; success: boolean; duration: number; timestamp: number }): void {
    // 写入 logs.json 以便前端 Logs 页面显示
    const logs = readJson<any[]>('logs.json', [])
    logs.push({
      id: entry.id || randomUUID(),
      timestamp: entry.timestamp,
      level: entry.success ? 'info' : 'error',
      message: `[${entry.model}] ${entry.success ? 'success' : 'error'} ${entry.duration}ms`,
      providerId: entry.providerId,
      accountId: entry.accountId,
      model: entry.model,
      success: entry.success,
      duration: entry.duration,
      status: entry.success ? 'success' : 'error',
    })
    if (logs.length > 1000) logs.splice(0, logs.length - 1000)
    writeJson('logs.json', logs)
    // 更新统计
    const stats = this.getStatistics()
    stats.providerUsage = stats.providerUsage || {}
    stats.accountUsage = stats.accountUsage || {}
    stats.modelUsage = stats.modelUsage || {}
    stats.providerUsage[entry.providerId] = (stats.providerUsage[entry.providerId] || 0) + 1
    stats.accountUsage[entry.accountId] = (stats.accountUsage[entry.accountId] || 0) + 1
    stats.modelUsage[entry.model] = (stats.modelUsage[entry.model] || 0) + 1
    writeJson('statistics.json', stats)
  },

  // 获取会话列表
  getSessions(): any[] {
    return readJson<any[]>('sessions.json', [])
  },
  addSession(session: any): void {
    const sessions = this.getSessions()
    sessions.push(session)
    if (sessions.length > 200) sessions.splice(0, sessions.length - 200)
    writeJson('sessions.json', sessions)
  },
  deleteSession(id: string): boolean {
    const sessions = this.getSessions()
    const filtered = sessions.filter(s => s.id !== id)
    if (filtered.length === sessions.length) return false
    writeJson('sessions.json', filtered)
    return true
  },
  clearSessions(): void {
    writeJson('sessions.json', [])
  },
  getSessionById(id: string): any {
    return this.getSessions().find((s: any) => s.id === id)
  },
  getActiveSessionByProviderAccount(providerId: string, accountId: string): any {
    const now = Date.now()
    const config = this.getSessionConfig()
    const timeout = (config.sessionTimeout || 30) * 60 * 1000
    return this.getSessions().find((s: any) =>
      s.providerId === providerId &&
      s.accountId === accountId &&
      !s.endedAt &&
      (now - (s.lastActiveAt || s.createdAt)) < timeout
    )
  },
  getActiveSessions(): any[] {
    const now = Date.now()
    const config = this.getSessionConfig()
    const timeout = (config.sessionTimeout || 30) * 60 * 1000
    return this.getSessions().filter((s: any) =>
      !s.endedAt && (now - (s.lastActiveAt || s.createdAt)) < timeout
    )
  },
  getSessionsByAccountId(accountId: string): any[] {
    return this.getSessions().filter((s: any) => s.accountId === accountId)
  },
  getSessionsByProviderId(providerId: string): any[] {
    return this.getSessions().filter((s: any) => s.providerId === providerId)
  },
  updateSession(id: string, updates: any): any {
    const sessions = this.getSessions()
    const idx = sessions.findIndex((s: any) => s.id === id)
    if (idx === -1) return null
    sessions[idx] = { ...sessions[idx], ...updates }
    writeJson('sessions.json', sessions)
    return sessions[idx]
  },
  updateProviderSessionId(sessionId: string, providerSessionId: string, parentMessageId?: string): any {
    return this.updateSession(sessionId, {
      providerSessionId,
      ...(parentMessageId ? { parentMessageId } : {}),
      lastActiveAt: Date.now(),
    })
  },
  updateParentMessageId(sessionId: string, parentMessageId: string): any {
    return this.updateSession(sessionId, { parentMessageId, lastActiveAt: Date.now() })
  },
  addMessageToSession(sessionId: string, message: any): any {
    const session = this.getSessionById(sessionId)
    if (!session) return null
    const messages = session.messages || []
    messages.push(message)
    return this.updateSession(sessionId, { messages, lastActiveAt: Date.now() })
  },
  getSessionConfig(): any {
    const config = this.getConfig()
    return config.sessionConfig || { mode: 'multi', sessionTimeout: 30, maxMessagesPerSession: 100, deleteAfterTimeout: true, maxSessionsPerAccount: 5 }
  },
  updateSessionConfig(updates: any): any {
    const config = this.getConfig()
    const newSessionConfig = { ...this.getSessionConfig(), ...updates }
    this.updateConfig({ sessionConfig: newSessionConfig })
    return newSessionConfig
  },
  cleanExpiredSessions(): number {
    const sessions = this.getSessions()
    const config = this.getSessionConfig()
    const now = Date.now()
    const timeout = (config.sessionTimeout || 30) * 60 * 1000
    const active = sessions.filter((s: any) =>
      !s.endedAt && (now - (s.lastActiveAt || s.createdAt)) < timeout
    )
    const removed = sessions.length - active.length
    if (removed > 0) writeJson('sessions.json', active)
    return removed
  },
}

