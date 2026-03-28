/**
 * electronShim.ts
 * Replaces window.electronAPI (Electron IPC) with REST API calls.
 * Stores use window.electronAPI.xxx — this shim maps them 1:1 to /api endpoints.
 */

const BASE = (import.meta as any).env?.VITE_API_URL || ''

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data as T
}

const get = <T>(p: string) => call<T>('GET', p)
const post = <T>(p: string, b?: unknown) => call<T>('POST', p, b)
const put = <T>(p: string, b?: unknown) => call<T>('PUT', p, b)
const del = <T>(p: string) => call<T>('DELETE', p)

const shim = {
  app: {
    getVersion: () => get<{ version: string }>('/api/app/version').then(r => r.version),
    minimize: () => Promise.resolve(),
    maximize: () => Promise.resolve(),
    close: () => Promise.resolve(),
    showWindow: () => Promise.resolve(),
    hideWindow: () => Promise.resolve(),
    openExternal: (url: string) => { window.open(url, '_blank'); return Promise.resolve() },
  },

  config: {
    get: () => get<any>('/api/config'),
    update: (patch: any) => put<any>('/api/config', patch),
    onChange: (_cb: any) => () => {},
  },

  providers: {
    getAll: () => get<any[]>('/api/providers'),
    getBuiltin: () => get<any[]>('/api/providers/builtin'),
    add: (data: any) => post<any>('/api/providers', data),
    update: (id: string, patch: any) => put<any>(`/api/providers/${id}`, patch),
    delete: (id: string) => del<any>(`/api/providers/${id}`),
    checkStatus: (id: string) => post<any>(`/api/providers/${id}/check`),
    checkAllStatus: () => post<any>('/api/providers/check-all'),
    duplicate: (id: string) => post<any>(`/api/providers/${id}/duplicate`),
    export: (id: string) => get<string>(`/api/providers/${id}/export`),
    import: (json: string) => post<any>('/api/providers/import', { json }),
  },

  accounts: {
    getAll: (_includeCredentials?: boolean) => get<any[]>('/api/accounts'),
    getById: (id: string) => get<any>(`/api/accounts/${id}`),
    getByProvider: (providerId: string) => get<any[]>(`/api/accounts?providerId=${providerId}`),
    add: (data: any) => post<any>('/api/accounts', data),
    update: (id: string, patch: any) => put<any>(`/api/accounts/${id}`, patch),
    delete: (id: string) => del<any>(`/api/accounts/${id}`),
    validate: (id: string) => post<any>(`/api/accounts/${id}/validate`),
    validateToken: (data: any) => post<any>('/api/accounts/validate-token', data),
    getCredits: (id: string) => get<any>(`/api/accounts/${id}/credits`),
    clearChats: (id: string) => post<any>(`/api/accounts/${id}/clear-chats`),
  },

  oauth: {
    startLogin: (providerId: string) => post<any>('/api/oauth/start', { providerId }),
    cancelLogin: () => post<any>('/api/oauth/cancel'),
    loginWithToken: (data: any) => post<any>('/api/oauth/token', data),
    validateToken: (data: any) => post<any>('/api/oauth/validate', data),
    refreshToken: (accountId: string) => post<any>('/api/oauth/refresh', { accountId }),
    getStatus: () => get<any>('/api/oauth/status'),
    startInAppLogin: async (providerId: string) => {
      // Step 1: get login info from backend
      const info = await post<{ loginUrl: string; tokenKey: string; instructions: string }>(
        '/api/oauth/in-app-login',
        { providerId }
      )

      // Step 2: open login page in new tab
      window.open(info.loginUrl, '_blank')

      // Step 3: show modal for user to paste token
      return new Promise<any>((resolve, reject) => {
        // Overlay
        const overlay = document.createElement('div')
        overlay.style.cssText = [
          'position:fixed', 'inset:0', 'z-index:99999',
          'background:rgba(0,0,0,0.7)',
          'display:flex', 'align-items:center', 'justify-content:center',
          'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        ].join(';')

        // Card
        const card = document.createElement('div')
        card.style.cssText = [
          'background:#1e1e2e', 'color:#cdd6f4',
          'border-radius:12px', 'padding:28px 32px',
          'width:480px', 'max-width:90vw',
          'box-shadow:0 20px 60px rgba(0,0,0,0.5)',
          'display:flex', 'flex-direction:column', 'gap:16px',
        ].join(';')

        // Title
        const title = document.createElement('h3')
        title.textContent = '请在新标签页登录后，复制 Token 粘贴到此处'
        title.style.cssText = 'margin:0;font-size:16px;font-weight:600;color:#cba6f7;line-height:1.4'

        // Instructions
        const instructions = document.createElement('p')
        instructions.textContent = info.instructions
        instructions.style.cssText = [
          'margin:0', 'font-size:13px', 'line-height:1.6',
          'color:#a6adc8', 'background:#181825',
          'border-radius:8px', 'padding:12px',
          'white-space:pre-wrap',
        ].join(';')

        // Token key hint
        const hint = document.createElement('p')
        hint.textContent = `Token 字段：${info.tokenKey}`
        hint.style.cssText = 'margin:0;font-size:12px;color:#6c7086'

        // Textarea
        const textarea = document.createElement('textarea')
        textarea.placeholder = '在此粘贴 Token...'
        textarea.rows = 4
        textarea.style.cssText = [
          'width:100%', 'box-sizing:border-box',
          'background:#181825', 'color:#cdd6f4',
          'border:1px solid #45475a', 'border-radius:8px',
          'padding:10px 12px', 'font-size:13px',
          'font-family:monospace', 'resize:vertical',
          'outline:none', 'transition:border-color 0.2s',
        ].join(';')
        textarea.addEventListener('focus', () => { textarea.style.borderColor = '#cba6f7' })
        textarea.addEventListener('blur', () => { textarea.style.borderColor = '#45475a' })

        // Buttons row
        const btnRow = document.createElement('div')
        btnRow.style.cssText = 'display:flex;gap:12px;justify-content:flex-end;margin-top:4px'

        const cancelBtn = document.createElement('button')
        cancelBtn.textContent = '取消'
        cancelBtn.style.cssText = [
          'padding:8px 20px', 'border-radius:8px',
          'border:1px solid #45475a', 'background:transparent',
          'color:#cdd6f4', 'font-size:14px', 'cursor:pointer',
          'transition:background 0.15s',
        ].join(';')
        cancelBtn.addEventListener('mouseover', () => { cancelBtn.style.background = '#313244' })
        cancelBtn.addEventListener('mouseout', () => { cancelBtn.style.background = 'transparent' })

        const confirmBtn = document.createElement('button')
        confirmBtn.textContent = '确认'
        confirmBtn.style.cssText = [
          'padding:8px 20px', 'border-radius:8px',
          'border:none', 'background:#cba6f7',
          'color:#1e1e2e', 'font-size:14px',
          'font-weight:600', 'cursor:pointer',
          'transition:opacity 0.15s',
        ].join(';')
        confirmBtn.addEventListener('mouseover', () => { confirmBtn.style.opacity = '0.85' })
        confirmBtn.addEventListener('mouseout', () => { confirmBtn.style.opacity = '1' })

        function cleanup() { document.body.removeChild(overlay) }

        cancelBtn.addEventListener('click', () => {
          cleanup()
          reject(new Error('用户取消登录'))
        })

        confirmBtn.addEventListener('click', async () => {
          const token = textarea.value.trim()
          if (!token) {
            textarea.style.borderColor = '#f38ba8'
            textarea.placeholder = '请先粘贴 Token'
            return
          }
          confirmBtn.textContent = '验证中...'
          confirmBtn.style.opacity = '0.6'
          confirmBtn.setAttribute('disabled', 'true')
          try {
            // Step 4: submit token to backend
            const result = await post<any>('/api/oauth/token', { providerId, token })
            cleanup()
            // Step 5: return OAuthResult format
            resolve({ success: true, credentials: { token: result.credentials?.token ?? token } })
          } catch (err: any) {
            confirmBtn.textContent = '确认'
            confirmBtn.style.opacity = '1'
            confirmBtn.removeAttribute('disabled')
            textarea.style.borderColor = '#f38ba8'
            const errMsg = document.createElement('p')
            errMsg.textContent = `验证失败：${err.message}`
            errMsg.style.cssText = 'margin:0;font-size:12px;color:#f38ba8'
            if (!card.querySelector('.err-msg')) {
              errMsg.className = 'err-msg'
              btnRow.before(errMsg)
            }
          }
        })

        btnRow.append(cancelBtn, confirmBtn)
        card.append(title, instructions, hint, textarea, btnRow)
        overlay.appendChild(card)
        document.body.appendChild(overlay)

        // Close on overlay click (outside card)
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            cleanup()
            reject(new Error('用户取消登录'))
          }
        })
      })
    },
    cancelInAppLogin: () => post<any>('/api/oauth/in-app-login/cancel'),
    onProgress: (_cb: any) => () => {},
    onInAppLoginStatus: (_cb: any) => () => {},
  },

  proxy: {
    start: (port?: number) => post<boolean>('/api/proxy/start', { port }),
    stop: () => post<boolean>('/api/proxy/stop'),
    getStatus: () => get<any>('/api/proxy/status'),
    getStatistics: () => get<any>('/api/proxy/statistics'),
    resetStatistics: () => post<any>('/api/proxy/reset-statistics'),
    onStatusChanged: (_cb: any) => () => {},
  },

  models: {
    getAll: () => get<any>('/api/models').then((r: any) => r.data || []),
  },

  logs: {
    getLogs: (level?: string) => get<any[]>(`/api/logs${level ? '?level=' + level : ''}`),
    clearLogs: () => del<any>('/api/logs'),
  },

  requestLogs: {
    getAll: (limit?: number) => get<any[]>(`/api/logs${limit ? '?limit=' + limit : ''}`),
    getById: (id: string) => get<any>(`/api/logs/${id}`),
    getStats: () => get<any>('/api/logs/stats'),
    getTrend: () => get<any>('/api/logs/trend'),
    getAccountTrend: (accountId: string, days?: number) => get<any>(`/api/logs/account-trend/${accountId}?days=${days || 7}`),
    clear: () => del<any>('/api/logs'),
    onNew: (_cb: any) => () => {},
    onNewLog: (_cb: any) => () => {},
  },

  statistics: {
    get: () => get<any>('/api/proxy/statistics'),
    getToday: () => get<any>('/api/proxy/statistics/today'),
  },

  store: {
    get: (_key: string) => Promise.resolve(undefined),
    set: (_key: string, _val: any) => Promise.resolve(),
    delete: (_key: string) => Promise.resolve(),
    clearAll: () => Promise.resolve(),
  },

  prompts: {
    getAll: () => get<any[]>('/api/prompts'),
    getBuiltin: () => get<any[]>('/api/prompts/builtin'),
    getCustom: () => get<any[]>('/api/prompts/custom'),
    getById: (id: string) => get<any>(`/api/prompts/${id}`),
    add: (data: any) => post<any>('/api/prompts', data),
    update: (id: string, patch: any) => put<any>(`/api/prompts/${id}`, patch),
    delete: (id: string) => del<any>(`/api/prompts/${id}`),
    getByType: (type: string) => get<any[]>(`/api/prompts?type=${type}`),
  },

  session: {
    getConfig: () => get<any>('/api/sessions/config'),
    updateConfig: (cfg: any) => put<any>('/api/sessions/config', cfg),
    getAll: () => get<any[]>('/api/sessions'),
    getActive: () => get<any[]>('/api/sessions/active'),
    getById: (id: string) => get<any>(`/api/sessions/${id}`),
    getByAccount: (id: string) => get<any[]>(`/api/sessions?accountId=${id}`),
    getByProvider: (id: string) => get<any[]>(`/api/sessions?providerId=${id}`),
    delete: (id: string) => del<any>(`/api/sessions/${id}`),
    clearAll: () => del<any>('/api/sessions'),
    cleanExpired: () => post<any>('/api/sessions/clean'),
  },

  managementApi: {
    getConfig: () => get<any>('/api/management/config'),
    updateConfig: (cfg: any) => put<any>('/api/management/config', cfg),
    generateSecret: () => post<string>('/api/management/secret'),
  },

  tray: {
    openDashboard: () => {},
    setHeight: (_h: number) => {},
    quitApp: () => {},
  },

  on: (_channel: string, _cb: any) => () => {},
  send: (_channel: string, ..._args: any[]) => {},
  invoke: async (channel: string, ...args: any[]) => {
    const channelMap: Record<string, () => Promise<any>> = {
      'proxy:getStatistics': () => get<any>('/api/proxy/statistics'),
      'proxy:getStatus': () => get<any>('/api/proxy/status'),
      'proxy:resetStatistics': () => post<any>('/api/proxy/reset-statistics'),
      'config:get': () => get<any>('/api/config'),
      'providers:getAll': () => get<any[]>('/api/providers'),
      'accounts:getAll': () => get<any[]>('/api/accounts'),
      'requestLogs:getStats': () => get<any>('/api/proxy/statistics'),
      'requestLogs:getTrend': () => get<any>('/api/logs/trend'),
      'statistics:get': () => get<any>('/api/proxy/statistics'),
      'statistics:getToday': () => get<any>('/api/proxy/statistics'),
    }
    const handler = channelMap[channel]
    if (handler) return handler()
    console.warn('invoke not implemented for channel:', channel, args)
    return Promise.resolve(null)
  },
}

// Mount on window
;(window as any).electronAPI = shim

export default shim
