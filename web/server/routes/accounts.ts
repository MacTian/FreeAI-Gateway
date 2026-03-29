import { Router } from 'express'
import { store } from '../store.js'

export const accountsRouter = Router()

// POST /accounts/validate-token — 必须在 /:id 之前注册
accountsRouter.post('/accounts/validate-token', (_req, res) => {
  res.json({ valid: true })
})

// 解析 JWT token 的过期时间（不验证签名，仅读取 payload）
function parseTokenExpiry(credentials: any): number | null {
  try {
    const token = credentials?.refresh_token || credentials?.token || credentials?.apiKey || ''
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    // exp 是 Unix 秒时间戳
    return payload.exp ? payload.exp * 1000 : null
  } catch { return null }
}

// GET /accounts?providerId=xxx
accountsRouter.get('/accounts', (req, res) => {
  try {
    const { providerId } = req.query
    let accounts = store.getAccounts()
    if (providerId) accounts = accounts.filter((a: any) => a.providerId === providerId)
    // 注入 tokenExpiry 字段（毫秒时间戳）
    accounts = accounts.map((a: any) => ({
      ...a,
      tokenExpiry: parseTokenExpiry(a.credentials)
    }))
    res.json(accounts)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

accountsRouter.get('/accounts/:id', (req, res) => {
  try {
    const found = store.getAccounts().find(a => a.id === req.params.id)
    if (!found) return res.status(404).json({ error: 'Not found' })
    res.json(found)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

accountsRouter.post('/accounts', (req, res) => {
  try { res.status(201).json(store.addAccount(req.body)) } catch (e: any) { res.status(500).json({ error: e.message }) }
})

accountsRouter.put('/accounts/:id', async (req, res) => {
  try {
    const updated = store.updateAccount(req.params.id, req.body)
    if (!updated) return res.status(404).json({ error: 'Not found' })
    // 如果更新了 credentials，自动触发一次真实验证
    if (req.body.credentials) {
      try {
        const { forwardRequest } = await import('../proxy/forwarder.js')
        const provider = store.getProviders().find(p => p.id === updated.providerId)
        if (provider) {
          await forwardRequest(
            { model: 'test', messages: [{ role: 'user', content: 'hi' }], stream: false },
            {} as any,
            provider,
            updated
          )
          store.updateAccount(req.params.id, { status: 'active', errorMessage: '' })
        }
      } catch (validateErr: any) {
        store.updateAccount(req.params.id, { status: 'error', errorMessage: validateErr.message })
      }
      return res.json(store.getAccounts().find(a => a.id === req.params.id))
    }
    res.json(updated)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

accountsRouter.delete('/accounts/:id', (req, res) => {
  try {
    const ok = store.deleteAccount(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /accounts/:id/validate
accountsRouter.post('/accounts/:id/validate', (req, res) => {
  try {
    const account = store.getAccounts().find(a => a.id === req.params.id)
    if (!account) return res.status(404).json({ error: 'Not found' })
    res.json({ valid: true, accountId: req.params.id })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// GET /accounts/:id/credits
accountsRouter.get('/accounts/:id/credits', (req, res) => {
  try {
    const account = store.getAccounts().find(a => a.id === req.params.id)
    if (!account) return res.status(404).json({ error: 'Not found' })
    res.json({ credits: null, unlimited: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// POST /accounts/:id/clear-chats
accountsRouter.post('/accounts/:id/clear-chats', (req, res) => {
  try {
    const account = store.getAccounts().find(a => a.id === req.params.id)
    if (!account) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})
